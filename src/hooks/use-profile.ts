import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createProfile,
  deleteProfile,
  fetchProfiles,
  fetchSettings,
  updateProfile,
  updateSettings,
} from "@/api/profile";
import { useAuth } from "@/contexts/AuthContext";
import type { ProfileDto } from "@/types/api";

export const queryKeys = {
  profiles: ["profiles"] as const,
  settings: ["settings"] as const,
  collections: ["collections"] as const,
};

/**
 * Danh sách hồ sơ — RN không có ảnh chụp đồng bộ từ AsyncStorage nên không dùng
 * initialData; UI tự đọc sessionCache khi cần hiện tức thì.
 */
export function useProfilesQuery(enabled = true) {
  // Endpoint cần đăng nhập — guest không bao giờ gọi
  const authenticated = useAuth().status === "authenticated";
  return useQuery({
    queryKey: queryKeys.profiles,
    queryFn: fetchProfiles,
    enabled: enabled && authenticated,
    staleTime: 30_000,
  });
}

export function useSettingsQuery(enabled = true) {
  const authenticated = useAuth().status === "authenticated";
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: fetchSettings,
    enabled: enabled && authenticated,
    staleTime: 60_000,
  });
}

export function useCreateProfileMutation() {
  // Không tự cập nhật cache — nơi gọi chủ động chốt cache sau khi hoàn tất toàn bộ
  // luồng (onboarding tạo hồ sơ + settings) để guard không nhảy giữa chừng.
  return useMutation({ mutationFn: createProfile });
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; patch: Parameters<typeof updateProfile>[1] }) =>
      updateProfile(input.id, input.patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.profiles });
      void queryClient.invalidateQueries({ queryKey: queryKeys.settings });
    },
  });
}

export function useDeleteProfileMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteProfile,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.profiles });
    },
  });
}

export function useUpdateSettingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateSettings,
    onSuccess: (settings) => {
      queryClient.setQueryData(queryKeys.settings, settings);
    },
  });
}

export interface ActiveProfile {
  profile: ProfileDto | null;
  profileId: string | null;
}

/**
 * Hồ sơ đang học: settings.active_profile_id → hồ sơ mặc định → hồ sơ đầu tiên.
 */
export function useActiveProfile(): ActiveProfile {
  const profiles = useProfilesQuery();
  const settings = useSettingsQuery();
  const list = profiles.data?.data ?? [];
  const activeId = settings.data?.active_profile_id ?? null;
  const active =
    list.find((profile) => profile.id === activeId) ??
    list.find((profile) => profile.is_default) ??
    list[0] ??
    null;

  return React.useMemo(() => ({ profile: active, profileId: active?.id ?? null }), [active]);
}

/** Các gốc cache phải bỏ khi đổi hồ sơ — tránh hiện dữ liệu của hồ sơ trước. */
const SCOPE_ROOTS = [
  "dictionary",
  "collections",
  "srs",
  "srs-stats",
  "me-stats",
  "session",
  "sessions",
  "quizzes",
  "achievements",
] as const;

/**
 * Đổi hồ sơ -> bỏ cache theo scope cũ (kết quả tra, hàng đợi SRS, sổ tay, quiz,
 * stats...) rồi làm mới profiles + settings. Bỏ qua lần chạy đầu tiên.
 */
export function useScopeReset() {
  const queryClient = useQueryClient();
  const { profileId } = useActiveProfile();
  const previousId = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!profileId) return;
    const previous = previousId.current;
    previousId.current = profileId;
    if (!previous || previous === profileId) return;

    for (const root of SCOPE_ROOTS) {
      void queryClient.removeQueries({ queryKey: [root] });
    }
    void queryClient.invalidateQueries({ queryKey: queryKeys.profiles });
    void queryClient.invalidateQueries({ queryKey: queryKeys.settings });
  }, [profileId, queryClient]);
}
