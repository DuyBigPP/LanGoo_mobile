import { useQuery } from "@tanstack/react-query";
import { fetchSrsStats } from "@/api/srs";
import { fetchMeStats } from "@/api/stats";
import { useAuth } from "@/contexts/AuthContext";

export const statsKeys = {
  me: ["me-stats"] as const,
  srs: ["srs-stats"] as const,
};

export function useMeStatsQuery() {
  // Số liệu cá nhân — guest không gọi
  const authenticated = useAuth().status === "authenticated";
  return useQuery({
    queryKey: statsKeys.me,
    queryFn: fetchMeStats,
    enabled: authenticated,
    staleTime: 60_000,
  });
}

export function useSrsStatsQuery() {
  const authenticated = useAuth().status === "authenticated";
  return useQuery({
    queryKey: statsKeys.srs,
    queryFn: fetchSrsStats,
    enabled: authenticated,
    staleTime: 60_000,
  });
}
