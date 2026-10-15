import { api } from "@/api/client";
import type { CreateReviewDto, DueResultDto, ReviewResultDto, SrsStatsDto } from "@/types/api";

export async function fetchSrsStats(): Promise<SrsStatsDto> {
  const { data } = await api.get<SrsStatsDto>("/v1/srs/stats");
  return data;
}

export interface FetchDueParams {
  limit?: number;
  collection_id?: string;
  /** Cursor nối trang hàng đợi (snapshot chưa bị review thay đổi) */
  cursor?: string | null;
}

/** Hàng đợi ôn hôm nay (kèm đáp án — dùng cho chế độ Flashcard lật thẻ). */
export async function fetchDue(params: FetchDueParams = {}): Promise<DueResultDto> {
  const { data } = await api.get<DueResultDto>("/v1/srs/due", {
    params: {
      limit: params.limit ?? 20,
      collection_id: params.collection_id ?? undefined,
      cursor: params.cursor ?? undefined,
    },
  });
  return data;
}

export async function postReview(dto: CreateReviewDto): Promise<ReviewResultDto> {
  const { data } = await api.post<ReviewResultDto>("/v1/srs/reviews", dto);
  return data;
}
