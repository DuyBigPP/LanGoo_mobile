import { api } from "@/api/client";
import { sessionCache } from "@/lib/session-cache";
import type {
  CreateProfileDto,
  DeletedResponseDto,
  ProfileDto,
  ProfileListDto,
  SettingsDto,
  UpdateProfileDto,
  UpdateSettingsDto,
} from "@/types/api";

/** Danh sách hồ sơ — lưu ảnh chụp vào cache hiển thị. */
export async function fetchProfiles(): Promise<ProfileListDto> {
  const { data } = await api.get<ProfileListDto>("/v1/profiles");
  await sessionCache.setProfiles(data.data);
  return data;
}

export async function createProfile(dto: CreateProfileDto): Promise<ProfileDto> {
  const { data } = await api.post<ProfileDto>("/v1/profiles", dto);
  return data;
}

export async function updateProfile(id: string, dto: UpdateProfileDto): Promise<ProfileDto> {
  const { data } = await api.patch<ProfileDto>(`/v1/profiles/${id}`, dto);
  return data;
}

export async function deleteProfile(id: string): Promise<DeletedResponseDto> {
  const { data } = await api.delete<DeletedResponseDto>(`/v1/profiles/${id}`);
  return data;
}

export async function fetchSettings(): Promise<SettingsDto> {
  const { data } = await api.get<SettingsDto>("/v1/me/settings");
  return data;
}

export async function updateSettings(dto: UpdateSettingsDto): Promise<SettingsDto> {
  const { data } = await api.patch<SettingsDto>("/v1/me/settings", dto);
  return data;
}
