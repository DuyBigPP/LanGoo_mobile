import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import * as authApi from "@/api/auth";
import { revokeSession } from "@/api/client";
import { APP_VERSION } from "@/config/env";
import { sessionCache } from "@/lib/session-cache";
import { subscribeUnauthorized, tokenStore } from "@/lib/token-store";
import type { LoginDto, RegisterDto, UserDto } from "@/types/api";

export type AuthStatus = "loading" | "authenticated" | "guest";

interface AuthContextValue {
  status: AuthStatus;
  user: UserDto | null;
  login: (input: Omit<LoginDto, "device">) => Promise<void>;
  register: (input: Omit<RegisterDto, "device">) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const device = {
  platform: Platform.OS === "ios" ? ("ios" as const) : ("android" as const),
  app_version: APP_VERSION,
};

/**
 * Phiên đăng nhập: khôi phục từ refresh token khi mở app,
 * hiện user từ cache trước rồi xác thực ngầm với /auth/me.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<UserDto | null>(null);
  // Giữ status mới nhất cho handler 401 (đăng ký 1 lần, không đọc được state cũ)
  const statusRef = useRef(status);
  statusRef.current = status;

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      await tokenStore.hydrate();
      if (!tokenStore.hasSession()) {
        void sessionCache.clear();
        if (!cancelled) setStatus("guest");
        return;
      }

      const cachedUser = await sessionCache.getUser();
      if (cachedUser && !cancelled) {
        setUser(cachedUser);
        setStatus("authenticated");
      }

      try {
        const me = await authApi.fetchMe();
        if (!cancelled) {
          setUser(me);
          setStatus("authenticated");
        }
      } catch {
        // Phiên chết hẳn -> về guest; còn cache thì giữ UI, sự kiện 401 sẽ xử lý sau
        if (!cancelled && !cachedUser) {
          tokenStore.clear();
          void sessionCache.clear();
          setUser(null);
          setStatus("guest");
        }
      }
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  // Phiên hết hạn hoàn toàn (refresh token chết) -> về guest
  useEffect(
    () =>
      subscribeUnauthorized(() => {
        void sessionCache.clear();
        // Chỉ xoá cache khi đang là phiên đăng nhập — guest dính 401 không được làm mất cache từ điển công khai
        if (statusRef.current === "authenticated") queryClient.clear();
        setUser(null);
        setStatus("guest");
      }),
    [queryClient],
  );

  const login = useCallback(async (input: Omit<LoginDto, "device">) => {
    const result = await authApi.login({ ...input, device });
    tokenStore.set(result);
    setUser(result.user);
    setStatus("authenticated");
  }, []);

  const register = useCallback(async (input: Omit<RegisterDto, "device">) => {
    const result = await authApi.register({ ...input, device });
    tokenStore.set(result);
    setUser(result.user);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(async () => {
    const access = tokenStore.getAccess();
    // Xoá phiên phía client trước (luôn thành công), thu hồi máy chủ là best-effort
    tokenStore.clear();
    void sessionCache.clear();
    queryClient.clear();
    setUser(null);
    setStatus("guest");
    void revokeSession(access);
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, login, register, logout }),
    [status, user, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth phải dùng trong <AuthProvider>");
  return context;
}

/**
 * Chặn hành động cần đăng nhập: guest -> mở modal Login, đã đăng nhập -> chạy `fn`.
 * Guest không bao giờ chạm tới API cần token (tránh 401).
 */
export function useRequireAuth(): (fn: () => void) => void {
  const { status } = useAuth();
  const navigation = useNavigation();
  return useCallback(
    (fn: () => void) => {
      if (status === "authenticated") fn();
      else navigation.navigate("Login");
    },
    [status, navigation],
  );
}
