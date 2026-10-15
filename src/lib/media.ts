import { launchImageLibrary } from "react-native-image-picker";

/** Chọn ảnh từ thư viện (chat: base64 data URL; góp ý: file multipart). */

export const CHAT_IMAGE_MAX_COUNT = 3;
export const CHAT_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const FEEDBACK_IMAGE_MAX_COUNT = 3;
export const FEEDBACK_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export type MediaError = "type" | "size" | "count" | "read";

export interface LocalImage {
  uri: string;
  name: string;
  type: string;
  size: number;
  /** Có khi pick với includeBase64: true (dùng cho chat data URL) */
  base64?: string;
}

export interface PickImagesResult {
  images: LocalImage[];
  errors: MediaError[];
}

interface PickOptions {
  /** Số ảnh còn được thêm (0 = hết chỗ) */
  remaining: number;
  maxBytes: number;
  includeBase64?: boolean;
}

function guessType(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

function guessName(uri: string, index: number): string {
  const parts = uri.split("/");
  return parts[parts.length - 1] || `image-${index + 1}.jpg`;
}

export async function pickImages(options: PickOptions): Promise<PickImagesResult> {
  const images: LocalImage[] = [];
  const errors: MediaError[] = [];

  if (options.remaining <= 0) {
    return { images, errors: ["count"] };
  }

  const result = await launchImageLibrary({
    mediaType: "photo",
    selectionLimit: options.remaining,
    includeBase64: Boolean(options.includeBase64),
  });

  if (result.didCancel || !result.assets) {
    return { images, errors };
  }

  result.assets.forEach((asset, index) => {
    if (!asset.uri) {
      errors.push("read");
      return;
    }
    const type = asset.type ?? guessType(asset.uri);
    if (!ALLOWED_TYPES.has(type)) {
      errors.push("type");
      return;
    }
    const size = asset.fileSize ?? 0;
    if (size > options.maxBytes) {
      errors.push("size");
      return;
    }
    images.push({
      uri: asset.uri,
      name: asset.fileName ?? guessName(asset.uri, index),
      type,
      size,
      base64: asset.base64 ?? undefined,
    });
  });

  return { images, errors };
}

/** Chat gửi ảnh dạng data URL base64 (backend không lưu ảnh). */
export function imageToDataUrl(image: LocalImage): string | null {
  if (!image.base64) return null;
  return `data:${image.type};base64,${image.base64}`;
}
