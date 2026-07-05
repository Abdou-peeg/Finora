"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSubscriptionStore } from "@/lib/subscription-store";

const API = (path: string, init?: RequestInit) =>
  fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  }).then(async (r) => {
    const data = await r.json().catch(() => ({}));
    if (r.status === 402 && (data as any).code === "SUBSCRIPTION_EXPIRED") {
      useSubscriptionStore.getState().setExpired(true);
      throw new Error("Abonnement expiré");
    }
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

// ─────────────────────────────────────────────────────────────────────────────
// Company settings
// ─────────────────────────────────────────────────────────────────────────────
export function useCompany() {
  return useQuery({ queryKey: ["company"], queryFn: () => API("/api/company") });
}
export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: any) => API("/api/company", { method: "PUT", body: JSON.stringify(b) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company"] });
      qc.invalidateQueries({ queryKey: ["me"] });
      toast.success("Paramètres enregistrés");
    },
    onError: (e: any) => toast.error(e.message || "Erreur"),
  }) as any;
}

// ─────────────────────────────────────────────────────────────────────────────
// Quotes (devis)
// ─────────────────────────────────────────────────────────────────────────────
export function useCreateQuote() {
  return useMutationToast("quotes", (b) => API("/api/quotes", { method: "POST", body: JSON.stringify(b) }), "Devis créé");
}
export function useQuoteAction() {
  return useMutationToast(
    "quotes",
    ({ id, action, status }: { id: string; action: string; status?: string }) =>
      API(`/api/quotes/${id}`, { method: "PATCH", body: JSON.stringify({ action, status }) }),
    "Action exécutée"
  );
}
export function useDeleteQuote() {
  return useMutationToast("quotes", (id: string) => API(`/api/quotes/${id}`, { method: "DELETE" }), "Devis supprimé");
}

// ─────────────────────────────────────────────────────────────────────────────
// Purchase orders (bons de commande)
// ─────────────────────────────────────────────────────────────────────────────
export function useCreatePurchaseOrder() {
  return useMutationToast("purchase-orders", (b) => API("/api/purchase-orders", { method: "POST", body: JSON.stringify(b) }), "Bon de commande créé");
}
export function usePurchaseOrderAction() {
  return useMutationToast(
    "purchase-orders",
    ({ id, action, status }: { id: string; action: string; status?: string }) =>
      API(`/api/purchase-orders/${id}`, { method: "PATCH", body: JSON.stringify({ action, status }) }),
    "Action exécutée"
  );
}
export function useDeletePurchaseOrder() {
  return useMutationToast("purchase-orders", (id: string) => API(`/api/purchase-orders/${id}`, { method: "DELETE" }), "Bon supprimé");
}

// ─────────────────────────────────────────────────────────────────────────────
// Delivery notes (bons de livraison)
// ─────────────────────────────────────────────────────────────────────────────
export function useCreateDeliveryNote() {
  return useMutationToast("delivery-notes", (b) => API("/api/delivery-notes", { method: "POST", body: JSON.stringify(b) }), "Bon de livraison créé");
}
export function useDeliveryNoteAction() {
  return useMutationToast(
    "delivery-notes",
    ({ id, action, status, receivedBy }: { id: string; action: string; status?: string; receivedBy?: string }) =>
      API(`/api/delivery-notes/${id}`, { method: "PATCH", body: JSON.stringify({ action, status, receivedBy }) }),
    "Action exécutée"
  );
}
export function useDeleteDeliveryNote() {
  return useMutationToast("delivery-notes", (id: string) => API(`/api/delivery-notes/${id}`, { method: "DELETE" }), "Bon supprimé");
}
