import { useQuery } from "@tanstack/react-query";
import { fetchSrsStats } from "@/api/srs";
import { fetchMeStats } from "@/api/stats";

export const statsKeys = {
  me: ["me-stats"] as const,
  srs: ["srs-stats"] as const,
};

export function useMeStatsQuery() {
  return useQuery({
    queryKey: statsKeys.me,
    queryFn: fetchMeStats,
    staleTime: 60_000,
  });
}

export function useSrsStatsQuery() {
  return useQuery({
    queryKey: statsKeys.srs,
    queryFn: fetchSrsStats,
    staleTime: 60_000,
  });
}
