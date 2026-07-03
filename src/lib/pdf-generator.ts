/**
 * Finora PDF generator
 * =====================
 * Generates professional PDFs for: invoices, quotes, purchase orders, delivery notes.
 * Each document embeds the tenant's company settings (logo, address, RC, NINEA, signature).
 */
import path from "path";
import fs from "fs";
import type { CompanySettings, Tenant } from "@prisma/client";

// pdfkit resolves its built-in font metrics (Helvetica.afm etc.) via
// path.join(__dirname, 'data', ...). When bundled by Next.js Turbopack,
// __dirname may resolve to a virtual path that doesn't exist on disk.
// Workaround: pre-load all AFM files into a Map keyed by filename, then
// patch fs.readFileSync to redirect pdfkit's reads to our in-memory copies.

// require.resolve('pdfkit') → '/home/z/.../pdfkit/js/pdfkit.js'
// dirname = '/home/z/.../pdfkit/js'
// data dir = dirname + '/data' = '/home/z/.../pdfkit/js/data'
const PDFKIT_ROOT = path.dirname(require.resolve("pdfkit"));
const PDFKIT_DATA_DIR = path.join(PDFKIT_ROOT, "data");
const PDFKIT_DATA_DIR_ALT = path.join(PDFKIT_ROOT, "js", "data");

const AFM_CACHE = new Map<string, Buffer>();
const AFM_CACHE_STR = new Map<string, string>();
function preloadAfmFiles() {
  if (AFM_CACHE.size > 0) return;
  for (const dir of [PDFKIT_DATA_DIR, PDFKIT_DATA_DIR_ALT]) {
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir)) {
      if (entry.endsWith(".afm")) {
        if (!AFM_CACHE.has(entry)) {
          try {
            const buf = fs.readFileSync(path.join(dir, entry));
            AFM_CACHE.set(entry, buf);
            AFM_CACHE_STR.set(entry, buf.toString("utf8"));
          } catch {}
        }
      }
    }
  }
}

let _patched = false;
function patchFsReadFileSync() {
  if (_patched) return;
  _patched = true;
  preloadAfmFiles();
  const origReadFileSync = fs.readFileSync.bind(fs);
  (fs as any).readFileSync = function (p: any, ...args: any[]) {
    try {
      return origReadFileSync(p, ...args);
    } catch (e: any) {
      if (typeof p === "string" && p.endsWith(".afm")) {
        const filename = path.basename(p);
        const encoding = typeof args[0] === "string" ? args[0] : (typeof args[1] === "string" ? args[1] : null);
        if (encoding && AFM_CACHE_STR.has(filename)) return AFM_CACHE_STR.get(filename);
        if (AFM_CACHE.has(filename)) return AFM_CACHE.get(filename);
      }
      throw e;
    }
  };
}

let PDFDocument: any = null;
let _pdfkitPatched = false;
async function loadPdfKit() {
  if (PDFDocument) return PDFDocument;
  preloadAfmFiles();

  // Patch fs.readFileSync BEFORE importing pdfkit so when pdfkit's module-level
  // code runs, it sees our patched version.
  if (!_patched) {
    _patched = true;
    const origReadFileSync = fs.readFileSync.bind(fs);
    (fs as any).readFileSync = function (p: any, ...args: any[]) {
      try {
        return origReadFileSync(p, ...args);
      } catch (e: any) {
        if (typeof p === "string" && p.endsWith(".afm")) {
          const filename = path.basename(p);
          const encoding = typeof args[0] === "string" ? args[0] : (typeof args[1] === "string" ? args[1] : null);
          if (encoding && AFM_CACHE_STR.has(filename)) return AFM_CACHE_STR.get(filename);
          if (AFM_CACHE.has(filename)) return AFM_CACHE.get(filename);
        }
        throw e;
      }
    };
  }

  const mod = await import("pdfkit");
  PDFDocument = mod.default || mod;

  // Even after import, pdfkit may have cached __dirname at module load.
  // Try to also patch any internal font cache if available.
  if (!_pdfkitPatched) {
    _pdfkitPatched = true;
    try {
      // Some pdfkit versions expose a fontData registry
      const anyMod = mod as any;
      if (anyMod.StandardFonts && typeof anyMod.StandardFonts === "object") {
        // already loaded
      }
    } catch {}
  }
  return PDFDocument;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
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

function money(n: number | any): string {
  const v = typeof n === "number" ? n : Number(n ?? 0);
  return new Intl.NumberFormat("fr-SN", { maximumFractionDigits: 0 }).format(Math.round(v)) + " FCFA";
}

function dateFmt(d: Date | string | any): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("fr-SN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(d));
}

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
  // Ensure pdfkit's data dir is reachable — change cwd temporarily if needed
  const pdfkitDataDir = path.join(path.dirname(require.resolve("pdfkit")), "data");
  if (!fs.existsSync(pdfkitDataDir)) {
    // js/data layout
    const altDir = path.join(path.dirname(require.resolve("pdfkit")), "js", "data");
    if (fs.existsSync(altDir)) {
      // Monkey-patch fs.readFileSync to redirect /ROOT/node_modules/pdfkit/js/data/* → altDir
      const origRead = fs.readFileSync;
      (fs as any).readFileSync = function (p: any, ...args: any[]) {
        if (typeof p === "string" && p.includes("pdfkit/js/data/")) {
          const filename = path.basename(p);
          const redirected = path.join(altDir, filename);
          if (fs.existsSync(redirected)) return origRead(redirected, ...args);
        }
        return origRead(p, ...args);
      };
    }
  }

  return new Promise((resolve, reject) => {
    try {
      const doc = new Doc({ size: "A4", margin: 40, bufferPages: true });
      const chunks: Buffer[] = [];
      doc.on("data", (c: any) => chunks.push(c as Buffer));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // ── Header: logo + company block ────────────────────────────────
      let logoY = 40;
      if (input.settings?.logo) {
        try {
          const dataMatch = input.settings.logo.match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
          if (dataMatch) {
            const buf = Buffer.from(dataMatch[2], "base64");
            doc.image(buf, 40, 40, { fit: [120, 70] });
            logoY = 120;
          }
        } catch (e) { /* ignore invalid logo */ }
      }

      // Company name + legal info
      const companyName = input.settings?.legalName || input.tenant.name;
      doc.font(FONT_BOLD).fontSize(16).fillColor(COLORS.text).text(companyName, 180, 45, { width: 380 });
      doc.font(FONT_REG).fontSize(9).fillColor(COLORS.muted);
      let infoY = 65;
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

      for (const line of infoLines) {
        doc.text(line, 180, infoY, { width: 380 });
        infoY += 12;
      }

      // ── Document title block (right side) ───────────────────────────
      const titleMap = {
        FACTURE: "FACTURE",
        DEVIS: "DEVIS",
        BON_COMMANDE: "BON DE COMMANDE",
        BON_LIVRAISON: "BON DE LIVRAISON",
      };
      doc.font(FONT_BOLD).fontSize(22).fillColor(COLORS.primary);
      doc.text(titleMap[input.documentType], 380, 130, { width: 180, align: "right" });

      doc.font(FONT_REG).fontSize(10).fillColor(COLORS.text);
      doc.text(`N° ${input.documentNumber}`, 380, 160, { width: 180, align: "right" });
      doc.text(`Date: ${dateFmt(input.documentDate)}`, 380, 174, { width: 180, align: "right" });

      let rightY = 188;
      if (input.dueDate) {
        doc.text(`Échéance: ${dateFmt(input.dueDate)}`, 380, rightY, { width: 180, align: "right" });
        rightY += 14;
      }
      if (input.validUntil) {
        doc.text(`Valide jusqu'au: ${dateFmt(input.validUntil)}`, 380, rightY, { width: 180, align: "right" });
        rightY += 14;
      }
      if (input.expectedDate) {
        doc.text(`Livraison prévue: ${dateFmt(input.expectedDate)}`, 380, rightY, { width: 180, align: "right" });
        rightY += 14;
      }

      // ── Party block (client / supplier) ─────────────────────────────
      const partyLabel = input.documentType === "BON_COMMANDE" ? "FOURNISSEUR" : "CLIENT";
      doc.font(FONT_BOLD).fontSize(9).fillColor(COLORS.primary);
      doc.text(partyLabel, 40, 220, { width: 250 });
      doc.font(FONT_BOLD).fontSize(11).fillColor(COLORS.text);
      doc.text(input.party.name, 40, 234, { width: 250 });

      doc.font(FONT_REG).fontSize(9).fillColor(COLORS.muted);
      let partyY = 252;
      if (input.party.address) { doc.text(input.party.address, 40, partyY, { width: 250 }); partyY += 12; }
      const pCity = [input.party.city, input.party.country].filter(Boolean).join(", ");
      if (pCity) { doc.text(pCity, 40, partyY, { width: 250 }); partyY += 12; }
      if (input.party.phone) { doc.text(`Tél: ${input.party.phone}`, 40, partyY, { width: 250 }); partyY += 12; }
      if (input.party.email) { doc.text(input.party.email, 40, partyY, { width: 250 }); partyY += 12; }
      if (input.party.taxId) { doc.text(`N° fiscal: ${input.party.taxId}`, 40, partyY, { width: 250 }); partyY += 12; }

      // ── Items table ─────────────────────────────────────────────────
      const tableTop = 310;
      const colX = { ref: 40, name: 110, qty: 320, price: 400, tax: 470, total: 530 };
      const colW = { ref: 70, name: 210, qty: 80, price: 70, tax: 60, total: 70 };

      // Header
      doc.rect(40, tableTop, 525, 22).fill(COLORS.primary);
      doc.font(FONT_BOLD).fontSize(9).fillColor("#ffffff");
      doc.text("RÉF.", colX.ref + 4, tableTop + 6, { width: colW.ref - 8 });
      doc.text("DÉSIGNATION", colX.name + 4, tableTop + 6, { width: colW.name - 8 });
      doc.text("QTÉ", colX.qty + 4, tableTop + 6, { width: colW.qty - 8, align: "right" });
      if (input.documentType !== "BON_LIVRAISON") {
        doc.text("P.U. HT", colX.price + 4, tableTop + 6, { width: colW.price - 8, align: "right" });
        doc.text("TVA", colX.tax + 4, tableTop + 6, { width: colW.tax - 8, align: "right" });
      }
      doc.text("TOTAL", colX.total + 4, tableTop + 6, { width: colW.total - 8, align: "right" });

      // Rows
      let rowY = tableTop + 22;
      doc.font(FONT_REG).fontSize(9).fillColor(COLORS.text);
      input.lines.forEach((line, idx) => {
        const rowH = 24;
        if (idx % 2 === 1) {
          doc.rect(40, rowY, 525, rowH).fill(COLORS.altRow);
          doc.fillColor(COLORS.text);
        }
        const sku = (line as any).sku || line.name?.slice(0, 10) || "—";
        doc.font(FONT_BOLD).text(sku, colX.ref + 4, rowY + 4, { width: colW.ref - 8 });
        doc.font(FONT_REG).text(line.name, colX.name + 4, rowY + 4, { width: colW.name - 8 });
        if (line.description) {
          doc.font(FONT_OBL).fontSize(8).fillColor(COLORS.muted).text(line.description, colX.name + 4, rowY + 14, { width: colW.name - 8 });
          doc.font(FONT_REG).fontSize(9).fillColor(COLORS.text);
        }
        doc.text(String(line.qty), colX.qty + 4, rowY + 4, { width: colW.qty - 8, align: "right" });
        if (input.documentType !== "BON_LIVRAISON") {
          doc.text(money(line.unitPrice ?? 0), colX.price + 4, rowY + 4, { width: colW.price - 8, align: "right" });
          doc.text(`${line.taxRate ?? 0}%`, colX.tax + 4, rowY + 4, { width: colW.tax - 8, align: "right" });
        }
        doc.font(FONT_BOLD).text(input.documentType === "BON_LIVRAISON" ? "" : money(line.lineTotal), colX.total + 4, rowY + 4, { width: colW.total - 8, align: "right" });
        rowY += rowH;
      });

      // Border around the table
      doc.rect(40, tableTop, 525, rowY - tableTop).lineWidth(0.5).strokeColor(COLORS.border).stroke();

      // ── Totals block (right) ────────────────────────────────────────
      if (input.documentType !== "BON_LIVRAISON") {
        const totalsY = rowY + 20;
        const totalsX = 360;
        doc.font(FONT_REG).fontSize(10).fillColor(COLORS.muted);
        doc.text("Sous-total HT", totalsX, totalsY, { width: 130, align: "left" });
        doc.text(money(input.subtotal), 460, totalsY, { width: 100, align: "right" });
        doc.text("TVA", totalsX, totalsY + 18, { width: 130, align: "left" });
        doc.text(money(input.taxTotal), 460, totalsY + 18, { width: 100, align: "right" });
        doc.rect(totalsX, totalsY + 38, 200, 26).fill(COLORS.primary);
        doc.font(FONT_BOLD).fontSize(12).fillColor("#ffffff");
        doc.text("TOTAL TTC", totalsX + 8, totalsY + 45, { width: 130, align: "left" });
        doc.text(money(input.total), 460, totalsY + 45, { width: 100, align: "right" });
        rowY = totalsY + 70;
      }

      // ── Notes ────────────────────────────────────────────────────────
      if (input.notes) {
        doc.font(FONT_BOLD).fontSize(9).fillColor(COLORS.primary);
        doc.text("NOTES", 40, rowY + 20, { width: 525 });
        doc.font(FONT_REG).fontSize(9).fillColor(COLORS.text);
        doc.text(input.notes, 40, rowY + 34, { width: 525 });
        rowY += 60;
      }

      // ── Bank info (for invoices & quotes) ────────────────────────────
      if ((input.documentType === "FACTURE" || input.documentType === "DEVIS") && (input.settings?.bankName || input.settings?.bankIban)) {
        const bankY = Math.max(rowY + 30, 620);
        doc.font(FONT_BOLD).fontSize(9).fillColor(COLORS.primary);
        doc.text("COORDONNÉES BANCAIRES", 40, bankY, { width: 250 });
        doc.font(FONT_REG).fontSize(9).fillColor(COLORS.muted);
        if (input.settings?.bankName) doc.text(`Banque: ${input.settings.bankName}`, 40, bankY + 14, { width: 250 });
        if (input.settings?.bankIban) doc.text(`IBAN: ${input.settings.bankIban}`, 40, bankY + 26, { width: 250 });
        if (input.settings?.bankBic) doc.text(`BIC/SWIFT: ${input.settings.bankBic}`, 40, bankY + 38, { width: 250 });
      }

      // ── Signature block ──────────────────────────────────────────────
      const sigY = 690;
      doc.font(FONT_BOLD).fontSize(9).fillColor(COLORS.primary);
      doc.text("POUR ACCORD", 40, sigY, { width: 200 });
      doc.text("LE CLIENT (nom, date, tampon)", 320, sigY, { width: 200 });

      if (input.settings?.signature) {
        try {
          const sigMatch = input.settings.signature.match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
          if (sigMatch) {
            const sigBuf = Buffer.from(sigMatch[2], "base64");
            doc.image(sigBuf, 40, sigY + 14, { fit: [140, 60] });
          }
        } catch (e) { /* ignore */ }
      }
      doc.font(FONT_OBL).fontSize(8).fillColor(COLORS.muted);
      doc.text(input.settings?.legalName || input.tenant.name, 40, sigY + 78, { width: 200 });
      if (input.receivedBy) {
        doc.font(FONT_BOLD).fontSize(9).fillColor(COLORS.primary);
        doc.text(`Réceptionné par: ${input.receivedBy}`, 320, sigY + 80, { width: 200 });
      }

      // ── Footer ───────────────────────────────────────────────────────
      const footerY = 800;
      doc.rect(0, footerY, 595.28, 42).fill(COLORS.primaryLight);
      doc.font(FONT_OBL).fontSize(8).fillColor(COLORS.muted);
      const footerText = input.settings?.footerNote
        || `${input.settings?.legalName || input.tenant.name} — ${input.settings?.rc ? "RC " + input.settings.rc + "  •  " : ""}${input.settings?.ninea ? "NINEA " + input.settings.ninea : ""}`;
      doc.text(footerText, 40, footerY + 8, { width: 515, align: "center" });
      doc.text(`Document généré par Finora ERP le ${new Intl.DateTimeFormat("fr-SN", { dateStyle: "full", timeStyle: "short" }).format(new Date())}`, 40, footerY + 22, { width: 515, align: "center" });

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}
