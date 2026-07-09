import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/guard";
import { db } from "@/lib/db";
import { safeError } from "@/lib/errors";

export async function POST(req: Request) {
  const g = await requirePermission(req, "rh:view");
  if (g instanceof NextResponse) return g;
  const { tenantId } = g.user;
  const body = await req.json();

  try {
    const { payrollIds, format } = body; // format: 'pdf' ou 'csv'

    // Récupérer les fiches de paie
    const payrolls = await db.payroll.findMany({
      where: {
        tenantId,
        id: { in: payrollIds },
      },
      include: {
        employee: true,
      },
    });

    if (payrolls.length === 0) {
      return NextResponse.json({ error: "Aucune fiche de paie trouvée" }, { status: 404 });
    }

    // Générer le contenu
    let content = "";

    if (format === "csv") {
      // CSV: État de paie global
      content = "Employé,Période,Salaire Brut,Déductions Absences,Déductions Retards,Déductions Prêts,Salaire Net\n";
      payrolls.forEach((p) => {
        content += `"${p.employee.firstName} ${p.employee.lastName}","${p.payPeriodStart.toISOString().split('T')[0]} - ${p.payPeriodEnd.toISOString().split('T')[0]}",${p.grossSalary},${p.absencesDeduction},${p.delaysDeduction},${p.loansDeduction},${p.netSalary}\n`;
      });
    } else {
      // HTML pour PDF
      content = generatePayrollHTML(payrolls);
    }

    return NextResponse.json({
      content,
      format,
      count: payrolls.length,
    });
  } catch (e: any) {
    return NextResponse.json({ error: safeError(e) }, { status: 400 });
  }
}

function generatePayrollHTML(payrolls: any[]): string {
  const now = new Date().toLocaleDateString("fr-FR");
  let html = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <title>État de Paie</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .payroll { page-break-after: always; margin-bottom: 40px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        th { background-color: #f2f2f2; }
        .total { font-weight: bold; background-color: #e8f4f8; }
        .signature { margin-top: 40px; display: flex; justify-content: space-around; }
        .signature-box { width: 150px; border-top: 1px solid #000; text-align: center; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>ÉTAT DE PAIE</h1>
        <p>Généré le ${now}</p>
      </div>
  `;

  payrolls.forEach((payroll) => {
    html += `
      <div class="payroll">
        <h2>${payroll.employee.firstName} ${payroll.employee.lastName}</h2>
        <p><strong>Période:</strong> ${payroll.payPeriodStart.toISOString().split('T')[0]} au ${payroll.payPeriodEnd.toISOString().split('T')[0]}</p>
        <p><strong>Fonction:</strong> ${payroll.employee.jobTitle || "N/A"}</p>
        <p><strong>Département:</strong> ${payroll.employee.department || "N/A"}</p>
        
        <table>
          <tr>
            <th>Libellé</th>
            <th>Montant</th>
          </tr>
          <tr>
            <td>Salaire de base</td>
            <td>${payroll.grossSalary.toFixed(2)} FCFA</td>
          </tr>
          <tr>
            <td>Déduction Absences</td>
            <td>-${payroll.absencesDeduction.toFixed(2)} FCFA</td>
          </tr>
          <tr>
            <td>Déduction Retards</td>
            <td>-${payroll.delaysDeduction.toFixed(2)} FCFA</td>
          </tr>
          <tr>
            <td>Déduction Prêts</td>
            <td>-${payroll.loansDeduction.toFixed(2)} FCFA</td>
          </tr>
          <tr class="total">
            <td>SALAIRE NET À PAYER</td>
            <td>${payroll.netSalary.toFixed(2)} FCFA</td>
          </tr>
        </table>
        
        ${payroll.penaltiesWaived ? '<p style="color: green; font-weight: bold;">✓ Pénalités pardonnées</p>' : ''}
        
        <div class="signature">
          <div class="signature-box">
            <p>Responsable RH</p>
          </div>
          <div class="signature-box">
            <p>Directeur</p>
          </div>
        </div>
      </div>
    `;
  });

  html += `
    </body>
    </html>
  `;

  return html;
}
