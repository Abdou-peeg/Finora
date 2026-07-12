"use client";

import { useState } from "react";
import { useList } from "@/hooks/use-data";
import {
  useCreateEmployee, useUpdateEmployee, useDeleteEmployee,
  useCreateAbsence, useUpdateAbsence, useDeleteAbsence,
  useCreateDelay, useUpdateDelay, useDeleteDelay,
  useCreateSalaryLoan, useUpdateSalaryLoan, useDeleteSalaryLoan,
  useCreatePayroll, useUpdatePayroll, useDeletePayroll,
  useCalculatePayroll, useExportPayrolls, usePayPayroll, usePayAllPayrolls,
  useCreateDailyAttendance, useUpdateDailyAttendance,
} from "@/hooks/use-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Plus, Trash2, Edit2, AlertCircle, Clock, DollarSign, FileText, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Download, Check, X, Send, Printer, Calculator } from "lucide-react";
import { currency, dateTimeShort } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function HRView() {
  const [tab, setTab] = useState("daily-attendance");
  const [search, setSearch] = useState("");
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [editingAbsence, setEditingAbsence] = useState<any>(null);
  const [editingDelay, setEditingDelay] = useState<any>(null);
  const [editingLoan, setEditingLoan] = useState<any>(null);
  const [editingPayroll, setEditingPayroll] = useState<any>(null);

  // Data queries
  const employees = useList("employees", { search });
  const absences = useList("absences");
  const delays = useList("delays");
  const loans = useList("salary-loans");
  const payrolls = useList("payrolls");
  const attendances = useList("attendances");

  // Mutations
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();
  const createAbsence = useCreateAbsence();
  const updateAbsence = useUpdateAbsence();
  const deleteAbsence = useDeleteAbsence();
  const createDelay = useCreateDelay();
  const updateDelay = useUpdateDelay();
  const deleteDelay = useDeleteDelay();
  const createLoan = useCreateSalaryLoan();
  const updateLoan = useUpdateSalaryLoan();
  const deleteLoan = useDeleteSalaryLoan();
  const createPayroll = useCreatePayroll();
  const updatePayroll = useUpdatePayroll();
  const deletePayroll = useDeletePayroll();
  const createDailyAttendance = useCreateDailyAttendance();
  const updateDailyAttendance = useUpdateDailyAttendance();

  // Handlers
  async function handleSaveEmployee(data: any) {
    if (editingEmployee?.id) await updateEmployee.mutateAsync({ ...data, id: editingEmployee.id });
    else await createEmployee.mutateAsync(data);
    setEditingEmployee(null);
  }

  async function handleDeleteEmployee(id: string) {
    if (confirm("Êtes-vous sûr de vouloir supprimer cet employé ?")) await deleteEmployee.mutateAsync(id);
  }

  async function handleSaveAbsence(data: any) {
    if (editingAbsence?.id) await updateAbsence.mutateAsync({ ...data, id: editingAbsence.id });
    else await createAbsence.mutateAsync(data);
    setEditingAbsence(null);
  }

  async function handleDeleteAbsence(id: string) {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette absence ?")) await deleteAbsence.mutateAsync(id);
  }

  async function handleSaveDelay(data: any) {
    if (editingDelay?.id) await updateDelay.mutateAsync({ ...data, id: editingDelay.id });
    else await createDelay.mutateAsync(data);
    setEditingDelay(null);
  }

  async function handleDeleteDelay(id: string) {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce retard ?")) await deleteDelay.mutateAsync(id);
  }

  async function handleSaveLoan(data: any) {
    if (editingLoan?.id) await updateLoan.mutateAsync({ ...data, id: editingLoan.id });
    else await createLoan.mutateAsync(data);
    setEditingLoan(null);
  }

  async function handleDeleteLoan(id: string) {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce prêt ?")) await deleteLoan.mutateAsync(id);
  }

  async function handleSavePayroll(data: any) {
    if (editingPayroll?.id) await updatePayroll.mutateAsync({ ...data, id: editingPayroll.id });
    else await createPayroll.mutateAsync(data);
    setEditingPayroll(null);
  }

  async function handleDeletePayroll(id: string) {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette fiche de paie ?")) await deletePayroll.mutateAsync(id);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestion RH</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Pointage, calendrier, paie automatisée et documents professionnels.</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-max sm:w-full sm:grid sm:grid-cols-7">
            <TabsTrigger value="daily-attendance" className="flex items-center gap-2 whitespace-nowrap"><Clock className="h-4 w-4" /> Pointage</TabsTrigger>
            <TabsTrigger value="employees" className="flex items-center gap-2 whitespace-nowrap"><Users className="h-4 w-4" /> Personnel</TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2 whitespace-nowrap"><CalendarIcon className="h-4 w-4" /> Calendrier</TabsTrigger>
            <TabsTrigger value="absences" className="flex items-center gap-2 whitespace-nowrap"><AlertCircle className="h-4 w-4" /> Absences</TabsTrigger>
            <TabsTrigger value="delays" className="flex items-center gap-2 whitespace-nowrap"><Clock className="h-4 w-4" /> Retards</TabsTrigger>
            <TabsTrigger value="loans" className="flex items-center gap-2 whitespace-nowrap"><DollarSign className="h-4 w-4" /> Prêts</TabsTrigger>
            <TabsTrigger value="payrolls" className="flex items-center gap-2 whitespace-nowrap"><FileText className="h-4 w-4" /> Paie</TabsTrigger>
          </TabsList>
        </div>

        {/* DAILY ATTENDANCE TAB */}
        <TabsContent value="daily-attendance" className="space-y-4">
          <DailyAttendanceView 
            employees={employees.data?.items || []} 
            attendances={attendances.data?.items || []} 
            createDailyAttendance={createDailyAttendance} 
            updateDailyAttendance={updateDailyAttendance} 
          />
        </TabsContent>

        {/* EMPLOYEES TAB */}
        <TabsContent value="employees" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1" />
            <Button onClick={() => setEditingEmployee({})} className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-2" /> Ajouter</Button>
          </div>
          <Card><CardContent className="p-4">
            {employees.isLoading ? <Skeleton className="h-24" /> : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead>Salaire</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>{employees.data?.items?.map((emp: any) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">{emp.firstName} {emp.lastName}</TableCell>
                      <TableCell className="hidden md:table-cell">{emp.email}</TableCell>
                      <TableCell>{currency(emp.baseSalary)}</TableCell>
                      <TableCell className="text-right"><div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => setEditingEmployee(emp)}><Edit2 className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="outline" onClick={() => handleDeleteEmployee(emp.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div></TableCell>
                    </TableRow>
                  ))}</TableBody>
                </Table>
              </div>
            )}
          </CardContent></Card>
        </TabsContent>

        {/* CALENDAR TAB */}
        <TabsContent value="calendar" className="space-y-4">
          <VisualCalendar attendances={attendances.data?.items || []} employees={employees.data?.items || []} />
        </TabsContent>

        {/* ABSENCES TAB */}
        <TabsContent value="absences" className="space-y-4">
          <Button onClick={() => setEditingAbsence({})} className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-2" /> Enregistrer</Button>
          <Card><CardContent className="p-4">
            {absences.isLoading ? <Skeleton className="h-24" /> : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Employé</TableHead>
                    <TableHead>Du</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>{absences.data?.items?.map((abs: any) => (
                    <TableRow key={abs.id}>
                      <TableCell className="font-medium">{abs.employee.firstName} {abs.employee.lastName}</TableCell>
                      <TableCell>{dateTimeShort(abs.startDate)}</TableCell>
                      <TableCell>{abs.status}</TableCell>
                      <TableCell className="text-right"><div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => setEditingAbsence(abs)}><Edit2 className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="outline" onClick={() => handleDeleteAbsence(abs.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div></TableCell>
                    </TableRow>
                  ))}</TableBody>
                </Table>
              </div>
            )}
          </CardContent></Card>
        </TabsContent>

        {/* DELAYS TAB */}
        <TabsContent value="delays" className="space-y-4">
          <Button onClick={() => setEditingDelay({})} className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-2" /> Enregistrer</Button>
          <Card><CardContent className="p-4">
            {delays.isLoading ? <Skeleton className="h-24" /> : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Employé</TableHead>
                    <TableHead>Durée (min)</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>{delays.data?.items?.map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.employee.firstName} {d.employee.lastName}</TableCell>
                      <TableCell>{d.timeInMinutes}</TableCell>
                      <TableCell className="text-right"><div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => setEditingDelay(d)}><Edit2 className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="outline" onClick={() => handleDeleteDelay(d.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div></TableCell>
                    </TableRow>
                  ))}</TableBody>
                </Table>
              </div>
            )}
          </CardContent></Card>
        </TabsContent>

        {/* LOANS TAB */}
        <TabsContent value="loans" className="space-y-4">
          <Button onClick={() => setEditingLoan({})} className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-2" /> Créer</Button>
          <Card><CardContent className="p-4">
            {loans.isLoading ? <Skeleton className="h-24" /> : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Employé</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>{loans.data?.items?.map((l: any) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.employee.firstName} {l.employee.lastName}</TableCell>
                      <TableCell>{currency(l.amount)}</TableCell>
                      <TableCell className="text-right"><div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => setEditingLoan(l)}><Edit2 className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="outline" onClick={() => handleDeleteLoan(l.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div></TableCell>
                    </TableRow>
                  ))}</TableBody>
                </Table>
              </div>
            )}
          </CardContent></Card>
        </TabsContent>

        {/* PAYROLLS TAB */}
        <TabsContent value="payrolls" className="space-y-4">
          <PayrollView 
            employees={employees.data?.items || []} 
            payrolls={payrolls.data?.items || []} 
            setEditingPayroll={setEditingPayroll} 
            handleDeletePayroll={handleDeletePayroll} 
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <EmployeeDialog open={!!editingEmployee} onOpenChange={(v: boolean) => !v && setEditingEmployee(null)} employee={editingEmployee} onSave={handleSaveEmployee} isLoading={createEmployee.isPending || updateEmployee.isPending} />
      <AbsenceDialog open={!!editingAbsence} onOpenChange={(v: boolean) => !v && setEditingAbsence(null)} absence={editingAbsence} employees={employees.data?.items || []} onSave={handleSaveAbsence} isLoading={createAbsence.isPending || updateAbsence.isPending} />
      <DelayDialog open={!!editingDelay} onOpenChange={(v: boolean) => !v && setEditingDelay(null)} delay={editingDelay} employees={employees.data?.items || []} onSave={handleSaveDelay} isLoading={createDelay.isPending || updateDelay.isPending} />
      <LoanDialog open={!!editingLoan} onOpenChange={(v: boolean) => !v && setEditingLoan(null)} loan={editingLoan} employees={employees.data?.items || []} onSave={handleSaveLoan} isLoading={createLoan.isPending || updateLoan.isPending} />
      <PayrollDialog open={!!editingPayroll} onOpenChange={(v: boolean) => !v && setEditingPayroll(null)} payroll={editingPayroll} employees={employees.data?.items || []} onSave={handleSavePayroll} isLoading={createPayroll.isPending || updatePayroll.isPending} />
    </div>
  );
}

function DailyAttendanceView({ employees, attendances, createDailyAttendance, updateDailyAttendance }: any) {
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [delayMinutes, setDelayMinutes] = useState<number>(0);

  const handleRecordAttendance = async (status: 'PRESENT' | 'ABSENT' | 'DELAY') => {
    if (!selectedEmployee) {
      toast.error("Veuillez sélectionner un employé.");
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = attendances.find((att: any) => att.employeeId === selectedEmployee.id && new Date(att.date).toDateString() === today.toDateString());

    const data: any = {
      employeeId: selectedEmployee.id,
      date: today.toISOString(),
      status,
    };

    if (status === 'DELAY') {
      data.delayMinutes = delayMinutes;
    }

    try {
      if (existing) {
        await updateDailyAttendance.mutateAsync({ ...data, id: existing.id });
      } else {
        await createDailyAttendance.mutateAsync(data);
      }
    } catch (e) {
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const todayAttendances = attendances.filter((att: any) => new Date(att.date).toDateString() === new Date().toDateString());

  return (
    <Card>
      <CardHeader><CardTitle>Pointage Quotidien</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Sélectionner un employé</Label>
          <Select value={selectedEmployee?.id || ""} onValueChange={(v) => setSelectedEmployee(employees.find((e: any) => e.id === v))}>
            <SelectTrigger><SelectValue placeholder="Sélectionner un employé" /></SelectTrigger>
            <SelectContent>
              {employees.map((e: any) => (
                <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedEmployee && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleRecordAttendance('PRESENT')}>
                <Check className="h-4 w-4 mr-2" /> Présent
              </Button>
              <Button className="bg-red-600 hover:bg-red-700" onClick={() => handleRecordAttendance('ABSENT')}>
                <X className="h-4 w-4 mr-2" /> Absent
              </Button>
              <Button className="bg-amber-600 hover:bg-amber-700" onClick={() => handleRecordAttendance('DELAY')}>
                <Clock className="h-4 w-4 mr-2" /> Retard
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Minutes de retard</Label>
              <Input type="number" value={delayMinutes} onChange={(e) => setDelayMinutes(Number(e.target.value))} placeholder="0" />
            </div>
          </div>
        )}

        <div className="border-t pt-4">
          <h3 className="text-lg font-semibold mb-3">Présences du jour</h3>
          {todayAttendances.length === 0 ? (
            <p className="text-muted-foreground">Aucune présence enregistrée.</p>
          ) : (
            <div className="space-y-2">
              {todayAttendances.map((att: any) => {
                const emp = employees.find((e: any) => e.id === att.employeeId);
                const statusColor = att.status === 'PRESENT' ? 'bg-green-100 text-green-800' : att.status === 'ABSENT' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800';
                return (
                  <div key={att.id} className={cn("p-2 rounded border flex justify-between items-center", statusColor)}>
                    <span className="font-medium">{emp?.firstName} {emp?.lastName}</span>
                    <span className="text-sm">{att.status} {att.delayMinutes ? `(${att.delayMinutes}min)` : ''}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function VisualCalendar({ attendances, employees }: any) {
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);

  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  const monthName = viewDate.toLocaleString("fr-FR", { month: "long", year: "numeric" });

  const prevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  const nextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < (firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1); i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  const getAttendanceForDay = (day: number, empId: string) => {
    const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    date.setHours(0, 0, 0, 0);
    return attendances.find((att: any) => {
      const attDate = new Date(att.date);
      attDate.setHours(0, 0, 0, 0);
      return attDate.getTime() === date.getTime() && att.employeeId === empId;
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg font-bold capitalize">{monthName}</CardTitle>
          <Select value={selectedEmployee?.id || ""} onValueChange={(v) => setSelectedEmployee(employees.find((e: any) => e.id === v))}>
            <SelectTrigger className="w-full mt-2"><SelectValue placeholder="Sélectionner un employé" /></SelectTrigger>
            <SelectContent>
              {employees.map((e: any) => (
                <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-7 border-t">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground border-b border-r last:border-r-0 bg-muted/30">{d}</div>
          ))}
          {calendarDays.map((day, i) => {
            const attendance = selectedEmployee && day ? getAttendanceForDay(day, selectedEmployee.id) : null;
            const statusColor = !attendance ? 'bg-gray-50' : attendance.status === 'PRESENT' ? 'bg-green-50' : attendance.status === 'ABSENT' ? 'bg-red-50' : 'bg-amber-50';
            const dotColor = !attendance ? '' : attendance.status === 'PRESENT' ? 'bg-green-500' : attendance.status === 'ABSENT' ? 'bg-red-500' : 'bg-amber-500';

            return (
              <div key={i} className={cn("min-h-25 p-2 border-b border-r last:border-r-0 relative group", statusColor)}>
                {day && (
                  <>
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-medium">{day}</span>
                      {dotColor && <div className={cn("h-2 w-2 rounded-full", dotColor)} title={attendance?.status} />}
                    </div>
                    {attendance && (
                      <div className="mt-2 text-[10px] text-muted-foreground">
                        {attendance.status}
                        {attendance.delayMinutes && ` (${attendance.delayMinutes}min)`}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
        <div className="p-4 border-t bg-muted/20 space-y-2">
          <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-green-500" /> Présent</div>
          <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-red-500" /> Absent</div>
          <div className="flex items-center gap-2"><div className="h-3 w-3 rounded-full bg-amber-500" /> Retard</div>
        </div>
      </CardContent>
    </Card>
  );
}

// Dialog Components
function EmployeeDialog({ open, onOpenChange, employee, onSave, isLoading }: any) {
  const [form, setForm] = useState(employee || {});
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{employee?.id ? "Modifier l'employé" : "Ajouter un employé"}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Prénom</Label><Input value={form.firstName || ""} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
            <div className="space-y-2"><Label>Nom</Label><Input value={form.lastName || ""} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
          </div>
          <div className="space-y-2"><Label>Email</Label><Input value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div className="space-y-2"><Label>Fonction</Label><Input value={form.jobTitle || ""} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} /></div>
          <div className="space-y-2"><Label>Département</Label><Input value={form.department || ""} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
          <div className="space-y-2"><Label>Salaire de base</Label><Input type="number" value={form.baseSalary || ""} onChange={(e) => setForm({ ...form, baseSalary: e.target.value })} /></div>
          <div className="space-y-2"><Label>Date d'embauche</Label><Input type="date" value={form.hireDate ? new Date(form.hireDate).toISOString().split('T')[0] : ""} onChange={(e) => setForm({ ...form, hireDate: e.target.value })} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button><Button onClick={() => { onSave(form); onOpenChange(false); }} disabled={isLoading}>Enregistrer</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AbsenceDialog({ open, onOpenChange, absence, employees, onSave, isLoading }: any) {
  const [form, setForm] = useState(absence || {});
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{absence?.id ? "Modifier l'absence" : "Enregistrer une absence"}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2"><Label>Employé</Label><Select value={form.employeeId || ""} onValueChange={(v) => setForm({ ...form, employeeId: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{employees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Type</Label><Select value={form.type || ""} onValueChange={(v) => setForm({ ...form, type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PAID_LEAVE">Congé payé</SelectItem><SelectItem value="SICK_LEAVE">Arrêt maladie</SelectItem><SelectItem value="UNPAID_LEAVE">Congé non payé</SelectItem></SelectContent></Select></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Du</Label><Input type="date" value={form.startDate ? new Date(form.startDate).toISOString().split('T')[0] : ""} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
            <div className="space-y-2"><Label>Au</Label><Input type="date" value={form.endDate ? new Date(form.endDate).toISOString().split('T')[0] : ""} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
          </div>
          <div className="space-y-2"><Label>Statut</Label><Select value={form.status || "PENDING"} onValueChange={(v) => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PENDING">En attente</SelectItem><SelectItem value="APPROVED">Approuvée</SelectItem><SelectItem value="REJECTED">Rejetée</SelectItem></SelectContent></Select></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button><Button onClick={() => { onSave(form); onOpenChange(false); }} disabled={isLoading}>Enregistrer</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DelayDialog({ open, onOpenChange, delay, employees, onSave, isLoading }: any) {
  const [form, setForm] = useState(delay || {});
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{delay?.id ? "Modifier le retard" : "Enregistrer un retard"}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2"><Label>Employé</Label><Select value={form.employeeId || ""} onValueChange={(v) => setForm({ ...form, employeeId: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{employees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Date</Label><Input type="date" value={form.date ? new Date(form.date).toISOString().split('T')[0] : ""} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
          <div className="space-y-2"><Label>Durée (minutes)</Label><Input type="number" value={form.timeInMinutes || ""} onChange={(e) => setForm({ ...form, timeInMinutes: e.target.value })} /></div>
          <div className="space-y-2"><Label>Raison</Label><Input value={form.reason || ""} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button><Button onClick={() => { onSave(form); onOpenChange(false); }} disabled={isLoading}>Enregistrer</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LoanDialog({ open, onOpenChange, loan, employees, onSave, isLoading }: any) {
  const [form, setForm] = useState(loan || {});
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{loan?.id ? "Modifier le prêt" : "Créer un prêt"}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2"><Label>Employé</Label><Select value={form.employeeId || ""} onValueChange={(v) => setForm({ ...form, employeeId: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{employees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Montant</Label><Input type="number" value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
          <div className="space-y-2"><Label>Taux d'intérêt (%)</Label><Input type="number" value={form.interestRate || ""} onChange={(e) => setForm({ ...form, interestRate: e.target.value })} /></div>
          <div className="space-y-2"><Label>Déduction mensuelle (FCFA)</Label><Input type="number" value={form.monthlyDeduction || ""} onChange={(e) => setForm({ ...form, monthlyDeduction: e.target.value })} placeholder="Ex: 25000" /></div>
          <div className="space-y-2"><Label>Date de début</Label><Input type="date" value={form.startDate ? new Date(form.startDate).toISOString().split('T')[0] : ""} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
          <div className="space-y-2"><Label>Statut</Label><Select value={form.status || "PENDING"} onValueChange={(v) => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PENDING">En attente</SelectItem><SelectItem value="APPROVED">Approuvé</SelectItem><SelectItem value="REJECTED">Rejeté</SelectItem><SelectItem value="PAID">Remboursé</SelectItem></SelectContent></Select></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button><Button onClick={() => { onSave(form); onOpenChange(false); }} disabled={isLoading}>Enregistrer</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PayrollView({ employees, payrolls, setEditingPayroll, handleDeletePayroll }: any) {
  const calculatePayroll = useCalculatePayroll();
  const exportPayrolls = useExportPayrolls();
  const payPayroll = usePayPayroll();
  const payAllPayrolls = usePayAllPayrolls();
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [penaltiesWaived, setPenaltiesWaived] = useState(false);

  const filteredPayrolls = payrolls.filter((p: any) => p.payPeriodStart.startsWith(selectedMonth));

  const handleCalculateAll = async () => {
    const startDate = new Date(`${selectedMonth}-01`);
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
    
    for (const emp of employees) {
      await calculatePayroll.mutateAsync({
        employeeId: emp.id,
        payPeriodStart: startDate.toISOString(),
        payPeriodEnd: endDate.toISOString(),
        penaltiesWaived
      });
    }
  };

  const handlePayAll = async () => {
    const confirmed = confirm("Êtes-vous sûr de vouloir payer toutes les paies confirmées pour cette période? Cela débitera la caisse et créera les écritures comptables.");
    if (!confirmed) return;

    const startDate = new Date(`${selectedMonth}-01`);
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
    
    await payAllPayrolls.mutateAsync({
      payPeriodStart: startDate.toISOString(),
      payPeriodEnd: endDate.toISOString()
    });
  };

  const handlePayOne = async (payrollId: string) => {
    const payroll = filteredPayrolls.find((p: any) => p.id === payrollId);
    const confirmed = confirm(`Êtes-vous sûr de vouloir payer ${payroll.employee.firstName} ${payroll.employee.lastName} (${currency(payroll.netSalary)})? Cela débitera la caisse et créera l'écriture comptable.`);
    if (!confirmed) return;

    await payPayroll.mutateAsync(payrollId);
  };

  const handleExportAll = async () => {
    const res = await exportPayrolls.mutateAsync({
      payrollIds: filteredPayrolls.map((p: any) => p.id),
      format: 'pdf'
    });
    if (res.content) {
      const win = window.open("", "_blank");
      win?.document.write(res.content);
      win?.document.close();
      win?.print();
    }
  };

  const handleExportOne = async (id: string) => {
    const res = await exportPayrolls.mutateAsync({
      payrollIds: [id],
      format: 'pdf'
    });
    if (res.content) {
      const win = window.open("", "_blank");
      win?.document.write(res.content);
      win?.document.close();
      win?.print();
    }
  };

  const confirmedCount = filteredPayrolls.filter((p: any) => p.status === "CONFIRMED").length;
  const paidCount = filteredPayrolls.filter((p: any) => p.status === "PAID").length;
  const totalNetSalary = filteredPayrolls.reduce((sum: number, p: any) => sum + Number(p.netSalary), 0);

  return (
    <div className="space-y-4">
      {/* Sélection et commandes globales */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Traitement de la paie
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="space-y-2">
              <Label htmlFor="month-select">Mois de paie</Label>
              <Input
                id="month-select"
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            </div>
            <div className="space-y-2 flex items-end">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="waive"
                  checked={penaltiesWaived}
                  onChange={(e) => setPenaltiesWaived(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="waive" className="cursor-pointer text-sm">
                  Pardonner les pénalités
                </Label>
              </div>
            </div>
          </div>

          {/* Boutons d'action globaux */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Button
              onClick={handleCalculateAll}
              disabled={calculatePayroll.isPending}
              variant="outline"
              className="gap-2"
            >
              <Calculator className="h-4 w-4" />
              {calculatePayroll.isPending ? "Calcul..." : "Tout calculer"}
            </Button>
            <Button
              onClick={handlePayAll}
              disabled={payAllPayrolls.isPending || confirmedCount === 0}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              <Send className="h-4 w-4" />
              {payAllPayrolls.isPending ? "Paiement..." : "Tout payer"}
            </Button>
            <Button
              onClick={handleExportAll}
              disabled={exportPayrolls.isPending || filteredPayrolls.length === 0}
              variant="outline"
              className="gap-2"
            >
              <Printer className="h-4 w-4" />
              {exportPayrolls.isPending ? "Export..." : "Tout imprimer"}
            </Button>
          </div>

          {/* Résumé */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-muted rounded-md text-sm">
            <div>
              <span className="text-muted-foreground">Calculées:</span>
              <span className="ml-2 font-semibold">{filteredPayrolls.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Confirmées:</span>
              <span className="ml-2 font-semibold text-amber-600">{confirmedCount}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Payées:</span>
              <span className="ml-2 font-semibold text-green-600">{paidCount}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Montant total:</span>
              <span className="ml-2 font-semibold">{currency(totalNetSalary)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des employés */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fiches de paie du mois</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Employé</TableHead>
                  <TableHead className="text-right">Brut</TableHead>
                  <TableHead className="text-right">Déductions</TableHead>
                  <TableHead className="text-right font-bold">Net à payer</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayrolls.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                      Aucune fiche de paie pour cette période. Calculez d'abord les paies.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayrolls.map((p: any) => {
                    const totalDeductions = Number(p.absencesDeduction || 0) + Number(p.delaysDeduction || 0) + Number(p.loansDeduction || 0);
                    const statusColor =
                      p.status === "PAID"
                        ? "bg-green-50 text-green-800"
                        : p.status === "CONFIRMED"
                        ? "bg-amber-50 text-amber-800"
                        : "bg-blue-50 text-blue-800";
                    
                    return (
                      <TableRow key={p.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          <div>
                            {p.employee.firstName} {p.employee.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground">{p.employee.email}</div>
                        </TableCell>
                        <TableCell className="text-right">{currency(p.grossSalary)}</TableCell>
                        <TableCell className="text-right text-red-600">-{currency(totalDeductions)}</TableCell>
                        <TableCell className="text-right font-bold text-green-700">
                          {currency(p.netSalary)}
                        </TableCell>
                        <TableCell>
                          <span className={cn("px-2 py-1 text-xs font-medium rounded", statusColor)}>
                            {p.status === "PAID"
                              ? "Payée"
                              : p.status === "CONFIRMED"
                              ? "Confirmée"
                              : "Brouillon"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {/* Calculer (avec icône) */}
                            <Button
                              size="sm"
                              variant="outline"
                              title="Recalculer la fiche"
                              onClick={() => {
                                const startDate = new Date(`${selectedMonth}-01`);
                                const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
                                calculatePayroll.mutateAsync({
                                  employeeId: p.employee.id,
                                  payPeriodStart: startDate.toISOString(),
                                  payPeriodEnd: endDate.toISOString(),
                                  penaltiesWaived
                                });
                              }}
                              disabled={calculatePayroll.isPending}
                            >
                              <Calculator className="h-3.5 w-3.5" />
                            </Button>
                            
                            {/* Payer */}
                            <Button
                              size="sm"
                              variant={p.status === "PAID" ? "outline" : "default"}
                              className={
                                p.status === "PAID"
                                  ? ""
                                  : "bg-green-600 hover:bg-green-700 text-white"
                              }
                              title={
                                p.status === "PAID"
                                  ? "Déjà payée"
                                  : "Payer cette fiche"
                              }
                              onClick={() => handlePayOne(p.id)}
                              disabled={p.status === "PAID" || payPayroll.isPending}
                            >
                              <Send className="h-3.5 w-3.5" />
                            </Button>
                            
                            {/* Imprimer */}
                            <Button
                              size="sm"
                              variant="outline"
                              title="Imprimer la fiche de paie"
                              onClick={() => handleExportOne(p.id)}
                              disabled={exportPayrolls.isPending}
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PayrollDialog({ open, onOpenChange, payroll, employees, onSave, isLoading }: any) {
  const [form, setForm] = useState(payroll || {});
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{payroll?.id ? "Modifier la fiche" : "Nouvelle fiche"}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2"><Label>Employé</Label><Select value={form.employeeId || ""} onValueChange={(v) => setForm({ ...form, employeeId: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{employees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Net</Label><Input type="number" value={form.netSalary || ""} onChange={(e) => setForm({ ...form, netSalary: e.target.value })} /></div>
            <div className="space-y-2"><Label>Statut</Label><Select value={form.status || "DRAFT"} onValueChange={(v) => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="DRAFT">Brouillon</SelectItem><SelectItem value="CONFIRMED">Confirmée</SelectItem><SelectItem value="PAID">Payée</SelectItem></SelectContent></Select></div>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button><Button onClick={() => { onSave(form); onOpenChange(false); }} disabled={isLoading}>Enregistrer</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}