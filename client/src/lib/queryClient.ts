import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await res.json().catch(() => null);
      if (data?.message) {
        throw new Error(data.message);
      }
    }
    const text = (await res.text().catch(() => "")) || res.statusText;
    if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) {
      throw new Error("تعذر الاتصال بالخادم. (Server error or endpoint not found)");
    }
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
    async ({ queryKey }) => {
      const res = await fetch(queryKey.join("/") as string, {
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        const text = await res.text().catch(() => "");
        if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) {
          throw new Error("تعذر الحصول على بيانات الاستجابة من الخادم (Invalid server response)");
        }
      }
      return await res.json();
    };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchOnWindowFocus: true,      // Auto-refresh when tab regains focus
      staleTime: 30 * 1000,            // 30s — data considered fresh for 30s
      gcTime: 5 * 60 * 1000,           // 5min — garbage collect unused cache
      retry: 1,                        // Retry once on failure
      refetchOnReconnect: true,        // Refresh when network reconnects
    },
    mutations: {
      retry: false,
    },
  },
});
