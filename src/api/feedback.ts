import { api } from "@/api/client";
import type { CreateFeedbackDto, FeedbackDto, MyFeedbackListDto } from "@/types/api";

const MAX_FILES = 3;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const FEEDBACK_FILE_RULES = { MAX_FILES, MAX_FILE_BYTES, ACCEPTED_TYPES };

/** Gửi góp ý (text + tối đa 3 ảnh ≤5MB, JPEG/PNG/WebP). */
export async function createFeedback(dto: CreateFeedbackDto): Promise<FeedbackDto> {
  const form = new FormData();
  form.append("category", dto.category);
  form.append("content", dto.content);
  for (const file of (dto.files ?? []).slice(0, MAX_FILES)) {
    // RN FormData nhận trực tiếp { uri, name, type } — KHÔNG set Content-Type thủ công
    form.append("files", file);
  }
  const { data } = await api.post<FeedbackDto>("/v1/feedback", form);
  return data;
}

/** Góp ý của tôi (kèm trạng thái + ghi chú admin), phân trang bằng cursor. */
export async function fetchMyFeedback(
  params: { limit?: number; cursor?: string | null } = {},
): Promise<MyFeedbackListDto> {
  const { data } = await api.get<MyFeedbackListDto>("/v1/me/feedback", {
    params: { limit: params.limit ?? 20, cursor: params.cursor ?? undefined },
  });
  return data;
}
