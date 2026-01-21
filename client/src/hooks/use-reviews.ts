import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type InsertReview } from "@shared/routes";

export function useReviews(providerId: number) {
  return useQuery({
    queryKey: [api.reviews.list.path, providerId],
    queryFn: async () => {
      const url = buildUrl(api.reviews.list.path, { id: providerId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch reviews");
      return api.reviews.list.responses[200].parse(await res.json());
    },
    enabled: !!providerId,
  });
}

export function useCreateReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ providerId, data }: { providerId: number, data: Omit<InsertReview, "providerId" | "clientId"> }) => {
      const url = buildUrl(api.reviews.create.path, { id: providerId });
      const res = await fetch(url, {
        method: api.reviews.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to submit review");
      return api.reviews.create.responses[201].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.reviews.list.path, variables.providerId] });
      queryClient.invalidateQueries({ queryKey: [api.providers.get.path, variables.providerId] });
    },
  });
}
