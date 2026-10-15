import { getString, removeKey, setString } from "./storage";

/**
 * Quản lý token phiên (RN):
 * - access token giữ trong RAM (mất khi tắt app);
 * - refresh token trong AsyncStorage để khôi phục phiên khi mở lại;
 * - `hydrate()` gọi 1 lần lúc boot để nạp refresh token vào RAM.
 */

const REFRESH_KEY = "langoo.refresh_token";

let accessToken: string | null = null;
let expiresAt: number | null = null;
let refreshToken: string | null = null;
let hydrated = false;

type Listener = () => void;
const unauthorizedListeners = new Set<Listener>();

export function subscribeUnauthorized(listener: Listener): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

export function emitUnauthorized(): void {
  unauthorizedListeners.forEach(listener => listener());
}

export const tokenStore = {
  /** Nạp refresh token từ AsyncStorage (idempotent). */
  async hydrate(): Promise<void> {
    if (hydrated) return;
    refreshToken = await getString(REFRESH_KEY);
    hydrated = true;
  },

  getAccess(): string | null {
    return accessToken;
  },

  getExpiresAt(): number | null {
    return expiresAt;
  },

  getRefresh(): string | null {
    return refreshToken;
  },

  hasSession(): boolean {
    return Boolean(accessToken || refreshToken);
  },

  set(tokens: { access_token: string; refresh_token: string; expires_in?: number }): void {
    accessToken = tokens.access_token;
    expiresAt =
      typeof tokens.expires_in === "number" && tokens.expires_in > 0
        ? Date.now() + tokens.expires_in * 1000
        : null;
    refreshToken = tokens.refresh_token;
    void setString(REFRESH_KEY, tokens.refresh_token);
  },

  clear(): void {
    accessToken = null;
    expiresAt = null;
    refreshToken = null;
    void removeKey(REFRESH_KEY);
  },
};
