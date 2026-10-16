/**
 * Theo dõi kết nối mạng (@react-native-community/netinfo).
 * Module native có thể chưa link — nạp lazy và degrade thành "luôn online".
 */

interface NetInfoModule {
  addEventListener: (
    listener: (state: { isConnected: boolean | null }) => void,
  ) => () => void;
}

let netInfo: NetInfoModule | null = null;
try {
  const module = require("@react-native-community/netinfo");
  netInfo = (module?.default ?? module ?? null) as NetInfoModule | null;
} catch {
  netInfo = null;
}

/** Gọi `onChange(online)` mỗi khi đổi trạng thái; `isConnected === null` coi là online. Trả hàm huỷ. */
export function subscribeConnectivity(onChange: (online: boolean) => void): () => void {
  if (!netInfo) return () => {};
  try {
    return netInfo.addEventListener((s) => onChange(s.isConnected !== false));
  } catch {
    return () => {};
  }
}
