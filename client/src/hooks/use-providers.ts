import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type ProviderSearchParams, type InsertProviderProfile } from "@shared/routes";

export function useProviders(params?: ProviderSearchParams) {
  // Serialize params to stable key
  const queryKey = [api.providers.list.path, JSON.stringify(params)];
  
  return useQuery({
    queryKey,
    queryFn: async () => {
      const url = new URL(api.providers.list.path, window.location.origin);
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value) url.searchParams.append(key, value);
        });
      }
      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch providers");
      return api.providers.list.responses[200].parse(await res.json());
    },
  });
}

export function useProvider(id: number) {
  return useQuery({
    queryKey: [api.providers.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.providers.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch provider");
      return api.providers.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Partial<Omit<InsertProviderProfile, "userId">>) => {
      const res = await fetch(api.providers.update.path, {
        method: api.providers.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update profile");
      return api.providers.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.auth.me.path] });
      queryClient.invalidateQueries({ queryKey: [api.providers.get.path] });
    },
  });
}
