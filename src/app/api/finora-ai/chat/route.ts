import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/guard";
import { db } from "@/lib/db";
import { callGemini, GeminiFunctionDeclaration, GeminiMessage } from "@/lib/gemini";
import { generateInvoiceFromSale } from "@/lib/transactions";

function n(v: any): number {
  return Number(v ?? 0);
}

const FUNCTIONS: GeminiFunctionDeclaration[] = [
  {
    name: "create_customer",
    description: "Crée un nouveau client dans Finora.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Nom du client ou de l'entreprise" },
        phone: { type: "string", description: "Numéro de téléphone (optionnel)" },
        email: { type: "string", description: "Email (optionnel)" },
        address: { type: "string", description: "Adresse (optionnel)" },
        city: { type: "string", description: "Ville (optionnel)" },
      },
      required: ["name"],
    },
  },
  {
    name: "create_quote",
    description: "Crée un devis pour un client existant, avec une ou plusieurs lignes de produits.",
    parameters: {
      type: "object",
      properties: {
        customerName: { type: "string", description: "Nom du client (déjà existant dans Finora)" },
        items: {
          type: "array",
          description: "Lignes du devis",
          items: {
            type: "object",
            properties: {
              productName: { type: "string", description: "Nom ou SKU du produit" },
              qty: { type: "number", description: "Quantité" },
            },
            required: ["productName", "qty"],
          },
        },
        notes: { type: "string", description: "Notes optionnelles sur le devis" },
      },
      required: ["customerName", "items"],
    },
  },
  {
    name: "generate_invoice_from_sale",
    description: "Génère une facture à partir d'une vente déjà confirmée, en indiquant sa référence (ex: VTE-2026-0004).",
    parameters: {
      type: "object",
      properties: {
        saleReference: { type: "string", description: "Référence exacte de la vente confirmée" },
      },
      required: ["saleReference"],
    },
  },
    {
    name: "generate_invoice_from_sale",
    description: "Génère une facture à partir d'une vente déjà confirmée, en indiquant sa référence (ex: VTE-2026-0004).",
    parameters: {
      type: "object",
      properties: {
        saleReference: { type: "string", description: "Référence exacte de la vente confirmée" },
      },
      required: ["saleReference"],
    },
  },
  {
    name: "create_product",
    description: "Ajoute un nouveau produit au catalogue.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Nom du produit" },
        salePrice: { type: "number", description: "Prix de vente HT en FCFA" },
        costPrice: { type: "number", description: "Prix d'achat HT en FCFA (optionnel, par défaut 0)" },
        category: { type: "string", description: "Catégorie (optionnel)" },
        unit: { type: "string", description: "Unité de mesure, ex: pièce, kg (optionnel)" },
        stockQty: { type: "number", description: "Quantité en stock initial (optionnel, par défaut 0)" },
      },
      required: ["name", "salePrice"],
    },
  },
];

async function buildFinancialContext(tenantId: string) {
  const [salesAgg, invoicesAgg, cashLast, productsCount, customersCount] = await Promise.all([
    db.sale.findMany({ where: { tenantId, status: { in: ["CONFIRMED", "INVOICED", "PAID"] } }, select: { total: true, date: true } }),
    db.invoice.findMany({ where: { tenantId }, select: { total: true, paidAmount: true, status: true } }),
    db.cashEntry.findFirst({ where: { tenantId }, orderBy: { date: "desc" }, select: { balanceAfter: true } }),
    db.product.count({ where: { tenantId } }),
    db.customer.count({ where: { tenantId } }),
  ]);

  const totalVentes = salesAgg.reduce((s, x) => s + n(x.total), 0);
  const totalFactureTTC = invoicesAgg.reduce((s, x) => s + n(x.total), 0);
  const totalEncaisse = invoicesAgg.reduce((s, x) => s + n(x.paidAmount), 0);
  const impayes = totalFactureTTC - totalEncaisse;
  const soldeCaisse = n(cashLast?.balanceAfter);

  return `Contexte financier actuel de l'entreprise (à utiliser pour tes analyses, en FCFA):
- Solde de caisse actuel: ${Math.round(soldeCaisse)} FCFA
- Total des ventes confirmées (cumulé): ${Math.round(totalVentes)} FCFA
- Total facturé: ${Math.round(totalFactureTTC)} FCFA
- Total encaissé sur factures: ${Math.round(totalEncaisse)} FCFA
- Impayés clients: ${Math.round(impayes)} FCFA
- Nombre de produits au catalogue: ${productsCount}
- Nombre de clients: ${customersCount}`;
}

export async function POST(req: Request) {
  const g = await requirePermission(req);
  if (g instanceof NextResponse) return g;
  const { tenantId, name: userName, id: userId } = g.user;

  const body = await req.json();
  const history: { role: "user" | "assistant"; content: string }[] = body.messages || [];
  if (history.length === 0) return NextResponse.json({ error: "Message vide" }, { status: 400 });

  const financialContext = await buildFinancialContext(tenantId);

  const systemInstruction = `Tu es "Finora AI", l'assistant intégré à Finora, un ERP de gestion d'entreprise pour PME sénégalaises.
Tu réponds toujours en français, de façon concise et professionnelle.
Tu peux exécuter des actions réelles dans l'application via les fonctions disponibles (créer un client, créer un devis, générer une facture depuis une vente).
Tu peux aussi donner des conseils, analyses ou études financières basées sur les données réelles de l'entreprise ci-dessous — sois concret, cite des chiffres, et donne des recommandations actionnables.
N'invente jamais de données financières qui ne sont pas dans le contexte fourni.

${financialContext}`;

  const geminiHistory: GeminiMessage[] = history.map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }],
  }));

  try {
    let result = await callGemini({ systemInstruction, contents: geminiHistory, functionDeclarations: FUNCTIONS });

    const actionsSummary: string[] = [];

    if (result.functionCalls.length > 0) {
      const functionResponseParts: any[] = [];

      for (const call of result.functionCalls) {
        let responsePayload: any = {};
        try {
          if (call.name === "create_customer") {
            const args = call.args;
            const count = await db.customer.count({ where: { tenantId } });
            const code = `CLI-${String(count + 1).padStart(4, "0")}`;
            const created = await db.customer.create({
              data: {
                tenantId, code,
                name: args.name,
                phone: args.phone || null,
                email: args.email || null,
                address: args.address || null,
                city: args.city || null,
              },
            });
            await db.auditLog.create({
              data: { tenantId, userId, userName, action: "CREATE", entity: "Customer", entityId: created.id, details: `Client ${created.name} créé via Finora AI.` },
            });
            actionsSummary.push(`Client "${created.name}" créé (code ${created.code}).`);
            responsePayload = { success: true, customerId: created.id, code: created.code };
          }

          else if (call.name === "create_quote") {
            const args = call.args;
            const customer = await db.customer.findFirst({
              where: { tenantId, name: { contains: args.customerName } },
            });
            if (!customer) {
              responsePayload = { success: false, error: `Client "${args.customerName}" introuvable. Crée-le d'abord.` };
            } else {
              const lineItems: any[] = [];
              let subtotal = 0, taxTotal = 0;
              for (const it of args.items) {
                const product = await db.product.findFirst({
                  where: { tenantId, OR: [{ name: { contains: it.productName } }, { sku: { contains: it.productName } }] },
                });
                if (!product) {
                  responsePayload = { success: false, error: `Produit "${it.productName}" introuvable.` };
                  break;
                }
                const qty = Number(it.qty) || 1;
                const unitPrice = n(product.salePrice);
                const taxRate = n(product.taxRate);
                const lineTotal = Math.round(qty * unitPrice * (1 + taxRate / 100) * 100) / 100;
                subtotal += qty * unitPrice;
                taxTotal += lineTotal - qty * unitPrice;
                lineItems.push({ productId: product.id, qty, unitPrice, taxRate, lineTotal });
              }
              if (!responsePayload.error) {
                const year = new Date().getFullYear();
                const count = await db.quote.count({ where: { tenantId, number: { startsWith: `DEV-${year}-` } } });
                const number = `DEV-${year}-${String(count + 1).padStart(4, "0")}`;
                const total = subtotal + taxTotal;
                const quote = await db.quote.create({
                  data: {
                    tenantId, number, customerId: customer.id,
                    subtotal: Math.round(subtotal * 100) / 100,
                    taxTotal: Math.round(taxTotal * 100) / 100,
                    total: Math.round(total * 100) / 100,
                    notes: args.notes || null,
                    items: { create: lineItems },
                  },
                });
                await db.auditLog.create({
                  data: { tenantId, userId, userName, action: "CREATE", entity: "Quote", entityId: quote.id, details: `Devis ${number} créé via Finora AI pour ${customer.name}.` },
                });
                actionsSummary.push(`Devis ${number} créé pour ${customer.name} — total ${Math.round(total)} FCFA.`);
                responsePayload = { success: true, quoteNumber: number, total };
              }
            }
          }

          else if (call.name === "generate_invoice_from_sale") {
            const args = call.args;
            const sale = await db.sale.findFirst({ where: { tenantId, reference: args.saleReference } });
            if (!sale) {
              responsePayload = { success: false, error: `Vente "${args.saleReference}" introuvable.` };
            } else if (sale.status !== "CONFIRMED") {
              responsePayload = { success: false, error: `La vente doit être confirmée (statut actuel: ${sale.status}).` };
            } else {
              const inv = await generateInvoiceFromSale(sale.id, { id: userId, name: userName });
              actionsSummary.push(`Facture ${inv.number} générée depuis la vente ${args.saleReference}.`);
              responsePayload = { success: true, invoiceNumber: inv.number };
            }
          }

          else if (call.name === "create_product") {
            const args = call.args;
            const count = await db.product.count({ where: { tenantId } });
            const sku = `SKU-${String(count + 1).padStart(3, "0")}`;
            const created = await db.product.create({
              data: {
                tenantId,
                sku,
                name: args.name,
                salePrice: Number(args.salePrice),
                costPrice: Number(args.costPrice ?? 0),
                category: args.category || null,
                unit: args.unit || "pièce",
                stockQty: Number(args.stockQty ?? 0),
              },
            });
            await db.auditLog.create({
              data: { tenantId, userId, userName, action: "CREATE", entity: "Product", entityId: created.id, details: `Produit ${created.name} créé via Finora AI.` },
            });
            actionsSummary.push(`Produit "${created.name}" créé (SKU ${created.sku}).`);
            responsePayload = { success: true, productId: created.id, sku: created.sku };
          }
        } catch (e: any) {
          responsePayload = { success: false, error: e.message };
        }

        functionResponseParts.push({ functionResponse: { name: call.name, response: responsePayload } });
      }

      // Deuxième appel pour obtenir une réponse en langage naturel après exécution des actions
      const followUpContents: GeminiMessage[] = [
        ...geminiHistory,
        { role: "model", parts: result.rawParts },
        { role: "user", parts: functionResponseParts },
      ];
      result = await callGemini({ systemInstruction, contents: followUpContents, functionDeclarations: FUNCTIONS });
    }

    return NextResponse.json({
      reply: result.text || actionsSummary.join(" "),
      actions: actionsSummary,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Erreur Finora AI" }, { status: 500 });
  }
}