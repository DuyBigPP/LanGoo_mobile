/**
 * Tải + phân tích SVG thứ tự nét (KanjiVG từ backend) cho app React Native.
 *
 * Bản web (`User/SHADCN_BASE/src/lib/kanji-svg.ts` + `hooks/use-kanji-svg.ts`)
 * dùng DOMParser và `getTotalLength()`; RN không có DOM nên ở đây:
 * - trích `d` của từng nét bằng regex (bỏ qua phần không phải nét),
 * - ước lượng độ dài path để animate kiểu `strokeDasharray`/`strokeDashoffset`.
 */

import { API_BASE_URL } from "@/config/env";

/** Một chữ Hán sau khi tách nét. */
export interface KanjiStrokeSvg {
  /** viewBox gốc của SVG (KanjiVG: "0 0 109 109"). */
  viewBox: string;
  /** Chuỗi `d` của từng nét, đúng thứ tự vẽ. */
  paths: string[];
}

/** viewBox mặc định khi SVG không ghi (mọi chữ KanjiVG đều 109×109). */
const DEFAULT_VIEW_BOX = "0 0 109 109";
/** id nét KanjiVG: "kvg:XXXX-sN" — N là số thứ tự nét. */
const STROKE_ID_RE = /-s(\d+)$/;

/** Đọc các thuộc tính trong một thẻ XML (nhận cả nháy kép lẫn nháy đơn). */
function parseAttributes(tag: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const attributeRe = /([a-zA-Z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let match: RegExpExecArray | null;
  while ((match = attributeRe.exec(tag)) !== null) {
    attributes[match[1]] = match[2] ?? match[3] ?? "";
  }
  return attributes;
}

/**
 * Trích `d` của từng nét theo đúng thứ tự vẽ.
 * Chỉ nhận path có id kiểu `…-sN` — nhóm `kvg:StrokeNumbers` (chỉ chứa `<text>`)
 * và mọi path không phải nét đều bị bỏ qua.
 */
export function parseStrokePaths(svgText: string): string[] {
  const strokes: Array<{ order: number; d: string }> = [];
  const tagRe = /<path\b[^>]*>/gi;
  let tag: RegExpExecArray | null;
  while ((tag = tagRe.exec(svgText)) !== null) {
    const attributes = parseAttributes(tag[0]);
    const order = STROKE_ID_RE.exec(attributes.id ?? "");
    if (!order || !attributes.d) continue;
    strokes.push({ order: Number(order[1]), d: attributes.d });
  }
  // Sắp theo số nét trong id cho chắc, dù KanjiVG vốn đã đúng thứ tự
  strokes.sort((a, b) => a.order - b.order);
  return strokes.map((stroke) => stroke.d);
}

/** Tách viewBox + danh sách nét; trả `null` khi SVG không có nét nào. */
export function parseKanjiStrokeSvg(svgText: string): KanjiStrokeSvg | null {
  const paths = parseStrokePaths(svgText);
  if (paths.length === 0) return null;
  const viewBoxMatch = /viewBox\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(svgText);
  const viewBox = viewBoxMatch ? viewBoxMatch[1] ?? viewBoxMatch[2] : null;
  return { viewBox: viewBox || DEFAULT_VIEW_BOX, paths };
}

/** Cache theo chữ Hán — nhiều component dùng chung một lần tải (giống web). */
const cache = new Map<string, Promise<KanjiStrokeSvg | null>>();

async function loadKanjiStrokeSvg(literal: string): Promise<KanjiStrokeSvg | null> {
  try {
    const url = `${API_BASE_URL}/v1/kanji/${encodeURIComponent(literal)}/stroke.svg`;
    const response = await fetch(url);
    if (!response.ok) return null;
    return parseKanjiStrokeSvg(await response.text());
  } catch {
    // Lỗi mạng/parse → coi như không có dữ liệu; nơi gọi tự ẩn khối
    return null;
  }
}

/** Tải SVG thứ tự nét của một chữ Hán (cache trong RAM); lỗi → `null`, không throw. */
export function fetchKanjiStrokeSvg(literal: string): Promise<KanjiStrokeSvg | null> {
  let promise = cache.get(literal);
  if (!promise) {
    promise = loadKanjiStrokeSvg(literal);
    cache.set(literal, promise);
  }
  return promise;
}

/** Số mẫu mỗi đoạn cong khi ước lượng độ dài path. */
const CURVE_SAMPLES = 12;
/** Số tham số mỗi nhóm của từng lệnh path (chuẩn SVG). */
const PARAM_COUNTS: Record<string, number> = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7 };

/** Điểm 2D nội bộ khi ước lượng độ dài path. */
interface PathPoint {
  x: number;
  y: number;
}

function distance(from: PathPoint, to: PathPoint): number {
  return Math.hypot(to.x - from.x, to.y - from.y);
}

/** Điểm trên đường cong bậc ba tại tham số t (de Casteljau). */
function cubicAt(p0: PathPoint, p1: PathPoint, p2: PathPoint, p3: PathPoint, t: number): PathPoint {
  const mt = 1 - t;
  const a = mt * mt * mt;
  const b = 3 * mt * mt * t;
  const c = 3 * mt * t * t;
  const d = t * t * t;
  return {
    x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
    y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
  };
}

/** Điểm trên đường cong bậc hai tại tham số t. */
function quadraticAt(p0: PathPoint, p1: PathPoint, p2: PathPoint, t: number): PathPoint {
  const mt = 1 - t;
  const a = mt * mt;
  const b = 2 * mt * t;
  const c = t * t;
  return { x: a * p0.x + b * p1.x + c * p2.x, y: a * p0.y + b * p1.y + c * p2.y };
}

/** Cộng dồn độ dài đường gấp khúc lấy mẫu của một đoạn cong. */
function sampledLength(at: (t: number) => PathPoint, from: PathPoint): number {
  let length = 0;
  let previous = from;
  for (let step = 1; step <= CURVE_SAMPLES; step += 1) {
    const point = at(step / CURVE_SAMPLES);
    length += distance(previous, point);
    previous = point;
  }
  return length;
}

/**
 * Ước lượng độ dài của một path từ chuỗi `d`.
 * RN không có `getTotalLength()` như DOM, mà animate kiểu "đang viết" cần độ dài
 * để đặt `strokeDasharray`/`strokeDashoffset`, nên ta tự lấy mẫu các đoạn cong
 * (KanjiVG chủ yếu dùng M + c/C nên sai số không đáng kể).
 */
export function estimateStrokePathLength(d: string): number {
  // Token hoá `d`: chữ lệnh hoặc số (nhận .5 / -0.04 / 1e-3)
  const tokens = d.match(/[A-Za-z]|-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) ?? [];
  let index = 0;
  let length = 0;
  let command = "";
  let current: PathPoint = { x: 0, y: 0 };
  let subpathStart: PathPoint = current;
  let previousCubicControl: PathPoint | null = null;
  let previousQuadControl: PathPoint | null = null;

  const isCommand = (token: string): boolean => /^[A-Za-z]$/.test(token);
  const hasNumbers = (count: number): boolean => {
    if (index + count > tokens.length) return false;
    for (let offset = 0; offset < count; offset += 1) {
      if (isCommand(tokens[index + offset])) return false;
    }
    return true;
  };
  const takeNumber = (): number => {
    const value = Number(tokens[index]);
    index += 1;
    return value;
  };

  while (index < tokens.length) {
    if (isCommand(tokens[index])) {
      command = tokens[index];
      index += 1;
      if (command === "Z" || command === "z") {
        // Khép subpath: nối về điểm bắt đầu
        length += distance(current, subpathStart);
        current = subpathStart;
        command = "";
        continue;
      }
    } else if (!command) {
      // Token lạ trước lệnh đầu tiên — bỏ qua cho an toàn
      index += 1;
      continue;
    }

    const upper = command.toUpperCase();
    const relative = command !== upper;
    const paramCount = PARAM_COUNTS[upper];
    if (paramCount === undefined || !hasNumbers(paramCount)) {
      // Lệnh không hỗ trợ hoặc thiếu tham số — dừng xử lý lệnh này
      command = "";
      index += 1;
      continue;
    }

    switch (upper) {
      case "M":
      case "L": {
        const x = takeNumber();
        const y = takeNumber();
        const point = relative ? { x: current.x + x, y: current.y + y } : { x, y };
        if (upper === "L") length += distance(current, point);
        current = point;
        if (upper === "M") subpathStart = point;
        previousCubicControl = null;
        previousQuadControl = null;
        break;
      }
      case "H": {
        const x = takeNumber();
        const point = { x: relative ? current.x + x : x, y: current.y };
        length += distance(current, point);
        current = point;
        previousCubicControl = null;
        previousQuadControl = null;
        break;
      }
      case "V": {
        const y = takeNumber();
        const point = { x: current.x, y: relative ? current.y + y : y };
        length += distance(current, point);
        current = point;
        previousCubicControl = null;
        previousQuadControl = null;
        break;
      }
      case "C": {
        const x1 = takeNumber();
        const y1 = takeNumber();
        const x2 = takeNumber();
        const y2 = takeNumber();
        const x = takeNumber();
        const y = takeNumber();
        const control1 = relative ? { x: current.x + x1, y: current.y + y1 } : { x: x1, y: y1 };
        const control2 = relative ? { x: current.x + x2, y: current.y + y2 } : { x: x2, y: y2 };
        const point = relative ? { x: current.x + x, y: current.y + y } : { x, y };
        length += sampledLength((t) => cubicAt(current, control1, control2, point, t), current);
        current = point;
        previousCubicControl = control2;
        previousQuadControl = null;
        break;
      }
      case "S": {
        const x2 = takeNumber();
        const y2 = takeNumber();
        const x = takeNumber();
        const y = takeNumber();
        const control1: PathPoint = previousCubicControl
          ? { x: 2 * current.x - previousCubicControl.x, y: 2 * current.y - previousCubicControl.y }
          : current;
        const control2 = relative ? { x: current.x + x2, y: current.y + y2 } : { x: x2, y: y2 };
        const point = relative ? { x: current.x + x, y: current.y + y } : { x, y };
        length += sampledLength((t) => cubicAt(current, control1, control2, point, t), current);
        current = point;
        previousCubicControl = control2;
        previousQuadControl = null;
        break;
      }
      case "Q": {
        const x1 = takeNumber();
        const y1 = takeNumber();
        const x = takeNumber();
        const y = takeNumber();
        const control = relative ? { x: current.x + x1, y: current.y + y1 } : { x: x1, y: y1 };
        const point = relative ? { x: current.x + x, y: current.y + y } : { x, y };
        length += sampledLength((t) => quadraticAt(current, control, point, t), current);
        current = point;
        previousQuadControl = control;
        previousCubicControl = null;
        break;
      }
      case "T": {
        const x = takeNumber();
        const y = takeNumber();
        const control: PathPoint = previousQuadControl
          ? { x: 2 * current.x - previousQuadControl.x, y: 2 * current.y - previousQuadControl.y }
          : current;
        const point = relative ? { x: current.x + x, y: current.y + y } : { x, y };
        length += sampledLength((t) => quadraticAt(current, control, point, t), current);
        current = point;
        previousQuadControl = control;
        previousCubicControl = null;
        break;
      }
      case "A": {
        // KanjiVG không sinh cung — xử lý tối thiểu: bỏ 5 tham số đầu, cộng dây cung
        takeNumber();
        takeNumber();
        takeNumber();
        takeNumber();
        takeNumber();
        const x = takeNumber();
        const y = takeNumber();
        const point = relative ? { x: current.x + x, y: current.y + y } : { x, y };
        length += distance(current, point);
        current = point;
        previousCubicControl = null;
        previousQuadControl = null;
        break;
      }
    }

    // Nhóm tham số dư của M/m là lệnh L/l (đúng chuẩn SVG)
    if (upper === "M") command = relative ? "l" : "L";
  }

  return length;
}
