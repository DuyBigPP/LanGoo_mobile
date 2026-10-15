import { api } from "@/api/client";
import { sessionCache } from "@/lib/session-cache";
import type { AuthTokensDto, LoginDto, RegisterDto, UserDto } from "@/types/api";

/** Đăng nhập email/mật khẩu — lưu user vào cache hiển thị. */
export async function login(dto: LoginDto): Promise<AuthTokensDto> {
  const { data } = await api.post<AuthTokensDto>("/v1/auth/login", dto);
  await sessionCache.setUser(data.user);
  return data;
}

/** Đăng ký tài khoản mới — lưu user vào cache hiển thị. */
export async function register(dto: RegisterDto): Promise<AuthTokensDto> {
  const { data } = await api.post<AuthTokensDto>("/v1/auth/register", dto);
  await sessionCache.setUser(data.user);
  return data;
}

/** Thông tin người dùng hiện tại (đồng bộ cache hiển thị). */
export async function fetchMe(): Promise<UserDto> {
  const { data } = await api.get<UserDto>("/v1/auth/me");
  await sessionCache.setUser(data);
  return data;
}
