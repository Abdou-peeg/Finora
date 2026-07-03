"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const API = (path: string, init?: RequestInit) =>
  fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  }).then(async (r) => {
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = (data as any).error || `Erreur ${r.status}`;
      throw new Error(msg);
    }
    return data;
  });

// ─────────────────────────────────────────────────────────────────────────────
// Generic helpers
// ─────────────────────────────────────────────────────────────────────────────
export function useList<T = any>(key: string, search = "") {
  return useQuery({
    queryKey: [key, search],
    queryFn: () => API(`/api/${key}?search=${encodeURIComponent(search)}`),
  });
}

export function useDashboard() {
  return useQuery({ queryKey: ["dashboard"], queryFn: () => API("/api/dashboard") });
}

export function useReports() {
  return useQuery({ queryKey: ["reports"], queryFn: () => API("/api/reports") });
}

export function useAudit(limit = 100) {
  return useQuery({
    queryKey: ["audit", limit],
    queryFn: () => API(`/api/audit?limit=${limit}`),
  });
}

export function useJournal() {
  return useQuery({ queryKey: ["journal"], queryFn: () => API("/api/journal") });
}

export function useCash() {
  return useQuery({ queryKey: ["cash"], queryFn: () => API("/api/cash") });
}

export function useMe() {
  return useQuery({ queryKey: ["me"], queryFn: () => API("/api/me") });
}

export function useUsers() {
  return useQuery({ queryKey: ["users"], queryFn: () => API("/api/admin/users") });
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────────────────
export function useMutationToast<T = any>(
  key: string,
  fn: (body: any) => Promise<any>,
  successMsg?: string
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [key] });
      // Also refresh the dashboard and audit log since they aggregate everything
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["audit"] });
      qc.invalidateQueries({ queryKey: ["reports"] });
      qc.invalidateQueries({ queryKey: ["journal"] });
      qc.invalidateQueries({ queryKey: ["cash"] });
      if (successMsg) toast.success(successMsg);
    },
    onError: (e: any) => {
      toast.error(e.message || "Une erreur est survenue");
    },
  }) as any;
}

export const api = API;

// ─────────────────────────────────────────────────────────────────────────────
// Specific mutations with optimistic UI
// ─────────────────────────────────────────────────────────────────────────────
export function useCreateProduct() {
  return useMutationToast("products", (b) => API("/api/products", { method: "POST", body: JSON.stringify(b) }), "Produit créé");
}
export function useUpdateProduct() {
  return useMutationToast("products", (b) => API("/api/products", { method: "PATCH", body: JSON.stringify(b) }), "Produit mis à jour");
}
export function useDeleteProduct() {
  return useMutationToast("products", (id: string) => API(`/api/products?id=${id}`, { method: "DELETE" }), "Produit supprimé");
}
export function useCreateCustomer() {
  return useMutationToast("customers", (b) => API("/api/customers", { method: "POST", body: JSON.stringify(b) }), "Client créé");
}
export function useUpdateCustomer() {
  return useMutationToast("customers", (b) => API("/api/customers", { method: "PATCH", body: JSON.stringify(b) }), "Client mis à jour");
}
export function useDeleteCustomer() {
  return useMutationToast("customers", (id: string) => API(`/api/customers?id=${id}`, { method: "DELETE" }), "Client supprimé");
}
export function useCreateSupplier() {
  return useMutationToast("suppliers", (b) => API("/api/suppliers", { method: "POST", body: JSON.stringify(b) }), "Fournisseur créé");
}
export function useUpdateSupplier() {
  return useMutationToast("suppliers", (b) => API("/api/suppliers", { method: "PATCH", body: JSON.stringify(b) }), "Fournisseur mis à jour");
}
export function useDeleteSupplier() {
  return useMutationToast("suppliers", (id: string) => API(`/api/suppliers?id=${id}`, { method: "DELETE" }), "Fournisseur supprimé");
}
export function useCreateSale() {
  return useMutationToast("sales", (b) => API("/api/sales", { method: "POST", body: JSON.stringify(b) }), "Vente créée");
}
export function useSaleAction() {
  return useMutationToast(
    "sales",
    ({ id, action }: { id: string; action: string }) =>
      API(`/api/sales/${id}`, { method: "PATCH", body: JSON.stringify({ action }) }),
    "Action exécutée"
  );
}
export function useCreatePurchase() {
  return useMutationToast("purchases", (b) => API("/api/purchases", { method: "POST", body: JSON.stringify(b) }), "Achat créé");
}
export function usePurchaseAction() {
  return useMutationToast(
    "purchases",
    ({ id, action }: { id: string; action: string }) =>
      API(`/api/purchases/${id}`, { method: "PATCH", body: JSON.stringify({ action }) }),
    "Action exécutée"
  );
}
export function useInvoiceAction() {
  return useMutationToast(
    "invoices",
    ({ id, action, amount }: { id: string; action: string; amount?: number }) =>
      API(`/api/invoices/${id}`, { method: "PATCH", body: JSON.stringify({ action, amount }) }),
    "Action exécutée"
  );
}
export function useManualCash() {
  return useMutationToast("cash", (b) => API("/api/cash", { method: "POST", body: JSON.stringify(b) }), "Entrée caisse enregistrée");
}
export function useCreateUser() {
  return useMutationToast("users", (b) => API("/api/admin/users", { method: "POST", body: JSON.stringify(b) }), "Utilisateur créé");
}
export function useUpdateUser() {
  return useMutationToast("users", (b) => API("/api/admin/users", { method: "PATCH", body: JSON.stringify(b) }), "Utilisateur mis à jour");
}
export function useDeleteUser() {
  return useMutationToast("users", (id: string) => API(`/api/admin/users?id=${id}`, { method: "DELETE" }), "Utilisateur supprimé");
}
