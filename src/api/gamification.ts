import { api } from "@/api/client";

// ===== DTO chưa khai báo trong @/types/api — giữ tại đây (mirror web) =====

export interface AchievementItemDto {
  code: string;
  name_vi: string;
  description: string | null;
  icon: string | null;
  category: string;
  xp_reward: number;
  progress: number;
  unlocked_at: string | null;
  seen_at: string | null;
}

export interface AchievementListDto {
  data: AchievementItemDto[];
  unseen_count: number;
}

export interface MarkSeenResultDto {
  updated: number;
  unseen_count: number;
}

export async function fetchAchievements(): Promise<AchievementListDto> {
  const { data } = await api.get<AchievementListDto>("/v1/me/achievements");
  return data;
}

export async function markAchievementsSeen(codes?: string[]): Promise<MarkSeenResultDto> {
  const { data } = await api.post<MarkSeenResultDto>("/v1/me/achievements/seen", { codes });
  return data;
}
