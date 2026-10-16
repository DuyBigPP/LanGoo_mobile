/**
 * Furigana chạy 100% trên máy bằng kuromoji (port từ web `lib/furigana.ts`):
 * - Tách câu tiếng Nhật thành từ kèm cách đọc (katakana), căn okurigana
 * - Trả về các đoạn { text, ruby? } để `FuriganaText` vẽ chữ nhỏ trên đầu chữ Hán
 *
 * Khác web: RN không có fetch file cục bộ → từ điển (~17MB .gz) nằm trong assets của Android
 * (`android/app/src/main/assets/kuromoji-dict`, chép bằng `scripts/copy-kuromoji-dict.js`) và được
 * đọc bằng react-native-fs. Chỉ nạp khi thực sự cần furigana; đọc tuần tự để hạn chế đỉnh bộ nhớ.
 */
import { toByteArray } from "base64-js";
import { gunzipSync } from "fflate";
import { Platform } from "react-native";
import RNFS from "react-native-fs";
import type { IpadicFeatures, Tokenizer } from "@sglkc/kuromoji";

// Module sâu của kuromoji: dựng loader riêng thay cho Node/BrowserDictionaryLoader (cần fs/fetch)
const DictionaryLoader = require("@sglkc/kuromoji/src/loader/DictionaryLoader");
const KuromojiTokenizer = require("@sglkc/kuromoji/src/Tokenizer");

const KANJI_RE = /[㐀-䶿一-鿿豈-﫿]/;
const DICT_ASSET_DIR = "kuromoji-dict";

export interface FuriganaSegment {
  text: string;
  ruby?: string;
}

export function hasKanji(text: string): boolean {
  return KANJI_RE.test(text);
}

/** Khối đọc mỗi lần (bội số của 3 để mỗi khối base64 giải mã độc lập). */
const READ_CHUNK = 3 * 1024 * 1024;

/**
 * Đọc nguyên một file asset thành Uint8Array mà KHÔNG nạp cả file qua cầu nối base64
 * (file lớn nhất ~41MB → chuỗi base64 ~56MB làm tràn heap Java ~100MB):
 * copy asset ra thư mục cache bằng luồng native rồi đọc từng khối `READ_CHUNK`.
 */
async function readAssetBytes(assetName: string): Promise<Uint8Array> {
  const dir = `${RNFS.CachesDirectoryPath}/${DICT_ASSET_DIR}`;
  const dest = `${dir}/${assetName}`;
  if (!(await RNFS.exists(dest))) {
    await RNFS.mkdir(dir);
    await RNFS.copyFileAssets(`${DICT_ASSET_DIR}/${assetName}`, dest);
  }
  const size = Number((await RNFS.stat(dest)).size);
  const bytes = new Uint8Array(size);
  for (let position = 0; position < size; position += READ_CHUNK) {
    const length = Math.min(READ_CHUNK, size - position);
    const chunk = toByteArray(await RNFS.read(dest, length, position, "base64"));
    bytes.set(chunk, position);
  }
  return bytes;
}

/**
 * Android Gradle tự giải nén asset `.gz` và BỎ đuôi `.gz` (APK chứa `base.dat`, không phải `base.dat.gz`),
 * nên thử tên đã bỏ đuôi trước (dữ liệu thô); không thấy thì mới đọc `.gz` và tự giải nén.
 */
async function readDictAsset(file: string): Promise<Uint8Array> {
  try {
    return await readAssetBytes(file.replace(/\.gz$/, ""));
  } catch {
    return gunzipSync(await readAssetBytes(file));
  }
}

/** Đọc tuần tự từng file từ điển trong assets (loader gốc gọi song song cả 12 file). */
let readQueue: Promise<unknown> = Promise.resolve();
/** Báo lỗi ra promise đang dựng tokenizer (nếu có). */
let failBuild: (error: unknown) => void = () => {};

function loadArrayBuffer(
  url: string,
  callback: (error: unknown, buffer: ArrayBuffer | null) => void,
) {
  const file = url.split("/").pop() ?? url;
  readQueue = readQueue.then(async () => {
    let raw: Uint8Array;
    try {
      raw = await readDictAsset(file);
    } catch (error) {
      callback(error, null);
      return;
    }
    try {
      callback(null, raw.buffer as ArrayBuffer);
    } catch (error) {
      // kuromoji xử lý dữ liệu ngay trong callback: lỗi ở đây phải báo ra, không để treo "đang tải"
      failBuild(error);
    }
  });
}

function AssetDictionaryLoader(this: unknown, dicPath: string) {
  DictionaryLoader.call(this, dicPath);
}
AssetDictionaryLoader.prototype = Object.create(DictionaryLoader.prototype);
AssetDictionaryLoader.prototype.loadArrayBuffer = loadArrayBuffer;

let tokenizerPromise: Promise<Tokenizer<IpadicFeatures>> | null = null;

function getTokenizer(): Promise<Tokenizer<IpadicFeatures>> {
  if (!tokenizerPromise) {
    tokenizerPromise = new Promise<Tokenizer<IpadicFeatures>>((resolve, reject) => {
      failBuild = reject;
      if (Platform.OS !== "android") {
        reject(new Error("Furigana hiện chỉ hỗ trợ Android"));
        return;
      }
      const loader = new (AssetDictionaryLoader as unknown as new (path: string) => {
        load: (cb: (error: unknown, dic: unknown) => void) => void;
      })(DICT_ASSET_DIR);
      loader.load((error, dic) => {
        if (error) {
          reject(error);
          return;
        }
        try {
          resolve(new KuromojiTokenizer(dic) as Tokenizer<IpadicFeatures>);
        } catch (buildError) {
          reject(buildError);
        }
      });
    });
    tokenizerPromise.catch(() => {
      // Cho phép thử lại lần sau nếu nạp từ điển lỗi
      tokenizerPromise = null;
    });
  }
  return tokenizerPromise;
}

function katakanaToHiragana(input: string): string {
  return input.replace(/[ァ-ヶ]/g, char => String.fromCharCode(char.charCodeAt(0) - 0x60));
}

interface SurfacePart {
  text: string;
  isKanji: boolean;
}

function splitSurface(surface: string): SurfacePart[] {
  const parts: SurfacePart[] = [];
  for (const char of surface) {
    const isKanji = KANJI_RE.test(char);
    const last = parts[parts.length - 1];
    if (last && last.isKanji === isKanji) last.text += char;
    else parts.push({ text: char, isKanji });
  }
  return parts;
}

/** Căn reading vào từng khối kanji dựa trên các đoạn kana trong surface. */
function alignReading(surface: string, reading: string): FuriganaSegment[] {
  const parts = splitSurface(surface);
  const segments: FuriganaSegment[] = [];
  let cursor = 0;

  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];

    if (!part.isKanji) {
      // Kana trong surface phải khớp reading tại vị trí hiện tại
      if (reading.startsWith(part.text, cursor)) {
        cursor += part.text.length;
      } else {
        const found = reading.indexOf(part.text, cursor);
        if (found >= cursor) cursor = found + part.text.length;
      }
      segments.push({ text: part.text });
      continue;
    }

    // Khối kanji: reading kéo dài tới trước khối kana kế tiếp
    const next = parts[index + 1];
    let end = reading.length;
    if (next && !next.isKanji) {
      const found = reading.indexOf(next.text, cursor);
      if (found >= cursor) end = found;
    }
    const ruby = reading.slice(cursor, end);
    cursor = end;
    segments.push({ text: part.text, ruby: ruby || undefined });
  }

  return segments;
}

function segmentsForToken(token: IpadicFeatures): FuriganaSegment[] {
  const surface = token.surface_form;
  const reading = token.reading;
  if (!surface) return [];
  if (!reading || reading === "*" || !hasKanji(surface)) return [{ text: surface }];
  return alignReading(surface, katakanaToHiragana(reading));
}

export async function toFurigana(text: string): Promise<FuriganaSegment[]> {
  const tokenizer = await getTokenizer();
  return tokenizer.tokenize(text).flatMap(segmentsForToken);
}
