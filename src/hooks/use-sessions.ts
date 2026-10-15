import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  answerSession,
  createSession,
  fetchSession,
  fetchSessionItems,
  finishSession,
} from "@/api/sessions";
import type { AnswerSessionDto, SessionDetailDto } from "@/types/api";

export const sessionKeys = {
  detail: (id: string) => ["session", id] as const,
  wrong: (id: string) => ["session", id, "wrong"] as const,
};

export function useCreateSessionMutation() {
  return useMutation({ mutationFn: createSession });
}

export function useSessionQuery(id: string | null) {
  return useQuery({
    queryKey: sessionKeys.detail(id ?? "none"),
    queryFn: () => fetchSession(id as string),
    enabled: Boolean(id),
    staleTime: 15_000,
  });
}

export function useSessionWrongItemsQuery(id: string | null, enabled: boolean) {
  return useQuery({
    queryKey: sessionKeys.wrong(id ?? "none"),
    queryFn: () => fetchSessionItems(id as string, { is_correct: false }),
    enabled: enabled && Boolean(id),
    staleTime: 0,
  });
}

/** Trả lời một câu — thay item đã chấm + cập nhật phiên trong cache (mirror web). */
export function useAnswerMutation(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AnswerSessionDto) => answerSession(sessionId, input),
    onSuccess: (result) => {
      queryClient.setQueryData<SessionDetailDto>(
      sessionKeys.detail(sessionId),
      (previous: SessionDetailDto | undefined) => {
        if (!previous) return previous;
        return {
          ...previous,
          session: result.session,
          items: previous.items.map((item) => (item.id === result.item.id ? result.item : item)),
        };
      });
    },
  });
}

export function useFinishMutation(sessionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => finishSession(sessionId),
    onSuccess: (session) => {
      queryClient.setQueryData<SessionDetailDto>(
        sessionKeys.detail(sessionId),
        (previous: SessionDetailDto | undefined) => (previous ? { ...previous, session } : previous),
      );
      void queryClient.invalidateQueries({ queryKey: sessionKeys.wrong(sessionId) });
      void queryClient.invalidateQueries({ queryKey: ["me-stats"] });
      void queryClient.invalidateQueries({ queryKey: ["srs-stats"] });
      void queryClient.invalidateQueries({ queryKey: ["achievements"] });
    },
  });
}
