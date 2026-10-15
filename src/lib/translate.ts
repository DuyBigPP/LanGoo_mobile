/**
 * Dịch văn bản 100% phía client (không cần backend, không cần API key).
 *
 * Chuỗi engine (bản RN bỏ engine on-device của Chrome):
 * 1. Google gtx endpoint (không chính thức) — phủ tốt EN/JA/VI, chạy trên mobile.
 * 2. clients5.google.com — biến thể dự phòng.
 * 3. MyMemory — dự phòng cuối (đáng tin với EN↔VI).
 *
 * Kết quả cache trong AsyncStorage để đỡ gọi lại.
 */

import { getJson, removeKey, setJson } from "./storage";

export type TranslateLang = "en" | "ja" | "vi";
export type TranslateSource = TranslateLang | "auto";
export type TranslateEngine = "google" | "clients5" | "mymemory";

export interface TranslateResult {
  text: string;
  engine: TranslateEngine;
  /** Ngôn ngữ nguồn nhận diện được (khi chọn "auto") */
  detected: TranslateLang | null;
  cached?: boolean;
}

export const TRANSLATE_LANGS: TranslateLang[] = ["en", "ja", "vi"];

// ===== Cache AsyncStorage =====

const CACHE_KEY = "langoo.translate.cache.v1";
const CACHE_LIMIT = 300;

interface CacheEntry {
  text: string;
  engine: TranslateEngine;
  detected: TranslateLang | null;
  ts: number;
}

type CacheMap = Record<string, CacheEntry>;

let memoryCache: CacheMap | null = null;

async function readCache(): Promise<CacheMap> {
  if (memoryCache) return memoryCache;
  memoryCache = (await getJson<CacheMap>(CACHE_KEY)) ?? {};
  return memoryCache;
}

function persistCache(): void {
  if (memoryCache) void setJson(CACHE_KEY, memoryCache);
}

/** djb2 — đủ tốt để làm khoá cache */
function hash(input: string): string {
  let value = 5381;
  for (let index = 0; index < input.length; index += 1) {
    value = (value * 33) ^ input.charCodeAt(index);
  }
  return (value >>> 0).toString(36);
}

function cacheKey(text: string, from: TranslateSource, to: TranslateLang): string {
  return `${from}|${to}|${hash(text)}`;
}

async function getCached(
  text: string,
  from: TranslateSource,
  to: TranslateLang,
): Promise<TranslateResult | null> {
  const map = await readCache();
  const entry = map[cacheKey(text, from, to)];
  if (!entry) return null;
  return { text: entry.text, engine: entry.engine, detected: entry.detected, cached: true };
}

async function saveCache(
  text: string,
  from: TranslateSource,
  to: TranslateLang,
  result: TranslateResult,
): Promise<void> {
  const map = await readCache();
  map[cacheKey(text, from, to)] = {
    text: result.text,
    engine: result.engine,
    detected: result.detected,
    ts: Date.now(),
  };
  const entries = Object.entries(map);
  if (entries.length > CACHE_LIMIT) {
    entries
      .sort(([, a], [, b]) => a.ts - b.ts)
      .slice(0, entries.length - CACHE_LIMIT)
      .forEach(([key]) => delete map[key]);
  }
  persistCache();
}

export function clearTranslateCache(): void {
  memoryCache = {};
  void removeKey(CACHE_KEY);
}

// ===== 1. Google gtx =====

async function translateGoogle(
  text: string,
  from: TranslateSource,
  to: TranslateLang,
): Promise<TranslateResult | null> {
  try {
    const url =
      "https://translate.googleapis.com/translate_a/single" +
      `?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = (await response.json()) as unknown;
    if (!Array.isArray(data) || !Array.isArray(data[0])) return null;
    const translated = (data[0] as unknown[])
      .map(segment => (Array.isArray(segment) ? String(segment[0] ?? "") : ""))
      .join("");
    if (!translated) return null;
    const detectedCode = typeof data[2] === "string" ? data[2] : null;
    const detected =
      detectedCode === "en" || detectedCode === "ja" || detectedCode === "vi"
        ? detectedCode
        : null;
    return { text: translated, engine: "google", detected };
  } catch {
    return null;
  }
}

// ===== 2. clients5.google.com =====

function parseClients5(data: unknown): { text: string; detected: string | null } | null {
  if (!Array.isArray(data) || data.length === 0) return null;
  const first = data[0];
  if (typeof first === "string") {
    const text = data.filter((item): item is string => typeof item === "string").join(" ").trim();
    return text ? { text, detected: null } : null;
  }
  if (Array.isArray(first)) {
    const text = data
      .map(chunk => (Array.isArray(chunk) && typeof chunk[0] === "string" ? chunk[0] : ""))
      .join(" ")
      .trim();
    const detected = typeof first[1] === "string" ? first[1] : null;
    return text ? { text, detected } : null;
  }
  return null;
}

async function translateClients5(
  text: string,
  from: TranslateSource,
  to: TranslateLang,
): Promise<TranslateResult | null> {
  try {
    const url =
      "https://clients5.google.com/translate_a/t" +
      `?client=dict-chrome-ex&sl=${from}&tl=${to}&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const parsed = parseClients5((await response.json()) as unknown);
    if (!parsed) return null;
    const detected =
      parsed.detected === "en" || parsed.detected === "ja" || parsed.detected === "vi"
        ? parsed.detected
        : null;
    return { text: parsed.text, engine: "clients5", detected };
  } catch {
    return null;
  }
}

// ===== 3. MyMemory =====

/** Đoán ngôn ngữ nguồn khi đang ở chế độ auto (MyMemory không hỗ trợ auto) */
function inferSource(text: string): "en" | "ja" | null {
  if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(text)) return "ja";
  if (/[a-zA-Z]/.test(text)) return "en";
  return null;
}

async function translateMyMemory(
  text: string,
  from: TranslateSource,
  to: TranslateLang,
): Promise<TranslateResult | null> {
  const source = from === "auto" ? inferSource(text) : from;
  if (!source || source === to) return null;
  try {
    const url =
      "https://api.mymemory.translated.net/get" +
      `?q=${encodeURIComponent(text)}&langpair=${source}|${to}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = (await response.json()) as {
      responseData?: { translatedText?: unknown };
    };
    const translated = data.responseData?.translatedText;
    if (typeof translated !== "string" || !translated) return null;
    if (/no query specified|invalid|quota/i.test(translated)) return null;
    return { text: translated, engine: "mymemory", detected: source };
  } catch {
    return null;
  }
}

// ===== API chính =====

export async function translateText(
  text: string,
  from: TranslateSource,
  to: TranslateLang,
): Promise<TranslateResult> {
  const trimmed = text.trim();
  if (!trimmed) return { text: "", engine: "google", detected: null };

  const cached = await getCached(trimmed, from, to);
  if (cached) return cached;

  const result =
    (await translateGoogle(trimmed, from, to)) ??
    (await translateClients5(trimmed, from, to)) ??
    (await translateMyMemory(trimmed, from, to));

  if (!result) throw new Error("TRANSLATE_FAILED");
  await saveCache(trimmed, from, to, result);
  return result;
}
