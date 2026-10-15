import { formatDistanceToNow, format } from "date-fns";
import { enUS, vi } from "date-fns/locale";
import { getLocale } from "@/i18n";

/** Tiện ích định dạng số/ngày theo locale UI (vi mặc định, en dự phòng). */

export function formatNumber(value: number): string {
  try {
    return new Intl.NumberFormat(getLocale() === "en" ? "en-US" : "vi-VN").format(value);
  } catch {
    return String(value);
  }
}

export function formatRelativeTime(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), {
      addSuffix: true,
      locale: getLocale() === "en" ? enUS : vi,
    });
  } catch {
    return "";
  }
}

export function formatDateTime(iso: string): string {
  try {
    return format(new Date(iso), "dd/MM/yyyy HH:mm");
  } catch {
    return "";
  }
}

export function formatDate(iso: string): string {
  try {
    return format(new Date(iso), "dd/MM/yyyy");
  } catch {
    return "";
  }
}
