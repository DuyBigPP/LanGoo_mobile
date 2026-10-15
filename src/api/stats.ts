import { api } from "@/api/client";
import type { MeStatsDto } from "@/types/api";

/** Thống kê tổng hợp của tôi (streak, số thẻ, số lượt ôn...). */
export async function fetchMeStats(): Promise<MeStatsDto> {
  const { data } = await api.get<MeStatsDto>("/v1/me/stats");
  return data;
}
