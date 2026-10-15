import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createQuiz, fetchQuiz, fetchQuizzes, startQuiz } from "@/api/quizzes";

export const quizKeys = {
  list: ["quizzes"] as const,
  detail: (id: string) => ["quizzes", id] as const,
};

export function useQuizzesQuery(enabled = true) {
  return useInfiniteQuery({
    queryKey: quizKeys.list,
    queryFn: ({ pageParam }) => fetchQuizzes({ limit: 20, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next_cursor,
    enabled,
    staleTime: 15_000,
  });
}

export function useQuizQuery(id: string | null) {
  return useQuery({
    queryKey: quizKeys.detail(id ?? "none"),
    queryFn: () => fetchQuiz(id as string),
    enabled: Boolean(id),
    staleTime: 15_000,
  });
}

export function useCreateQuizMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createQuiz,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: quizKeys.list });
    },
  });
}

export function useStartQuizMutation() {
  return useMutation({ mutationFn: startQuiz });
}
