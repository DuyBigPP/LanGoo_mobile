import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAchievements, markAchievementsSeen } from "@/api/gamification";

export const achievementKeys = {
  list: ["achievements"] as const,
};

/** Danh sách thành tích + số chưa xem (port từ web `use-gamification`). */
export function useAchievementsQuery(enabled = true) {
  return useQuery({
    queryKey: achievementKeys.list,
    queryFn: fetchAchievements,
    enabled,
    staleTime: 60_000,
  });
}

/** Đánh dấu đã xem thành tích (bỏ trống codes = đánh dấu tất cả). */
export function useMarkAchievementsSeenMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (codes?: string[]) => markAchievementsSeen(codes),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: achievementKeys.list });
    },
  });
}
