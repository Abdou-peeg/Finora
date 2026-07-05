"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/hooks/use-data";
import { toast } from "sonner";

export function usePlatformTenants() {
  return useQuery({
    queryKey: ["platform-tenants"],
    queryFn: () => api("/api/platform/tenants"),
  });
}

export function useUpdateTenantSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: any) => api("/api/platform/tenants", { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-tenants"] });
      toast.success("Abonnement mis à jour");
    },
    onError: (e: any) => toast.error(e.message || "Erreur"),
  });
}