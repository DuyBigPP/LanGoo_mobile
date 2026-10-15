import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFeedback, fetchMyFeedback } from "@/api/feedback";
import type { CreateFeedbackDto } from "@/types/api";

export const feedbackKeys = {
  mine: ["feedback", "mine"] as const,
};

export function useMyFeedbackInfiniteQuery(pageSize = 20) {
  return useInfiniteQuery({
    queryKey: [...feedbackKeys.mine, pageSize] as const,
    queryFn: ({ pageParam }: { pageParam: string | null }) =>
      fetchMyFeedback({ limit: pageSize, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next_cursor,
    staleTime: 30_000,
  });
}

export function useCreateFeedbackMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateFeedbackDto) => createFeedback(dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: feedbackKeys.mine });
    },
  });
}
