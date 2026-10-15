import { useQuery } from "@tanstack/react-query";
import { fetchSources } from "@/api/sources";

export const sourceKeys = {
  list: ["dictionary", "sources"] as const,
};

/** Nguồn dữ liệu từ điển (trang /sources) — ít đổi, cache 30 phút. */
export function useSourcesQuery(enabled = true) {
  return useQuery({
    queryKey: sourceKeys.list,
    queryFn: fetchSources,
    enabled,
    staleTime: 30 * 60_000,
  });
}
