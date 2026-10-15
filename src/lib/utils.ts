import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Ghép class Tailwind theo chuẩn shadcn (clsx + tailwind-merge).
 * Dùng cho mọi component trong `src/components/reusables/`.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
