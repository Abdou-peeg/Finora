import { Decimal } from "@prisma/client/runtime/library";
import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/guard";
import { db } from "@/lib/db";
import { safeError } from "@/lib/errors";

export async function POST(req: Request) {
  const g = await requirePermission(req, "rh:create");
  if (g instanceof NextResponse) return g;
  const { tenantId, id: generatedById } = g.user;
  const { employeeId, payPeriodStart, payPeriodEnd, penaltiesWaived } = await req.json();

  try {
    const employee = await db.employee.findFirst({
      where: { id: employeeId, tenantId },
    });
    if (!employee) return NextResponse.json({ error: "Employé introuvable" }, { status: 404 });

    const startDate = new Date(payPeriodStart);
    const endDate = new Date(payPeriodEnd);

    // 1. Récupérer les pointages (Absences et Retards)
    const attendances = await db.attendance.findMany({
      where: {
        tenantId,
        employeeId,
        date: { gte: startDate, lte: endDate },
      },
    });

    const baseSalary = Number(employee.baseSalary);
    const dailyRate = baseSalary / 22; // 22 jours de travail par mois
    const hourlyRate = dailyRate / 8;
    const minuteRate = hourlyRate / 60;

    let absencesCount = attendances.filter(a => a.status === "ABSENT").length;
    let totalDelayMinutes = attendances
      .filter(a => a.status === "DELAY")
      .reduce((acc, curr) => acc + (curr.delayMinutes || 0), 0);

    let absencesDeduction = absencesCount * dailyRate;
    let delaysDeduction = totalDelayMinutes * minuteRate;

    // 2. Récupérer les prêts en cours (déduction mensuelle)
    const activeLoans = await db.salaryLoan.findMany({
      where: {
        tenantId,
        employeeId,
        status: { in: ["APPROVED", "PARTIALLY_PAID"] },
      },
    });
    let loansDeduction = activeLoans.reduce((acc, curr) => acc + Number(curr.monthlyDeduction || 0), 0);

    // 3. Si les pénalités sont pardonnées
    if (penaltiesWaived) {
      absencesDeduction = 0;
      delaysDeduction = 0;
    }

    // 4. Calculer le Net
    const grossSalary = baseSalary;
    const netSalary = Math.max(0, grossSalary - absencesDeduction - delaysDeduction - loansDeduction);

    // 5. Créer ou mettre à jour la fiche de paie
    const payroll = await db.payroll.upsert({
      where: {
        tenantId_employeeId_payPeriodStart_payPeriodEnd: {
          tenantId,
          employeeId,
          payPeriodStart: startDate,
          payPeriodEnd: endDate,
        },
      },
      update: {
        baseSalary: new Decimal(grossSalary),
        grossSalary: new Decimal(grossSalary),
        netSalary: new Decimal(netSalary),
        absencesDeduction: new Decimal(absencesDeduction),
        delaysDeduction: new Decimal(delaysDeduction),
        loansDeduction: new Decimal(loansDeduction),
        penaltiesWaived,
        status: "GENERATED",
        generatedById,
      },
      create: {
        tenantId,
        employeeId,
        payPeriodStart: startDate,
        payPeriodEnd: endDate,
        baseSalary: new Decimal(grossSalary),
        grossSalary: new Decimal(grossSalary),
        netSalary: new Decimal(netSalary),
        absencesDeduction: new Decimal(absencesDeduction),
        delaysDeduction: new Decimal(delaysDeduction),
        loansDeduction: new Decimal(loansDeduction),
        penaltiesWaived,
        status: "GENERATED",
        generatedById,
      },
      include: { employee: true },
    });

    return NextResponse.json({
      payroll,
      breakdown: {
        baseSalary,
        absencesCount,
        totalDelayMinutes,
        absencesDeduction,
        delaysDeduction,
        loansDeduction,
        netSalary,
        penaltiesWaived,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: safeError(e) }, { status: 400 });
  }
}
