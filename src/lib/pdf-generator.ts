/**
 * Finora PDF generator
 * =====================
 * Generates professional PDFs for: invoices, quotes, purchase orders, delivery notes,
 * generic finance reports, and free-text analyses (Finora AI).
 */
import path from "path";
import fs from "fs";
import type { CompanySettings, Tenant } from "@prisma/client";

const AFM_CACHE = new Map<string, Buffer>();
const AFM_CACHE_STR = new Map<string, string>();

function candidatePdfkitDataDirs(): string[] {
  const cwd = process.cwd();
  return [
    path.join(cwd, "node_modules", "pdfkit", "js", "data"),
    path.join(cwd, "node_modules", "pdfkit", "data"),
    path.join(cwd, ".next", "standalone", "node_modules", "pdfkit", "js", "data"),
    path.join(cwd, ".next", "standalone", "node_modules", "pdfkit", "data"),
    path.join(cwd, "..", "node_modules", "pdfkit", "js", "data"),
    path.join(cwd, "..", "node_modules", "pdfkit", "data"),
  ];
}

function preloadAfmFiles() {
  if (AFM_CACHE.size > 0) return;
  for (const dir of candidatePdfkitDataDirs()) {
    try {
      if (!fs.existsSync(dir)) continue;
      for (const entry of fs.readdirSync(dir)) {
        if (entry.endsWith(".afm") && !AFM_CACHE.has(entry)) {
          try {
            const buf = fs.readFileSync(path.join(dir, entry));
            AFM_CACHE.set(entry, buf);
            AFM_CACHE_STR.set(entry, buf.toString("utf8"));
          } catch {}
        }
      }
    } catch {}
  }
}

let _patched = false;
function patchFsReadFileSync() {
  if (_patched) return;
  _patched = true;
  preloadAfmFiles();
  const origReadFileSync = fs.readFileSync.bind(fs);
  (fs as any).readFileSync = function (p: any, ...args: any[]) {
    let filename: string | null = null;
    if (typeof p === "string") filename = path.basename(p);
    try {
      return origReadFileSync(p, ...args);
    } catch (e: any) {
      if (filename && filename.endsWith(".afm")) {
        const encoding = typeof args[0] === "string" ? args[0] : (typeof args[1] === "string" ? args[1] : null);
        if (encoding && AFM_CACHE_STR.has(filename)) return AFM_CACHE_STR.get(filename);
        if (AFM_CACHE.has(filename)) return AFM_CACHE.get(filename);
      }
      throw e;
    }
  };
}

let PDFDocument: any = null;
async function loadPdfKit() {
  if (PDFDocument) return PDFDocument;
  preloadAfmFiles();
  patchFsReadFileSync();
  const mod = await import("pdfkit");
  PDFDocument = mod.default || mod;
  return PDFDocument;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers communs
// ─────────────────────────────────────────────────────────────────────────────
const FONT_REG = "Helvetica";
const FONT_BOLD = "Helvetica-Bold";
const FONT_OBL = "Helvetica-Oblique";

const COLORS = {
  primary: "#0d5d4a",
  primaryLight: "#e8f3ef",
  text: "#1a2820",
  muted: "#5a6b62",
  border: "#d4e0da",
  altRow: "#f5f9f7",
};

// A4 = 595.28 x 841.89 pt. Avec margin:40, la zone utile va de y=40 à y=801.89.
// On garde une marge de sécurité pour ne JAMAIS positionner du texte à un endroit
// qui forcerait pdfkit à créer une page suivante pour terminer l'affichage —
// c'est exactement ce qui causait les pages vides en fin de document.
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const CONTENT_BOTTOM = 780; // dernière position Y sûre pour commencer à écrire du texte
const FOOTER_HEIGHT = 42;

function money(n: number | any): string {
  const v = typeof n === "number" ? n : Number(n ?? 0);
  const formatted = new Intl.NumberFormat("fr-SN", { maximumFractionDigits: 0 }).format(Math.round(v));
  return formatted.replace(/[\u202F\u00A0]/g, " ") + " FCFA";
}

function dateFmt(d: Date | string | any): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("fr-SN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(d));
}

/** Si y dépasse la zone sûre, ajoute une nouvelle page et renvoie le nouveau y de départ. */
function ensureSpace(doc: any, y: number, needed = 24): number {
  if (y + needed > CONTENT_BOTTOM) {
    doc.addPage();
    return 40;
  }
  return y;
}

/** Dessine le bandeau footer tout en bas de la page. PDFKit ajoute automatiquement
 * une nouvelle page dès qu'un texte est écrit au-delà de (hauteur de page - marge
 * du bas), même avec des coordonnées x/y explicites — c'est exactement ce qui
 * causait les pages vides. On neutralise donc temporairement la marge du bas
 * pendant l'écriture du footer, puis on la restaure. */
function drawFooter(doc: any, tenant: Tenant, settings: CompanySettings | null) {
  const originalBottomMargin = doc.page.margins.bottom;
  doc.page.margins.bottom = 0; // autorise l'écriture jusqu'au bord réel de la page

  const footerY = PAGE_HEIGHT - FOOTER_HEIGHT;
  const footerText = settings?.footerNote
    || `${settings?.legalName || tenant.name}${settings?.rc ? "  •  RC " + settings.rc : ""}${settings?.ninea ? "  •  NINEA " + settings.ninea : ""}`;
  doc.rect(0, footerY, PAGE_WIDTH, FOOTER_HEIGHT).fill(COLORS.primaryLight);
  doc.font(FONT_OBL).fontSize(7.5).fillColor(COLORS.muted);
  doc.text(footerText, 40, footerY + 7, { width: 515, align: "center", lineBreak: false, ellipsis: true });
  doc.text(
    `Document généré par Finora ERP le ${new Intl.DateTimeFormat("fr-SN", { dateStyle: "long", timeStyle: "short" }).format(new Date())}`,
    40, footerY + 20, { width: 515, align: "center", lineBreak: false, ellipsis: true }
  );

  doc.page.margins.bottom = originalBottomMargin; // restaure pour le contenu de la page suivante
}

// ─────────────────────────────────────────────────────────────────────────────
// FACTURE / DEVIS / BON DE COMMANDE / BON DE LIVRAISON
// ─────────────────────────────────────────────────────────────────────────────
interface DocParty {
  name: string;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  taxId?: string | null;
}

interface DocLine {
  name: string;
  description?: string | null;
  qty: number;
  unitPrice?: number | null;
  taxRate?: number | null;
  lineTotal: number;
}

interface PdfDocInput {
  tenant: Tenant;
  settings: CompanySettings | null;
  documentType: "FACTURE" | "DEVIS" | "BON_COMMANDE" | "BON_LIVRAISON";
  documentNumber: string;
  documentDate: Date | string;
  dueDate?: Date | string | null;
  validUntil?: Date | string | null;
  expectedDate?: Date | string | null;
  party: DocParty;
  lines: DocLine[];
  subtotal: number;
  taxTotal: number;
  total: number;
  notes?: string | null;
  receivedBy?: string | null;
  status?: string;
}

export async function generatePdfDoc(input: PdfDocInput): Promise<Buffer> {
  const Doc = await loadPdfKit();

  return new Promise((resolve, reject) => {
    try {
      const doc = new Doc({ size: "A4", margin: 40, bufferPages: true, autoFirstPage: true });
      const chunks: Buffer[] = [];
      doc.on("data", (c: any) => chunks.push(c as Buffer));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // ── Header ────────────────────────────────────────────────────
      if (input.settings?.logo) {
        try {
          const dataMatch = input.settings.logo.match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
          if (dataMatch) {
            const buf = Buffer.from(dataMatch[2], "base64");
            doc.image(buf, 40, 40, { fit: [148, 90] });
          }
        } catch {}
      }

      const companyName = input.settings?.legalName || input.tenant.name;
      doc.font(FONT_BOLD).fontSize(15).fillColor(COLORS.text).text(companyName, 195, 45, { width: 360, lineBreak: false, ellipsis: true });
      doc.font(FONT_REG).fontSize(8.5).fillColor(COLORS.muted);
      let infoY = 63;
      const infoLines: string[] = [];
      if (input.settings?.legalForm) infoLines.push(`Forme: ${input.settings.legalForm}`);
      if (input.settings?.address) infoLines.push(input.settings.address);
      const cityLine = [input.settings?.city, input.settings?.postalCode].filter(Boolean).join(" — ");
      if (cityLine) infoLines.push(cityLine);
      if (input.settings?.country) infoLines.push(input.settings.country);
      if (input.settings?.phone) infoLines.push(`Tél: ${input.settings.phone}`);
      if (input.settings?.email) infoLines.push(`Email: ${input.settings.email}`);
      const legalBits: string[] = [];
      if (input.settings?.rc) legalBits.push(`RC: ${input.settings.rc}`);
      if (input.settings?.ninea) legalBits.push(`NINEA: ${input.settings.ninea}`);
      if (input.settings?.nCompte) legalBits.push(`N° compte: ${input.settings.nCompte}`);
      if (input.settings?.capital) legalBits.push(`Capital: ${money(Number(input.settings.capital))}`);
      if (legalBits.length) infoLines.push(legalBits.join("  •  "));
      for (const line of infoLines.slice(0, 6)) {
        doc.text(line, 195, infoY, { width: 360, lineBreak: false, ellipsis: true });
        infoY += 11;
      }

      const titleMap = {
        FACTURE: "FACTURE",
        DEVIS: "DEVIS",
        BON_COMMANDE: "BON DE COMMANDE",
        BON_LIVRAISON: "BON DE LIVRAISON",
      };
      const titleFontSize = input.documentType === "BON_COMMANDE" || input.documentType === "BON_LIVRAISON" ? 14 : 20;
      doc.font(FONT_BOLD).fontSize(titleFontSize).fillColor(COLORS.primary);
      doc.text(titleMap[input.documentType], 355, 130, { width: 200, align: "right", lineBreak: false });

      doc.font(FONT_REG).fontSize(9.5).fillColor(COLORS.text);
      doc.text(`N° ${input.documentNumber}`, 380, 158, { width: 175, align: "right" });
      doc.text(`Date: ${dateFmt(input.documentDate)}`, 380, 171, { width: 175, align: "right" });

      let rightY = 184;
      if (input.dueDate) { doc.text(`Échéance: ${dateFmt(input.dueDate)}`, 380, rightY, { width: 175, align: "right" }); rightY += 13; }
      if (input.validUntil) { doc.text(`Valide jusqu'au: ${dateFmt(input.validUntil)}`, 380, rightY, { width: 175, align: "right" }); rightY += 13; }
      if (input.expectedDate) { doc.text(`Livraison prévue: ${dateFmt(input.expectedDate)}`, 380, rightY, { width: 175, align: "right" }); rightY += 13; }

      const partyLabel = input.documentType === "BON_COMMANDE" ? "FOURNISSEUR" : "CLIENT";
      doc.font(FONT_BOLD).fontSize(8.5).fillColor(COLORS.primary);
      doc.text(partyLabel, 40, 218, { width: 250 });
      doc.font(FONT_BOLD).fontSize(10.5).fillColor(COLORS.text);
      doc.text(input.party.name, 40, 231, { width: 250, lineBreak: false, ellipsis: true });

      doc.font(FONT_REG).fontSize(8.5).fillColor(COLORS.muted);
      let partyY = 248;
      if (input.party.address) { doc.text(input.party.address, 40, partyY, { width: 250 }); partyY += 11; }
      const pCity = [input.party.city, input.party.country].filter(Boolean).join(", ");
      if (pCity) { doc.text(pCity, 40, partyY, { width: 250 }); partyY += 11; }
      if (input.party.phone) { doc.text(`Tél: ${input.party.phone}`, 40, partyY, { width: 250 }); partyY += 11; }
      if (input.party.email) { doc.text(input.party.email, 40, partyY, { width: 250 }); partyY += 11; }
      if (input.party.taxId) { doc.text(`N° fiscal: ${input.party.taxId}`, 40, partyY, { width: 250 }); partyY += 11; }

      // ── Tableau des lignes (paginé automatiquement si besoin) ────────
      const tableTop = 300;
      const colX = { ref: 40, name: 105, qty: 302, price: 377, tax: 442, total: 498 };
      const colW = { ref: 65, name: 197, qty: 75, price: 65, tax: 56, total: 67 };

      function drawTableHeader(y: number) {
        doc.rect(40, y, 525, 20).fill(COLORS.primary);
        doc.font(FONT_BOLD).fontSize(8).fillColor("#ffffff");
        doc.text("RÉF.", colX.ref + 4, y + 6, { width: colW.ref - 8 });
        doc.text("DÉSIGNATION", colX.name + 4, y + 6, { width: colW.name - 8 });
        doc.text("QTÉ", colX.qty + 4, y + 6, { width: colW.qty - 8, align: "right" });
        if (input.documentType !== "BON_LIVRAISON") {
          doc.text("P.U. HT", colX.price + 4, y + 6, { width: colW.price - 8, align: "right" });
          doc.text("TVA", colX.tax + 4, y + 6, { width: colW.tax - 8, align: "right" });
        }
        doc.text("TOTAL", colX.total + 4, y + 6, { width: colW.total - 8, align: "right" });
        return y + 20;
      }

      let rowY = drawTableHeader(tableTop);
      let tableStartY = tableTop;
      doc.font(FONT_REG).fontSize(8.5).fillColor(COLORS.text);
      input.lines.forEach((line, idx) => {
        const rowH = 22;
        if (rowY + rowH > CONTENT_BOTTOM) {
          doc.rect(40, tableStartY, 525, rowY - tableStartY).lineWidth(0.5).strokeColor(COLORS.border).stroke();
          doc.addPage();
          rowY = drawTableHeader(40);
          tableStartY = 40;
          doc.font(FONT_REG).fontSize(8.5).fillColor(COLORS.text);
        }
        if (idx % 2 === 1) {
          doc.rect(40, rowY, 525, rowH).fill(COLORS.altRow);
          doc.fillColor(COLORS.text);
        }
        const sku = (line as any).sku || line.name?.slice(0, 10) || "—";
        doc.font(FONT_BOLD).fontSize(8.5).text(sku, colX.ref + 4, rowY + 4, { width: colW.ref - 8, lineBreak: false, ellipsis: true });
        doc.font(FONT_REG).fontSize(8.5).text(line.name, colX.name + 4, rowY + 4, { width: colW.name - 8, lineBreak: false, ellipsis: true });
        if (line.description) {
          doc.font(FONT_OBL).fontSize(7).fillColor(COLORS.muted).text(line.description, colX.name + 4, rowY + 13, { width: colW.name - 8, lineBreak: false, ellipsis: true });
          doc.font(FONT_REG).fontSize(8.5).fillColor(COLORS.text);
        }
        doc.text(String(line.qty), colX.qty + 4, rowY + 4, { width: colW.qty - 8, align: "right" });
        if (input.documentType !== "BON_LIVRAISON") {
          doc.text(money(line.unitPrice ?? 0), colX.price + 4, rowY + 4, { width: colW.price - 8, align: "right", lineBreak: false, ellipsis: true });
          doc.text(`${line.taxRate ?? 0}%`, colX.tax + 4, rowY + 4, { width: colW.tax - 8, align: "right" });
        }
        doc.font(FONT_BOLD).text(input.documentType === "BON_LIVRAISON" ? "" : money(line.lineTotal), colX.total + 4, rowY + 4, { width: colW.total - 8, align: "right", lineBreak: false, ellipsis: true });
        rowY += rowH;
      });
      doc.rect(40, tableStartY, 525, rowY - tableStartY).lineWidth(0.5).strokeColor(COLORS.border).stroke();

      // ── Totaux ────────────────────────────────────────────────────
      if (input.documentType !== "BON_LIVRAISON") {
        rowY = ensureSpace(doc, rowY, 100);
        const totalsY = rowY + 16;
        const totalsX = 360;
        doc.font(FONT_REG).fontSize(9.5).fillColor(COLORS.muted);
        doc.text("Sous-total HT", totalsX, totalsY, { width: 130, align: "left" });
        doc.text(money(input.subtotal), 460, totalsY, { width: 100, align: "right", lineBreak: false, ellipsis: true });
        doc.text("TVA", totalsX, totalsY + 16, { width: 130, align: "left" });
        doc.text(money(input.taxTotal), 460, totalsY + 16, { width: 100, align: "right", lineBreak: false, ellipsis: true });
        doc.rect(totalsX, totalsY + 34, 200, 24).fill(COLORS.primary);
        doc.font(FONT_BOLD).fontSize(11).fillColor("#ffffff");
        doc.text("TOTAL TTC", totalsX + 8, totalsY + 41, { width: 130, align: "left" });
        doc.text(money(input.total), 460, totalsY + 41, { width: 100, align: "right", lineBreak: false, ellipsis: true });
        rowY = totalsY + 62;
      }

      // ── Notes ─────────────────────────────────────────────────────
      if (input.notes) {
        rowY = ensureSpace(doc, rowY, 50);
        doc.font(FONT_BOLD).fontSize(8.5).fillColor(COLORS.primary);
        doc.text("NOTES", 40, rowY + 16, { width: 525 });
        doc.font(FONT_REG).fontSize(8.5).fillColor(COLORS.text);
        doc.text(input.notes, 40, rowY + 29, { width: 525, height: 40, ellipsis: true });
        rowY += 50;
      }

      // ── Coordonnées bancaires ─────────────────────────────────────
      if ((input.documentType === "FACTURE" || input.documentType === "DEVIS") && (input.settings?.bankName || input.settings?.bankIban)) {
        rowY = ensureSpace(doc, rowY, 55);
        doc.font(FONT_BOLD).fontSize(8.5).fillColor(COLORS.primary);
        doc.text("COORDONNÉES BANCAIRES", 40, rowY + 14, { width: 250 });
        doc.font(FONT_REG).fontSize(8.5).fillColor(COLORS.muted);
        let bY = rowY + 27;
        if (input.settings?.bankName) { doc.text(`Banque: ${input.settings.bankName}`, 40, bY, { width: 250, lineBreak: false, ellipsis: true }); bY += 11; }
        if (input.settings?.bankIban) { doc.text(`IBAN: ${input.settings.bankIban}`, 40, bY, { width: 250, lineBreak: false, ellipsis: true }); bY += 11; }
        if (input.settings?.bankBic) { doc.text(`BIC/SWIFT: ${input.settings.bankBic}`, 40, bY, { width: 250, lineBreak: false, ellipsis: true }); bY += 11; }
        rowY = bY + 8;
      }

      // ── Signature ─────────────────────────────────────────────────
      rowY = ensureSpace(doc, rowY, 95);
      const sigY = rowY + 14;
      doc.font(FONT_BOLD).fontSize(8.5).fillColor(COLORS.primary);
      doc.text("POUR ACCORD", 40, sigY, { width: 200 });
      doc.text("LE CLIENT (nom, date, tampon)", 320, sigY, { width: 200 });
      if (input.settings?.signature) {
        try {
          const sigMatch = input.settings.signature.match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
          if (sigMatch) {
            const sigBuf = Buffer.from(sigMatch[2], "base64");
            doc.image(sigBuf, 40, sigY + 13, { fit: [130, 55] });
          }
        } catch {}
      }
      doc.font(FONT_OBL).fontSize(7.5).fillColor(COLORS.muted);
      doc.text(input.settings?.legalName || input.tenant.name, 40, sigY + 72, { width: 200, lineBreak: false, ellipsis: true });
      if (input.receivedBy) {
        doc.font(FONT_BOLD).fontSize(8.5).fillColor(COLORS.primary);
        doc.text(`Réceptionné par: ${input.receivedBy}`, 320, sigY + 74, { width: 200, lineBreak: false, ellipsis: true });
      }

      // ── Footer sur chaque page réellement utilisée ───────────────
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(i);
        drawFooter(doc, input.tenant, input.settings);
      }

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// RAPPORT GÉNÉRIQUE (tableau) — journal, balance, caisse, trésorerie...
// ─────────────────────────────────────────────────────────────────────────────
export interface ReportColumn {
  key: string;
  label: string;
  align?: "left" | "right";
  width: number;
  format?: (v: any, row: any) => string;
}

export interface ReportPdfInput {
  tenant: Tenant;
  settings: CompanySettings | null;
  title: string;
  subtitle?: string;
  columns: ReportColumn[];
  rows: any[];
  totalsRow?: Record<string, string>;
  generatedAt?: Date;
}

export async function generateReportPdfDoc(input: ReportPdfInput): Promise<Buffer> {
  const Doc = await loadPdfKit();

  return new Promise((resolve, reject) => {
    try {
      const doc = new Doc({ size: "A4", margin: 40, bufferPages: true, autoFirstPage: true });
      const chunks: Buffer[] = [];
      doc.on("data", (c: any) => chunks.push(c as Buffer));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      if (input.settings?.logo) {
        try {
          const dataMatch = input.settings.logo.match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
          if (dataMatch) {
            const buf = Buffer.from(dataMatch[2], "base64");
            doc.image(buf, 40, 40, { fit: [85, 52] });
          }
        } catch {}
      }
      const companyName = input.settings?.legalName || input.tenant.name;
      doc.font(FONT_BOLD).fontSize(12).fillColor(COLORS.text).text(companyName, 135, 44, { width: 300, lineBreak: false, ellipsis: true });
      doc.font(FONT_REG).fontSize(8).fillColor(COLORS.muted).text(input.tenant.currency, 135, 60, { width: 300 });

      doc.font(FONT_BOLD).fontSize(16).fillColor(COLORS.primary).text(input.title, 40, 105, { width: 515 });
      if (input.subtitle) {
        doc.font(FONT_REG).fontSize(9.5).fillColor(COLORS.muted).text(input.subtitle, 40, 128, { width: 515 });
      }
      doc.font(FONT_OBL).fontSize(7.5).fillColor(COLORS.muted).text(
        `Généré le ${dateFmt(input.generatedAt || new Date())}`, 40, 145, { width: 515 }
      );

      const tableTop = 172;
      let colX = 40;
      const colPositions: Record<string, { x: number; w: number }> = {};
      for (const col of input.columns) {
        colPositions[col.key] = { x: colX, w: col.width };
        colX += col.width;
      }

      function drawHeader(y: number) {
        doc.rect(40, y, 525, 18).fill(COLORS.primary);
        doc.font(FONT_BOLD).fontSize(7.5).fillColor("#ffffff");
        for (const col of input.columns) {
          const p = colPositions[col.key];
          doc.text(col.label.toUpperCase(), p.x + 4, y + 5, { width: p.w - 8, align: col.align || "left", lineBreak: false, ellipsis: true });
        }
        return y + 18;
      }

      let rowY = drawHeader(tableTop);
      let tableStartY = tableTop;
      doc.font(FONT_REG).fontSize(7.5).fillColor(COLORS.text);
      input.rows.forEach((row, idx) => {
        const rowH = 18;
        if (rowY + rowH > CONTENT_BOTTOM) {
          doc.rect(40, tableStartY, 525, rowY - tableStartY).lineWidth(0.5).strokeColor(COLORS.border).stroke();
          doc.addPage();
          rowY = drawHeader(40);
          tableStartY = 40;
          doc.font(FONT_REG).fontSize(7.5).fillColor(COLORS.text);
        }
        if (idx % 2 === 1) {
          doc.rect(40, rowY, 525, rowH).fill(COLORS.altRow);
          doc.fillColor(COLORS.text);
        }
        for (const col of input.columns) {
          const p = colPositions[col.key];
          const raw = row[col.key];
          const text = col.format ? col.format(raw, row) : String(raw ?? "—");
          doc.text(text, p.x + 4, rowY + 4, { width: p.w - 8, align: col.align || "left", lineBreak: false, ellipsis: true });
        }
        rowY += rowH;
      });
      doc.rect(40, tableStartY, 525, rowY - tableStartY).lineWidth(0.5).strokeColor(COLORS.border).stroke();

      if (input.totalsRow) {
        rowY = ensureSpace(doc, rowY, 22);
        doc.rect(40, rowY, 525, 20).fill(COLORS.primary);
        doc.font(FONT_BOLD).fontSize(7.5).fillColor("#ffffff");
        for (const col of input.columns) {
          const p = colPositions[col.key];
          const text = input.totalsRow[col.key] ?? "";
          doc.text(text, p.x + 4, rowY + 5, { width: p.w - 8, align: col.align || "left", lineBreak: false, ellipsis: true });
        }
        rowY += 20;
      }

      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(i);
        drawFooter(doc, input.tenant, input.settings);
      }

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// TEXTE LIBRE — analyses / conseils Finora AI
// ─────────────────────────────────────────────────────────────────────────────
export interface TextPdfInput {
  tenant: Tenant;
  settings: CompanySettings | null;
  title: string;
  content: string;
  generatedAt?: Date;
}

export async function generateTextPdfDoc(input: TextPdfInput): Promise<Buffer> {
  const Doc = await loadPdfKit();

  return new Promise((resolve, reject) => {
    try {
      const doc = new Doc({ size: "A4", margin: 50, bufferPages: true, autoFirstPage: true });
      const chunks: Buffer[] = [];
      doc.on("data", (c: any) => chunks.push(c as Buffer));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      if (input.settings?.logo) {
        try {
          const dataMatch = input.settings.logo.match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
          if (dataMatch) {
            const buf = Buffer.from(dataMatch[2], "base64");
            doc.image(buf, 50, 40, { fit: [80, 50] });
          }
        } catch {}
      }

      doc.font(FONT_BOLD).fontSize(10).fillColor(COLORS.text).text(
        input.settings?.legalName || input.tenant.name, 140, 44, { width: 300, lineBreak: false, ellipsis: true }
      );
      doc.font(FONT_OBL).fontSize(8).fillColor(COLORS.muted).text(
        `Généré le ${dateFmt(input.generatedAt || new Date())}`, 140, 58, { width: 300 }
      );

      doc.moveDown(3);
      doc.font(FONT_BOLD).fontSize(16).fillColor(COLORS.primary).text(input.title, { width: 495 });
      doc.moveDown(1);

      doc.font(FONT_REG).fontSize(10).fillColor(COLORS.text).text(input.content, {
        width: 495,
        align: "justify",
        lineGap: 3,
      });

      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(i);
        drawFooter(doc, input.tenant, input.settings);
      }

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}