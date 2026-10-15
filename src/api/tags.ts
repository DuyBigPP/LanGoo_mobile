import { api } from "@/api/client";
import type { DeletedResponseDto, TagDto } from "@/types/api";

// ===== DTO chưa khai báo trong @/types/api — giữ tại đây (mirror web) =====

export interface TagListResponseDto {
  data: TagDto[];
  next_cursor: string | null;
}

export interface CreateTagDto {
  name: string;
  color?: string;
}

export async function fetchTags(): Promise<TagListResponseDto> {
  const { data } = await api.get<TagListResponseDto>("/v1/tags");
  return data;
}

export async function createTag(dto: CreateTagDto): Promise<TagDto> {
  const { data } = await api.post<TagDto>("/v1/tags", dto);
  return data;
}

export async function deleteTag(id: string): Promise<DeletedResponseDto> {
  const { data } = await api.delete<DeletedResponseDto>(`/v1/tags/${id}`);
  return data;
}
