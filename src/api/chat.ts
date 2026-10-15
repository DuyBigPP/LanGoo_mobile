import { ApiError, api, getAccessTokenForFetch } from "@/api/client";
import { API_BASE_URL } from "@/config/env";
import { translate } from "@/i18n";
import { sseRequest, type SseHandle, type SseRawEvent } from "@/lib/sse";
import type {
  ChatMessageListDto,
  ChatSessionDto,
  ChatSessionListDto,
  ChatUsageDto,
  CreateChatSessionDto,
  SendChatMessageDto,
  SendChatMessageResultDto,
} from "@/types/api";

/** DTO cập nhật phiên chat (chưa khai báo trong @/types/api — giữ tại đây). */
export interface UpdateChatSessionDto {
  title?: string;
  scenario?: string;
}

export async function createChatSession(dto: CreateChatSessionDto): Promise<ChatSessionDto> {
  const { data } = await api.post<ChatSessionDto>("/v1/chat/sessions", dto);
  return data;
}

export async function fetchChatSessions(
  params: { limit?: number; cursor?: string | null } = {},
): Promise<ChatSessionListDto> {
  const { data } = await api.get<ChatSessionListDto>("/v1/chat/sessions", {
    params: { limit: params.limit ?? 20, cursor: params.cursor ?? undefined },
  });
  return data;
}

export async function fetchChatSession(id: string): Promise<ChatSessionDto> {
  const { data } = await api.get<ChatSessionDto>(`/v1/chat/sessions/${id}`);
  return data;
}

export async function updateChatSession(
  id: string,
  dto: UpdateChatSessionDto,
): Promise<ChatSessionDto> {
  const { data } = await api.patch<ChatSessionDto>(`/v1/chat/sessions/${id}`, dto);
  return data;
}

export async function archiveChatSession(id: string): Promise<unknown> {
  const { data } = await api.delete(`/v1/chat/sessions/${id}`);
  return data;
}

export async function fetchChatMessages(
  id: string,
  params: { limit?: number; cursor?: string | null } = {},
): Promise<ChatMessageListDto> {
  const { data } = await api.get<ChatMessageListDto>(`/v1/chat/sessions/${id}/messages`, {
    params: { limit: params.limit ?? 100, cursor: params.cursor ?? undefined },
  });
  return data;
}

export async function sendChatMessage(
  id: string,
  dto: SendChatMessageDto,
): Promise<SendChatMessageResultDto> {
  const { data } = await api.post<SendChatMessageResultDto>(
    `/v1/chat/sessions/${id}/messages`,
    dto,
  );
  return data;
}

export async function fetchChatUsage(): Promise<ChatUsageDto> {
  const { data } = await api.get<ChatUsageDto>("/v1/chat/usage");
  return data;
}

// ===== Streaming SSE (M10.1) =====

export type ChatStreamEvent =
  | { type: "start"; model: string }
  | { type: "delta"; content: string }
  | { type: "done"; response: SendChatMessageResultDto }
  | { type: "error"; code: string; message: string };

export interface StreamChatOptions {
  signal?: AbortSignal;
  onEvent?: (event: ChatStreamEvent) => void;
}

/** Chuyển 1 block SSE (đã tách sẵn tên + data) -> event; block lạ trả null. */
function toStreamEvent(raw: SseRawEvent): ChatStreamEvent | null {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw.data) as Record<string, unknown>;
  } catch {
    return null; // data hỏng -> bỏ qua để không vỡ phiên
  }

  switch (raw.name) {
    case "start":
      return { type: "start", model: String(data.model ?? "") };
    case "delta":
      return { type: "delta", content: String(data.content ?? "") };
    case "done":
      return { type: "done", response: data as unknown as SendChatMessageResultDto };
    case "error":
      return {
        type: "error",
        code: String(data.code ?? "UNKNOWN"),
        message: String(data.message ?? translate("errors.unknown")),
      };
    default:
      return null; // event lạ: bỏ qua
  }
}

interface StreamAttemptResult {
  status: number;
  body: string;
  done: SendChatMessageResultDto | null;
}

/** Phản hồi lỗi HTTP (>=400) -> ApiError, đọc body JSON của backend nếu có. */
function httpError(status: number, body: string): ApiError {
  let payload: { code?: string; message?: string; details?: unknown } | null = null;
  try {
    payload = JSON.parse(body) as { code?: string; message?: string; details?: unknown };
  } catch {
    payload = null;
  }
  return new ApiError(
    status,
    payload?.code ?? "HTTP_ERROR",
    payload?.message ?? `HTTP ${status}`,
    payload?.details,
  );
}

/** Chạy 1 lượt SSE qua XHR; tôn trọng options.signal (abort -> lỗi name "AbortError"). */
function runStream(
  url: string,
  dto: SendChatMessageDto,
  token: string,
  options: StreamChatOptions,
): Promise<StreamAttemptResult> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let handle: SseHandle | null = null;
    let done: SendChatMessageResultDto | null = null;

    const abortError = new Error("Aborted");
    abortError.name = "AbortError";

    const settle = (action: () => void) => {
      if (settled) return;
      settled = true;
      options.signal?.removeEventListener("abort", onAbort);
      action();
    };

    const onAbort = () => {
      settle(() => {
        handle?.abort();
        reject(abortError);
      });
    };

    if (options.signal?.aborted) {
      settle(() => reject(abortError));
      return;
    }
    options.signal?.addEventListener("abort", onAbort);

    handle = sseRequest({
      url,
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(dto),
      onEvent: (raw) => {
        if (settled) return;
        const event = toStreamEvent(raw);
        if (!event) return;
        if (event.type === "error") {
          // Lỗi giữa stream trên HTTP 200 -> hủy request rồi ném ApiError
          const error = new ApiError(200, event.code, event.message);
          settle(() => reject(error));
          handle?.abort();
          return;
        }
        options.onEvent?.(event);
        if (event.type === "done") done = event.response;
      },
      onFinish: (result) => {
        settle(() => resolve({ status: result.status, body: result.body, done }));
      },
      onNetworkError: (error) => {
        settle(() => {
          if (error.message === "TIMEOUT") {
            reject(new ApiError(0, "TIMEOUT", translate("errors.timeout")));
          } else {
            reject(new ApiError(0, "NETWORK_ERROR", translate("errors.network")));
          }
        });
      },
    });
  });
}

/**
 * Gửi tin nhắn và nhận trả lời dần qua SSE (XHR; không dùng EventSource vì cần
 * POST + Authorization). Trả về payload `done` đầy đủ.
 * - `onEvent` bắn ra từng `delta` để UI hiện chữ dần.
 * - Lỗi giữa stream là `event: error` trên HTTP 200 -> ném ApiError.
 * - Hủy qua `signal` (nút Dừng) -> ném lỗi có `name === "AbortError"`.
 */
export async function streamChatMessage(
  sessionId: string,
  dto: SendChatMessageDto,
  options: StreamChatOptions = {},
): Promise<SendChatMessageResultDto> {
  const url = `${API_BASE_URL}/v1/chat/sessions/${sessionId}/messages/stream`;

  const attempt = async (forceRefresh: boolean): Promise<StreamAttemptResult> => {
    const token = await getAccessTokenForFetch(forceRefresh);
    return runStream(url, dto, token, options);
  };

  let result = await attempt(false);
  if (result.status === 401) {
    // Token bị từ chối (dù metadata nói còn hạn) -> buộc refresh rồi thử lại 1 lần
    result = await attempt(true);
  }

  if (result.status >= 400) throw httpError(result.status, result.body);
  if (!result.done) throw new ApiError(0, "STREAM_INCOMPLETE", translate("errors.network"));
  return result.done;
}
