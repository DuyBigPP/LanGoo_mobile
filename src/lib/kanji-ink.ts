/**
 * Nhận dạng chữ Hán viết tay bằng model DaKanji (ONNX) — chạy hoàn toàn trên máy,
 * không gửi nét vẽ lên máy chủ.
 *
 * Bản React Native của `src/lib/kanji-ink.ts` bên web (User/SHADCN_BASE):
 * - Bỏ DOM/canvas: ảnh đầu vào được rasterize thuần JS vào `Float32Array(256×256)`.
 * - Bỏ WebAssembly: dùng `onnxruntime-react-native` (native module).
 * - Cùng tiền xử lý với web: **mực trắng trên nền đen**, canh giữa + pad 20px,
 *   nét dày `max(6, round(16 * scale))`, đầu/cuối nét bo tròn.
 */

import { Image } from "react-native";

/** Một điểm của nét vẽ (toạ độ px trong khung vẽ) */
export interface InkPoint {
  x: number;
  y: number;
}

/** Nét vẽ: danh sách điểm theo thứ tự vẽ (một nét = một lần nhấc bút) */
export type InkStroke = InkPoint[];

export interface KanjiCandidate {
  char: string;
  score: number;
}

/** Kích thước ảnh dựng lại cho model (model tự resize về 64×64 bên trong) */
const RENDER_SIZE = 256;
/** Lề quanh nét vẽ khi chuẩn hoá khung chữ */
const PADDING = 20;
/** Số gợi ý trả về */
const TOP_K = 12;
/** Giá trị mực trong ảnh xám — 255 = trắng (mực), 0 = đen (nền), đúng như web */
const INK_VALUE = 255;

// Model + bộ nhãn nằm trong assets/ để Metro bundle kèm app (xem metro.config.js).
const MODEL_ASSET: number = require("../../assets/models/dakanji/char_classifier.onnx");
const LABELS_ASSET: number = require("../../assets/models/dakanji/labels.txt");

type OrtModule = typeof import("onnxruntime-react-native");
type OrtSession = import("onnxruntime-react-native").InferenceSession;

interface Recognizer {
  session: OrtSession;
  labels: string[];
}

let recognizerPromise: Promise<Recognizer> | null = null;

/**
 * Nạp `onnxruntime-react-native` theo kiểu lazy: gói này cần native module,
 * nếu app chưa được build lại thì import ở đầu file sẽ làm crash cả bundle.
 * Vì vậy chỉ nạp khi thật sự dùng và bọc try/catch (giống cách `lib/tts.ts` làm).
 */
function loadOrt(): OrtModule {
  try {
    const module: OrtModule = require("onnxruntime-react-native");
    return module;
  } catch {
    throw new Error(
      "Chưa có native module nhận dạng nét vẽ — cần build lại app (Android: gradle, iOS: pod install).",
    );
  }
}

/**
 * Đọc một asset đã bundle kèm app thành ArrayBuffer.
 * `Image.resolveAssetSource` trả URL tuỳ nền tảng:
 * - dev: `http://<metro>/assets/...` (fetch được)
 * - iOS release: `file://...` (fetch được)
 * - Android release: tên resource trần (vd `assets_models_dakanji_char_classifier`) —
 *   `fetch` không hiểu dạng này, báo lỗi rõ ràng thay vì crash.
 */
async function loadAssetBuffer(asset: number, label: string): Promise<ArrayBuffer> {
  const uri = Image.resolveAssetSource(asset).uri;
  if (!uri.includes("://")) {
    throw new Error(`Không đọc được ${label} trong bản release Android.`);
  }
  const response = await fetch(uri);
  if (!response.ok) throw new Error(`Không tải được ${label}.`);
  return response.arrayBuffer();
}

/** Đọc bộ nhãn dạng text (native đã giải mã UTF-8 nên không cần TextDecoder). */
async function loadAssetText(asset: number, label: string): Promise<string> {
  const uri = Image.resolveAssetSource(asset).uri;
  if (!uri.includes("://")) {
    throw new Error(`Không đọc được ${label} trong bản release Android.`);
  }
  const response = await fetch(uri);
  if (!response.ok) throw new Error(`Không tải được ${label}.`);
  return response.text();
}

/**
 * Nạp model nhận dạng chữ viết tay (DaKanji — MIT, chạy hoàn toàn trên máy,
 * không gửi dữ liệu lên máy chủ). Chỉ nạp một lần cho cả phiên.
 */
export async function getKanjiRecognizer(): Promise<Recognizer> {
  if (!recognizerPromise) {
    recognizerPromise = (async () => {
      const ort = loadOrt();
      const [modelBuffer, labelsText] = await Promise.all([
        loadAssetBuffer(MODEL_ASSET, "model nhận dạng"),
        loadAssetText(LABELS_ASSET, "bộ nhãn chữ Hán"),
      ]);

      const session = await ort.InferenceSession.create(new Uint8Array(modelBuffer));
      // Nhãn là một chuỗi liền: chỉ số lớp -> ký tự (mỗi ký tự 1 nhãn)
      return { session, labels: Array.from(labelsText.trim()) };
    })().catch((error: unknown) => {
      // Lỗi thì cho phép thử lại ở lần gọi sau
      recognizerPromise = null;
      throw error;
    });
  }
  return recognizerPromise;
}

/**
 * Đóng dấu một hình tròn đặc (bán kính `radius`) vào ảnh xám.
 * Nhờ đóng dấu liên tiếp dọc theo đoạn thẳng, nét vẽ có đầu/cuối bo tròn và
 * các đoạn nối liền nhau — tương đương `lineCap/lineJoin = "round"` của web.
 */
function stampDisc(gray: Float32Array, cx: number, cy: number, radius: number): void {
  const r = Math.max(0, radius);
  const startY = Math.max(0, Math.floor(cy - r));
  const endY = Math.min(RENDER_SIZE - 1, Math.ceil(cy + r));
  const rSquared = r * r;

  for (let y = startY; y <= endY; y += 1) {
    const dy = y - cy;
    const inside = rSquared - dy * dy;
    if (inside < 0) continue;
    const half = Math.sqrt(inside);
    const startX = Math.max(0, Math.round(cx - half));
    const endX = Math.min(RENDER_SIZE - 1, Math.round(cx + half));
    if (endX < startX) continue;
    // Mực trắng (255) trên nền đen (0) — giống hệt bản web
    gray.fill(INK_VALUE, y * RENDER_SIZE + startX, y * RENDER_SIZE + endX + 1);
  }
}

/**
 * Vẽ lại nét bút thành ảnh xám 256×256, canh giữa và chuẩn hoá khung chữ.
 * Trả `null` khi chưa đủ dữ liệu để nhận dạng (dưới 2 điểm).
 */
function rasterizeInk(strokes: InkStroke[]): Float32Array | null {
  const points = strokes.flat();
  if (points.length < 2) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const point of points) {
    if (point.x < minX) minX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.x > maxX) maxX = point.x;
    if (point.y > maxY) maxY = point.y;
  }
  const inkWidth = Math.max(maxX - minX, 1);
  const inkHeight = Math.max(maxY - minY, 1);
  const box = RENDER_SIZE - PADDING * 2;
  const scale = Math.min(box / inkWidth, box / inkHeight);
  const offsetX = PADDING + (box - inkWidth * scale) / 2 - minX * scale;
  const offsetY = PADDING + (box - inkHeight * scale) / 2 - minY * scale;

  // Nền đen trước, rồi mới đóng dấu mực trắng lên trên
  const gray = new Float32Array(RENDER_SIZE * RENDER_SIZE);

  const lineWidth = Math.max(6, Math.round(16 * scale));
  const radius = lineWidth / 2;
  // Bước nhảy giữa hai lần đóng dấu: ≤ nửa bán kính là nét đã liền mạch.
  // Nhờ vậy chi phí rasterize bị chặn: số bước ~ 1/bán kính, số dòng ~ bán kính.
  const step = Math.max(1, radius * 0.5);

  for (const stroke of strokes) {
    if (stroke.length === 0) continue;

    if (stroke.length === 1) {
      const point = stroke[0];
      stampDisc(gray, offsetX + point.x * scale, offsetY + point.y * scale, radius);
      continue;
    }

    for (let index = 1; index < stroke.length; index += 1) {
      const from = stroke[index - 1];
      const to = stroke[index];
      const x0 = offsetX + from.x * scale;
      const y0 = offsetY + from.y * scale;
      const dx = offsetX + to.x * scale - x0;
      const dy = offsetY + to.y * scale - y0;
      if (dx === 0 && dy === 0) continue;
      const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / step));
      for (let s = 0; s <= steps; s += 1) {
        const t = s / steps;
        stampDisc(gray, x0 + dx * t, y0 + dy * t, radius);
      }
    }
  }

  return gray;
}

function softmax(values: Float32Array): Float32Array {
  const out = new Float32Array(values.length);
  let max = -Infinity;
  for (const value of values) if (value > max) max = value;
  let total = 0;
  for (let index = 0; index < values.length; index += 1) {
    const value = Math.exp(values[index] - max);
    out[index] = value;
    total += value;
  }
  if (total > 0) for (let index = 0; index < out.length; index += 1) out[index] /= total;
  return out;
}

/** Ép dữ liệu tensor về Float32Array (model trả float32; các kiểu khác chỉ là phòng hờ). */
function toFloat32(data: import("onnxruntime-react-native").Tensor.DataType): Float32Array {
  if (data instanceof Float32Array) return data;
  const out = new Float32Array(data.length);
  for (let index = 0; index < data.length; index += 1) {
    const value: number | bigint | string = data[index];
    out[index] = typeof value === "number" ? value : Number(value);
  }
  return out;
}

/** Nhận dạng chữ vừa vẽ, trả về danh sách gợi ý kèm độ tin cậy. */
export async function recognizeInk(strokes: InkStroke[]): Promise<KanjiCandidate[]> {
  const gray = rasterizeInk(strokes);
  if (!gray) return [];

  const { session, labels } = await getKanjiRecognizer();
  const ort = loadOrt();

  const input = new ort.Tensor("float32", gray, [1, 1, RENDER_SIZE, RENDER_SIZE]);
  const outputs = await session.run({ [session.inputNames[0]]: input });
  const output = outputs[session.outputNames[0]];
  if (!output) return [];

  let scores = toFloat32(output.data);
  if (scores.length === 0) return [];

  // Model trả xác suất; nếu tổng lệch xa 1 thì chuẩn hoá lại bằng softmax
  let sum = 0;
  for (const value of scores) sum += value;
  if (Math.abs(sum - 1) > 0.05) scores = softmax(scores);

  const ranked = Array.from(scores, (score, index) => ({ index, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_K);

  const seen = new Set<string>();
  const candidates: KanjiCandidate[] = [];
  for (const entry of ranked) {
    const char = labels[entry.index];
    if (!char || seen.has(char)) continue;
    seen.add(char);
    candidates.push({ char, score: entry.score });
  }
  return candidates;
}
