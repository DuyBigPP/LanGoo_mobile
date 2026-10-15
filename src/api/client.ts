import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL } from "@/config/env";
import { emitUnauthorized, tokenStore } from "@/lib/token-store";
import { translate } from "@/i18n";

/** Lỗi API chuẩn hoá: { status, code, message, details } */
export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static from(error: unknown): ApiError {
    if (error instanceof ApiError) return error;

    const axiosError = error as AxiosError<{ code?: string; message?: string; details?: unknown }>;
    if (axiosError?.response) {
      const data = axiosError.response.data;
      return new ApiError(
        axiosError.response.status,
        data?.code ?? "HTTP_ERROR",
        data?.message ?? translate("errors.generic"),
        data?.details,
      );
    }
    if (axiosError?.code === "ECONNABORTED") {
      return new ApiError(0, "TIMEOUT", translate("errors.timeout"));
    }
    if (axiosError?.request) {
      return new ApiError(0, "NETWORK_ERROR", translate("errors.network"));
    }
    return new ApiError(0, "UNKNOWN_ERROR", translate("errors.unknown"));
  }
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 45_000, // backend free-tier có thể cold start chậm
});

// ===== Refresh token (single-flight) =====

const AUTH_ENDPOINTS = ["/v1/auth/login", "/v1/auth/register", "/v1/auth/refresh"];
const REFRESH_MARGIN_MS = 90_000;

let refreshInFlight: Promise<string> | null = null;

async function refreshWith(refreshToken: string): Promise<string> {
  const { data } = await axios.post<{
    access_token: string;
    refresh_token: string;
    expires_in?: number;
  }>(`${API_BASE_URL}/v1/auth/refresh`, { refresh_token: refreshToken }, { timeout: 45_000 });
  tokenStore.set(data);
  return data.access_token;
}

async function refreshAccessToken(force = false): Promise<string> {
  if (!force) {
    const access = tokenStore.getAccess();
    const expiresAt = tokenStore.getExpiresAt();
    const valid =
      access !== null && (expiresAt === null || Date.now() < expiresAt - REFRESH_MARGIN_MS);
    if (valid) return access;
  }
  const refreshToken = tokenStore.getRefresh();
  if (!refreshToken) {
    throw new ApiError(401, "NO_REFRESH_TOKEN", translate("errors.notAuthed"));
  }
  if (!refreshInFlight) {
    refreshInFlight = refreshWith(refreshToken).finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

/** Token cho các chỗ dùng fetch/XHR (SSE chat) — không qua interceptor axios. */
export async function getAccessTokenForFetch(force = false): Promise<string> {
  return refreshAccessToken(force);
}

// ===== Interceptors =====

api.interceptors.request.use(async config => {
  const url = config.url ?? "";
  const isAuthEndpoint = AUTH_ENDPOINTS.some(path => url.includes(path));

  if (!isAuthEndpoint) {
    const access = tokenStore.getAccess();
    const expiresAt = tokenStore.getExpiresAt();
    const needsRefresh =
      Boolean(tokenStore.getRefresh()) &&
      (!access || (expiresAt !== null && Date.now() >= expiresAt - REFRESH_MARGIN_MS));
    if (needsRefresh) {
      try {
        const fresh = await refreshAccessToken();
        config.headers.set("Authorization", `Bearer ${fresh}`);
        return config;
      } catch {
        // để request đi tiếp — interceptor response xử lý 401
      }
    }
  }

  const token = tokenStore.getAccess();
  if (token) config.headers.set("Authorization", `Bearer ${token}`);
  return config;
});

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

api.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;
    const status = error.response?.status;
    const url = config?.url ?? "";
    const isAuthEndpoint = AUTH_ENDPOINTS.some(path => url.includes(path));

    if (status === 401 && config && !config._retry && !isAuthEndpoint) {
      config._retry = true;
      try {
        const accessToken = await refreshAccessToken(true);
        config.headers.set("Authorization", `Bearer ${accessToken}`);
        return api.request(config);
      } catch {
        tokenStore.clear();
        emitUnauthorized();
        return Promise.reject(ApiError.from(error));
      }
    }

    return Promise.reject(ApiError.from(error));
  },
);

/** Thu hồi phiên ở máy chủ (best-effort) */
export async function revokeSession(access: string | null): Promise<void> {
  if (!access) return;
  try {
    await axios.post(
      `${API_BASE_URL}/v1/auth/logout`,
      undefined,
      { timeout: 15_000, headers: { Authorization: `Bearer ${access}` } },
    );
  } catch {
    // token có thể đã hết hạn — bỏ qua
  }
}
