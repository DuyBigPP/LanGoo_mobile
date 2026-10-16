/**
 * UUID v7 (48 bit thời gian ms + ngẫu nhiên) cho các khoá idempotency như `client_review_id`.
 * Backend yêu cầu `format: uuid` (Swagger); Hermes không có `crypto.randomUUID`, mà khoá này
 * chỉ cần không trùng khi retry mạng nên dùng Math.random là đủ.
 */
export function uuidv7(): string {
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256);

  // 48 bit đầu = Unix ms (big-endian)
  let ms = Date.now();
  for (let i = 5; i >= 0; i -= 1) {
    bytes[i] = ms % 256;
    ms = Math.floor(ms / 256);
  }
  bytes[6] = 0x70 + (bytes[6] % 16); // version 7
  bytes[8] = 0x80 + (bytes[8] % 64); // variant RFC 4122

  const hex = Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
