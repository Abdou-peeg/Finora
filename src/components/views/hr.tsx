"use client";

import { useState } from "react";
import { useList } from "@/hooks/use-data";
import {
  useCreateEmployee, useUpdateEmployee, useDeleteEmployee,
  useCreateAbsence, useUpdateAbsence, useDeleteAbsence,
  useCreateDelay, useUpdateDelay, useDeleteDelay,
  useCreateSalaryLoan, useUpdateSalaryLoan, useDeleteSalaryLoan,
  useCreatePayroll, useUpdatePayroll, useDeletePayroll,
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
import { Users, Plus, Trash2, Edit2, AlertCircle, Clock, DollarSign, FileText } from "lucide-react";
import { currency, dateTimeShort } from "@/lib/format";

export function HRView() {
  const [tab, setTab] = useState("employees");
  const [search, setSearch] = useState("");
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [editingAbsence, setEditingAbsence] = useState<any>(null);
  const [editingDelay, setEditingDelay] = useState<any>(null);
  const [editingLoan, setEditingLoan] = useState<any>(null);
  const [editingPayroll, setEditingPayroll] = useState<any>(null);

  // Data queries
  const employees = useList("employees", search);
  const absences = useList("absences");
  const delays = useList("delays");
  const loans = useList("salary-loans");
  const payrolls = useList("payrolls");

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

  // Employee handlers
  async function handleSaveEmployee(data: any) {
    if (editingEmployee?.id) {
      await updateEmployee.mutateAsync({ ...data, id: editingEmployee.id });
    } else {
      await createEmployee.mutateAsync(data);
    }
    setEditingEmployee(null);
  }

  async function handleDeleteEmployee(id: string) {
    if (confirm("Êtes-vous sûr de vouloir supprimer cet employé ?")) {
      await deleteEmployee.mutateAsync(id);
    }
  }

  // Absence handlers
  async function handleSaveAbsence(data: any) {
    if (editingAbsence?.id) {
      await updateAbsence.mutateAsync({ ...data, id: editingAbsence.id });
    } else {
      await createAbsence.mutateAsync(data);
    }
    setEditingAbsence(null);
  }

  async function handleDeleteAbsence(id: string) {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette absence ?")) {
      await deleteAbsence.mutateAsync(id);
    }
  }

  // Delay handlers
  async function handleSaveDelay(data: any) {
    if (editingDelay?.id) {
      await updateDelay.mutateAsync({ ...data, id: editingDelay.id });
    } else {
      await createDelay.mutateAsync(data);
    }
    setEditingDelay(null);
  }

  async function handleDeleteDelay(id: string) {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce retard ?")) {
      await deleteDelay.mutateAsync(id);
    }
  }

  // Loan handlers
  async function handleSaveLoan(data: any) {
    if (editingLoan?.id) {
      await updateLoan.mutateAsync({ ...data, id: editingLoan.id });
    } else {
      await createLoan.mutateAsync(data);
    }
    setEditingLoan(null);
  }

  async function handleDeleteLoan(id: string) {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce prêt ?")) {
      await deleteLoan.mutateAsync(id);
    }
  }

  // Payroll handlers
  async function handleSavePayroll(data: any) {
    if (editingPayroll?.id) {
      await updatePayroll.mutateAsync({ ...data, id: editingPayroll.id });
    } else {
      await createPayroll.mutateAsync(data);
    }
    setEditingPayroll(null);
  }

  async function handleDeletePayroll(id: string) {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette fiche de paie ?")) {
      await deletePayroll.mutateAsync(id);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Gestion RH</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Gérez le personnel, les absences, les retards, les prêts et la paie.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="employees" className="flex items-center gap-2">
            <Users className="h-4 w-4" /> Personnel
          </TabsTrigger>
          <TabsTrigger value="absences" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" /> Absences
          </TabsTrigger>
          <TabsTrigger value="delays" className="flex items-center gap-2">
            <Clock className="h-4 w-4" /> Retards
          </TabsTrigger>
          <TabsTrigger value="loans" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Prêts
          </TabsTrigger>
          <TabsTrigger value="payrolls" className="flex items-center gap-2">
            <FileText className="h-4 w-4" /> Paie
          </TabsTrigger>
        </TabsList>

        {/* EMPLOYEES TAB */}
        <TabsContent value="employees" className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Rechercher par nom, email, fonction…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            <Button onClick={() => setEditingEmployee({})}>
              <Plus className="h-4 w-4 mr-2" /> Ajouter un employé
            </Button>
          </div>

          <Card>
            <CardContent className="p-4">
              {employees.isLoading ? (
                <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
              ) : employees.data?.items?.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">Aucun employé. Commencez par en ajouter un.</div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Fonction</TableHead>
                        <TableHead>Département</TableHead>
                        <TableHead>Salaire</TableHead>
                        <TableHead>Date d'embauche</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employees.data?.items?.map((emp: any) => (
                        <TableRow key={emp.id}>
                          <TableCell className="font-medium">{emp.firstName} {emp.lastName}</TableCell>
                          <TableCell className="text-sm">{emp.email || "—"}</TableCell>
                          <TableCell className="text-sm">{emp.jobTitle || "—"}</TableCell>
                          <TableCell className="text-sm">{emp.department || "—"}</TableCell>
                          <TableCell className="text-sm">{currency(emp.baseSalary)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{dateTimeShort(emp.hireDate)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button size="sm" variant="outline" onClick={() => setEditingEmployee(emp)}>
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleDeleteEmployee(emp.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Employee Dialog */}
          <EmployeeDialog
            open={!!editingEmployee}
            onOpenChange={(v) => !v && setEditingEmployee(null)}
            employee={editingEmployee}
            onSave={handleSaveEmployee}
            isLoading={createEmployee.isPending || updateEmployee.isPending}
          />
        </TabsContent>

        {/* ABSENCES TAB */}
        <TabsContent value="absences" className="space-y-4">
          <Button onClick={() => setEditingAbsence({})}>
            <Plus className="h-4 w-4 mr-2" /> Enregistrer une absence
          </Button>

          <Card>
            <CardContent className="p-4">
              {absences.isLoading ? (
                <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
              ) : absences.data?.items?.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">Aucune absence enregistrée.</div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employé</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Du</TableHead>
                        <TableHead>Au</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {absences.data?.items?.map((abs: any) => (
                        <TableRow key={abs.id}>
                          <TableCell className="font-medium">{abs.employee.firstName} {abs.employee.lastName}</TableCell>
                          <TableCell className="text-sm">{abs.type}</TableCell>
                          <TableCell className="text-sm">{dateTimeShort(abs.startDate)}</TableCell>
                          <TableCell className="text-sm">{dateTimeShort(abs.endDate)}</TableCell>
                          <TableCell className="text-sm">{abs.status}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button size="sm" variant="outline" onClick={() => setEditingAbsence(abs)}>
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleDeleteAbsence(abs.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Absence Dialog */}
          <AbsenceDialog
            open={!!editingAbsence}
            onOpenChange={(v) => !v && setEditingAbsence(null)}
            absence={editingAbsence}
            employees={employees.data?.items || []}
            onSave={handleSaveAbsence}
            isLoading={createAbsence.isPending || updateAbsence.isPending}
          />
        </TabsContent>

        {/* DELAYS TAB */}
        <TabsContent value="delays" className="space-y-4">
          <Button onClick={() => setEditingDelay({})}>
            <Plus className="h-4 w-4 mr-2" /> Enregistrer un retard
          </Button>

          <Card>
            <CardContent className="p-4">
              {delays.isLoading ? (
                <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
              ) : delays.data?.items?.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">Aucun retard enregistré.</div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employé</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Durée (min)</TableHead>
                        <TableHead>Raison</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {delays.data?.items?.map((delay: any) => (
                        <TableRow key={delay.id}>
                          <TableCell className="font-medium">{delay.employee.firstName} {delay.employee.lastName}</TableCell>
                          <TableCell className="text-sm">{dateTimeShort(delay.date)}</TableCell>
                          <TableCell className="text-sm">{delay.timeInMinutes}</TableCell>
                          <TableCell className="text-sm">{delay.reason || "—"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button size="sm" variant="outline" onClick={() => setEditingDelay(delay)}>
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleDeleteDelay(delay.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Delay Dialog */}
          <DelayDialog
            open={!!editingDelay}
            onOpenChange={(v) => !v && setEditingDelay(null)}
            delay={editingDelay}
            employees={employees.data?.items || []}
            onSave={handleSaveDelay}
            isLoading={createDelay.isPending || updateDelay.isPending}
          />
        </TabsContent>

        {/* LOANS TAB */}
        <TabsContent value="loans" className="space-y-4">
          <Button onClick={() => setEditingLoan({})}>
            <Plus className="h-4 w-4 mr-2" /> Créer un prêt
          </Button>

          <Card>
            <CardContent className="p-4">
              {loans.isLoading ? (
                <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
              ) : loans.data?.items?.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">Aucun prêt enregistré.</div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employé</TableHead>
                        <TableHead>Montant</TableHead>
                        <TableHead>Taux (%)</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Date de début</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loans.data?.items?.map((loan: any) => (
                        <TableRow key={loan.id}>
                          <TableCell className="font-medium">{loan.employee.firstName} {loan.employee.lastName}</TableCell>
                          <TableCell className="text-sm">{currency(loan.amount)}</TableCell>
                          <TableCell className="text-sm">{loan.interestRate}%</TableCell>
                          <TableCell className="text-sm">{loan.status}</TableCell>
                          <TableCell className="text-sm">{dateTimeShort(loan.startDate)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button size="sm" variant="outline" onClick={() => setEditingLoan(loan)}>
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleDeleteLoan(loan.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Loan Dialog */}
          <LoanDialog
            open={!!editingLoan}
            onOpenChange={(v) => !v && setEditingLoan(null)}
            loan={editingLoan}
            employees={employees.data?.items || []}
            onSave={handleSaveLoan}
            isLoading={createLoan.isPending || updateLoan.isPending}
          />
        </TabsContent>

        {/* PAYROLLS TAB */}
        <TabsContent value="payrolls" className="space-y-4">
          <Button onClick={() => setEditingPayroll({})}>
            <Plus className="h-4 w-4 mr-2" /> Générer une fiche de paie
          </Button>

          <Card>
            <CardContent className="p-4">
              {payrolls.isLoading ? (
                <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
              ) : payrolls.data?.items?.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">Aucune fiche de paie générée.</div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employé</TableHead>
                        <TableHead>Période</TableHead>
                        <TableHead>Salaire brut</TableHead>
                        <TableHead>Salaire net</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payrolls.data?.items?.map((payroll: any) => (
                        <TableRow key={payroll.id}>
                          <TableCell className="font-medium">{payroll.employee.firstName} {payroll.employee.lastName}</TableCell>
                          <TableCell className="text-sm">{dateTimeShort(payroll.payPeriodStart)} - {dateTimeShort(payroll.payPeriodEnd)}</TableCell>
                          <TableCell className="text-sm">{currency(payroll.grossSalary)}</TableCell>
                          <TableCell className="text-sm font-semibold">{currency(payroll.netSalary)}</TableCell>
                          <TableCell className="text-sm">{payroll.status}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button size="sm" variant="outline" onClick={() => setEditingPayroll(payroll)}>
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleDeletePayroll(payroll.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payroll Dialog */}
          <PayrollDialog
            open={!!editingPayroll}
            onOpenChange={(v) => !v && setEditingPayroll(null)}
            payroll={editingPayroll}
            employees={employees.data?.items || []}
            onSave={handleSavePayroll}
            isLoading={createPayroll.isPending || updatePayroll.isPending}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dialog Components
// ─────────────────────────────────────────────────────────────────────────────

function EmployeeDialog({ open, onOpenChange, employee, onSave, isLoading }: any) {
  const [form, setForm] = useState(employee || {});
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{employee?.id ? "Modifier l'employé" : "Ajouter un employé"}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prénom</Label>
              <Input value={form.firstName || ""} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input value={form.lastName || ""} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Fonction</Label>
            <Input value={form.jobTitle || ""} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Département</Label>
            <Input value={form.department || ""} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Salaire de base</Label>
            <Input type="number" value={form.baseSalary || ""} onChange={(e) => setForm({ ...form, baseSalary: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Date d'embauche</Label>
            <Input type="date" value={form.hireDate ? new Date(form.hireDate).toISOString().split('T')[0] : ""} onChange={(e) => setForm({ ...form, hireDate: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={() => { onSave(form); onOpenChange(false); }} disabled={isLoading}>Enregistrer</Button>
        </DialogFooter>
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
          <div className="space-y-2">
            <Label>Employé</Label>
            <Select value={form.employeeId || ""} onValueChange={(v) => setForm({ ...form, employeeId: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {employees.map((e: any) => (
                  <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={form.type || ""} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PAID_LEAVE">Congé payé</SelectItem>
                <SelectItem value="SICK_LEAVE">Arrêt maladie</SelectItem>
                <SelectItem value="UNPAID_LEAVE">Congé non payé</SelectItem>
                <SelectItem value="MATERNITY_LEAVE">Congé maternité</SelectItem>
                <SelectItem value="PATERNITY_LEAVE">Congé paternité</SelectItem>
                <SelectItem value="OTHER">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Du</Label>
              <Input type="date" value={form.startDate ? new Date(form.startDate).toISOString().split('T')[0] : ""} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Au</Label>
              <Input type="date" value={form.endDate ? new Date(form.endDate).toISOString().split('T')[0] : ""} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Statut</Label>
            <Select value={form.status || "PENDING"} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING">En attente</SelectItem>
                <SelectItem value="APPROVED">Approuvée</SelectItem>
                <SelectItem value="REJECTED">Rejetée</SelectItem>
                <SelectItem value="CANCELLED">Annulée</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={() => { onSave(form); onOpenChange(false); }} disabled={isLoading}>Enregistrer</Button>
        </DialogFooter>
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
          <div className="space-y-2">
            <Label>Employé</Label>
            <Select value={form.employeeId || ""} onValueChange={(v) => setForm({ ...form, employeeId: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {employees.map((e: any) => (
                  <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" value={form.date ? new Date(form.date).toISOString().split('T')[0] : ""} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Durée (minutes)</Label>
            <Input type="number" value={form.timeInMinutes || ""} onChange={(e) => setForm({ ...form, timeInMinutes: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Raison</Label>
            <Input value={form.reason || ""} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={() => { onSave(form); onOpenChange(false); }} disabled={isLoading}>Enregistrer</Button>
        </DialogFooter>
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
          <div className="space-y-2">
            <Label>Employé</Label>
            <Select value={form.employeeId || ""} onValueChange={(v) => setForm({ ...form, employeeId: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {employees.map((e: any) => (
                  <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Montant</Label>
            <Input type="number" value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Taux d'intérêt (%)</Label>
            <Input type="number" value={form.interestRate || ""} onChange={(e) => setForm({ ...form, interestRate: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Date de début</Label>
            <Input type="date" value={form.startDate ? new Date(form.startDate).toISOString().split('T')[0] : ""} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Statut</Label>
            <Select value={form.status || "PENDING"} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING">En attente</SelectItem>
                <SelectItem value="APPROVED">Approuvé</SelectItem>
                <SelectItem value="REJECTED">Rejeté</SelectItem>
                <SelectItem value="PAID">Remboursé</SelectItem>
                <SelectItem value="PARTIALLY_PAID">Partiellement remboursé</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={() => { onSave(form); onOpenChange(false); }} disabled={isLoading}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PayrollDialog({ open, onOpenChange, payroll, employees, onSave, isLoading }: any) {
  const [form, setForm] = useState(payroll || {});
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{payroll?.id ? "Modifier la fiche de paie" : "Générer une fiche de paie"}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Employé</Label>
            <Select value={form.employeeId || ""} onValueChange={(v) => setForm({ ...form, employeeId: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {employees.map((e: any) => (
                  <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Début de période</Label>
              <Input type="date" value={form.payPeriodStart ? new Date(form.payPeriodStart).toISOString().split('T')[0] : ""} onChange={(e) => setForm({ ...form, payPeriodStart: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Fin de période</Label>
              <Input type="date" value={form.payPeriodEnd ? new Date(form.payPeriodEnd).toISOString().split('T')[0] : ""} onChange={(e) => setForm({ ...form, payPeriodEnd: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Salaire brut</Label>
              <Input type="number" value={form.grossSalary || ""} onChange={(e) => setForm({ ...form, grossSalary: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Salaire net</Label>
              <Input type="number" value={form.netSalary || ""} onChange={(e) => setForm({ ...form, netSalary: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Déductions</Label>
              <Input type="number" value={form.deductions || ""} onChange={(e) => setForm({ ...form, deductions: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Bonus</Label>
              <Input type="number" value={form.bonuses || ""} onChange={(e) => setForm({ ...form, bonuses: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Statut</Label>
            <Select value={form.status || "DRAFT"} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DRAFT">Brouillon</SelectItem>
                <SelectItem value="GENERATED">Générée</SelectItem>
                <SelectItem value="APPROVED">Approuvée</SelectItem>
                <SelectItem value="PAID">Payée</SelectItem>
                <SelectItem value="CANCELLED">Annulée</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={() => { onSave(form); onOpenChange(false); }} disabled={isLoading}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
