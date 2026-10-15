import { getJson, removeKey, setJson } from "@/lib/storage";
import type { ProfileDto, UserDto } from "@/types/api";

/**
 * Ảnh chụp phiên đăng nhập (user + hồ sơ) để UI hiện tức thì khi mở app.
 * Chỉ là cache hiển thị — mọi thao tác vẫn xác thực ngầm với máy chủ.
 * RN dùng AsyncStorage nên toàn bộ API đều bất đồng bộ.
 */

const USER_KEY = "langoo.cache.user.v1";
const PROFILES_KEY = "langoo.cache.profiles.v1";

export const sessionCache = {
  async getUser(): Promise<UserDto | null> {
    return getJson<UserDto>(USER_KEY);
  },

  async setUser(user: UserDto | null): Promise<void> {
    if (user) await setJson(USER_KEY, user);
    else await removeKey(USER_KEY);
  },

  async getProfiles(): Promise<ProfileDto[] | null> {
    return getJson<ProfileDto[]>(PROFILES_KEY);
  },

  async setProfiles(profiles: ProfileDto[]): Promise<void> {
    await setJson(PROFILES_KEY, profiles);
  },

  async clear(): Promise<void> {
    await Promise.all([removeKey(USER_KEY), removeKey(PROFILES_KEY)]);
  },
};
