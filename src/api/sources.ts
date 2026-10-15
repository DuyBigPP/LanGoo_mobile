import { api } from "@/api/client";
import type { SourceListResponseDto } from "@/types/api";

/** Danh sách nguồn dữ liệu từ điển (license/attribution/usage) — công khai. */
export async function fetchSources(): Promise<SourceListResponseDto> {
  const { data } = await api.get<SourceListResponseDto>("/v1/sources");
  return data;
}
