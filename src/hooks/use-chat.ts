import * as React from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/api/client";
import {
  archiveChatSession,
  createChatSession,
  fetchChatMessages,
  fetchChatSession,
  fetchChatSessions,
  fetchChatUsage,
  streamChatMessage,
  updateChatSession,
} from "@/api/chat";
import { translate } from "@/i18n";
import type { ChatMessageDto, ChatMessageListDto } from "@/types/api";

export const chatKeys = {
  sessions: ["chat", "sessions"] as const,
  session: (id: string) => ["chat", "session", id] as const,
  messages: (id: string) => ["chat", "messages", id] as const,
  usage: ["chat", "usage"] as const,
};

export function useChatSessionsQuery() {
  return useInfiniteQuery({
    queryKey: chatKeys.sessions,
    queryFn: ({ pageParam }) => fetchChatSessions({ limit: 20, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next_cursor,
    staleTime: 15_000,
  });
}

export function useChatSessionQuery(id: string | null) {
  return useQuery({
    queryKey: chatKeys.session(id ?? "none"),
    queryFn: () => fetchChatSession(id as string),
    enabled: Boolean(id),
    staleTime: 15_000,
  });
}

export function useChatMessagesQuery(id: string | null) {
  return useQuery({
    queryKey: chatKeys.messages(id ?? "none"),
    queryFn: () => fetchChatMessages(id as string, { limit: 100 }),
    enabled: Boolean(id),
    staleTime: 0,
  });
}

export function useChatUsageQuery() {
  return useQuery({
    queryKey: chatKeys.usage,
    queryFn: fetchChatUsage,
    staleTime: 30_000,
  });
}

export function useCreateChatSessionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createChatSession,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chatKeys.sessions });
    },
  });
}

export function useUpdateChatSessionMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof updateChatSession>[1]) => updateChatSession(id, input),
    onSuccess: (session) => {
      queryClient.setQueryData(chatKeys.session(id), session);
      void queryClient.invalidateQueries({ queryKey: chatKeys.sessions });
    },
  });
}

export function useArchiveChatSessionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: archiveChatSession,
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: chatKeys.messages(id) });
      void queryClient.invalidateQueries({ queryKey: chatKeys.sessions });
    },
  });
}

export interface ChatPendingTurn {
  /** Phiên mà lượt này thuộc về (tránh hiện nhầm khi đổi phiên giữa lúc stream) */
  sessionId: string;
  content: string;
  refSenseId?: string;
  /** Ảnh đính kèm (data URL) — giữ để hiện thumbnail + gửi lại khi thử lại */
  images?: string[];
  partial: string;
  status: "streaming" | "error" | "stopped";
  error?: string;
}

/**
 * Gửi tin nhắn dạng stream SSE: hiện chữ dần, nút Dừng, giữ phần đã stream khi
 * lỗi. `send()` không ném lỗi — trạng thái lỗi nằm trong `pending.status`.
 */
export function useChatStream() {
  const queryClient = useQueryClient();
  const [pending, setPending] = React.useState<ChatPendingTurn | null>(null);
  // Ảnh không được backend lưu -> giữ thumbnail theo message_id ở RAM để phiên đang mở vẫn thấy
  const [sentImages, setSentImages] = React.useState<Record<string, string[]>>({});
  const abortRef = React.useRef<AbortController | null>(null);

  const send = React.useCallback(
    async (sessionId: string, content: string, refSenseId?: string, images?: string[]) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setPending({ sessionId, content, refSenseId, images, partial: "", status: "streaming" });

      try {
        const result = await streamChatMessage(
          sessionId,
          { content, ref_sense_id: refSenseId, images: images?.length ? images : undefined },
          {
            signal: controller.signal,
            onEvent: (event) => {
              if (event.type === "delta") {
                setPending((previous) =>
                  previous && previous.status === "streaming"
                    ? { ...previous, partial: previous.partial + event.content }
                    : previous,
                );
              }
            },
          },
        );
        // Ghi tin thật (id server) vào cache để hiện ngay, rồi refetch đồng bộ
        queryClient.setQueryData<ChatMessageListDto>(
        chatKeys.messages(sessionId),
        (previous: ChatMessageListDto | undefined) => {
          const merged: ChatMessageDto[] = [...(previous?.data ?? [])];
          for (const message of [result.user_message, result.assistant_message]) {
            if (!merged.some((item) => item.id === message.id)) merged.push(message);
          }
          return { data: merged, next_cursor: previous?.next_cursor ?? null };
        });
        if (images?.length) {
          const messageId = result.user_message.id;
          setSentImages((previous) => ({ ...previous, [messageId]: images }));
        }
        void queryClient.invalidateQueries({ queryKey: chatKeys.messages(sessionId) });
        void queryClient.invalidateQueries({ queryKey: chatKeys.usage });
        void queryClient.invalidateQueries({ queryKey: chatKeys.sessions });
        void queryClient.invalidateQueries({ queryKey: chatKeys.session(sessionId) });
        setPending(null);
      } catch (error) {
        if (controller.signal.aborted) {
          // Chỉ đánh dấu "đã dừng" nếu đây vẫn là lượt đang hiện (không bị lượt mới thay thế)
          if (abortRef.current === controller) {
            setPending((previous) => (previous ? { ...previous, status: "stopped" } : previous));
          }
          return;
        }
        const message = error instanceof ApiError ? error.message : translate("errors.unknown");
        setPending((previous) =>
          previous ? { ...previous, status: "error", error: message } : previous,
        );
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [queryClient],
  );

  /** Gửi lại đúng nội dung lượt đang lỗi/đã dừng */
  const retry = React.useCallback(() => {
    if (pending) void send(pending.sessionId, pending.content, pending.refSenseId, pending.images);
  }, [pending, send]);

  const cancel = React.useCallback(() => abortRef.current?.abort(), []);
  const dismiss = React.useCallback(() => setPending(null), []);

  return {
    pending,
    streaming: pending?.status === "streaming",
    sentImages,
    send,
    retry,
    cancel,
    dismiss,
  };
}
