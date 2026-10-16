/**
 * Thứ tự nét chữ Hán — port từ `KanjiStrokePlayer.tsx` bên web (User/SHADCN_BASE).
 *
 * Khác bản web:
 * - SVG KanjiVG được tách nét bằng regex (`lib/kanji-stroke.ts`) thay vì DOMParser.
 * - Không có Web Animations nên từng `<Path>` được animate `strokeDashoffset`
 *   bằng RN Animated (JS driver) — giữ cảm giác "đang viết" như bản web.
 * - Tiêu đề mục nằm trong component để lỗi/thiếu dữ liệu thì ẩn trọn cả khối.
 */

import * as React from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Easing,
  View,
} from "react-native";
import { RotateCw } from "lucide-react-native";
import Svg, { Path } from "react-native-svg";
import { AppText, IconButton, SectionHeader } from "@/components/ui";
import { useT } from "@/i18n";
import {
  estimateStrokePathLength,
  fetchKanjiStrokeSvg,
  type KanjiStrokeSvg,
} from "@/lib/kanji-stroke";
import { useTheme } from "@/theme";

/** `Path` animate được qua Animated (react-native-svg có sẵn setNativeProps cho Shape). */
const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Thời gian vẽ một nét + khoảng nghỉ giữa hai nét (khớp bản web). */
const STROKE_MS = 430;
const STROKE_GAP_MS = 130;
/** Độ mờ nét "chưa vẽ" — thấy mờ cả chữ để biết hình dạng tổng thể. */
const GHOST_OPACITY = 0.12;
/** Bề dày nét theo style gốc KanjiVG (fill:none; stroke-width:3). */
const STROKE_WIDTH = 3;
/**
 * Hệ số bù khi ước lượng độ dài path: ước lượng thiếu sẽ khiến đuôi nét không
 * bao giờ vẽ hết, nên nới dư một chút (thừa ~2% chỉ làm nét vẽ xong sớm hơn rất ít).
 */
const LENGTH_MARGIN = 1.02;

type LoadStatus = "loading" | "done" | "error";

/** Một nét đã sẵn sàng để animate. */
interface StrokeItem {
  d: string;
  /** Độ dài ước lượng — dùng cho strokeDasharray/strokeDashoffset. */
  length: number;
  /** 0 = vẽ hết nét, `length` = chưa vẽ gì. */
  offset: Animated.Value;
}

/** Chờ `ms` mili-giây (nghỉ giữa hai nét). */
function wait(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

/** Vẽ một nét: `strokeDashoffset` chạy từ độ dài về 0 (nét hiện dần từ đầu tới cuối). */
function animateStroke(offset: Animated.Value): Promise<void> {
  return new Promise(resolve => {
    Animated.timing(offset, {
      toValue: 0,
      duration: STROKE_MS,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    }).start(() => resolve());
  });
}

/** Người dùng có bật "giảm chuyển động" không (tương đương prefers-reduced-motion của web). */
function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(enabled => {
      if (mounted) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}

/** Khung vẽ thứ tự nét: tự tải SVG, vẽ lần lượt từng nét, có nút vẽ lại. */
export function KanjiStrokePlayer({ literal }: { literal: string }) {
  const t = useT();
  const theme = useTheme();
  const [state, setState] = React.useState<{ status: LoadStatus; data: KanjiStrokeSvg | null }>({
    status: "loading",
    data: null,
  });
  /** Token chống chạy chồng animation (đổi chữ / bấm vẽ lại giữa chừng). */
  const runRef = React.useRef(0);
  const reduceMotion = useReduceMotion();
  /** Bản ref để `play` đọc giá trị mới nhất mà không đổi identity (tránh chạy lại animation). */
  const reduceMotionRef = React.useRef(reduceMotion);

  React.useEffect(() => {
    reduceMotionRef.current = reduceMotion;
  }, [reduceMotion]);

  React.useEffect(() => {
    let cancelled = false;
    setState({ status: "loading", data: null });
    void fetchKanjiStrokeSvg(literal).then(data => {
      if (cancelled) return;
      setState({ status: data ? "done" : "error", data });
    });
    return () => {
      cancelled = true;
      // Dừng vòng vẽ đang chạy khi đổi chữ hoặc rời màn
      runRef.current += 1;
    };
  }, [literal]);

  const strokes = React.useMemo<StrokeItem[]>(() => {
    if (!state.data) return [];
    return state.data.paths.map(d => {
      const length = Math.max(estimateStrokePathLength(d) * LENGTH_MARGIN, 1);
      return { d, length, offset: new Animated.Value(length) };
    });
  }, [state.data]);

  const play = React.useCallback(() => {
    if (strokes.length === 0) return;
    const token = runRef.current + 1;
    runRef.current = token;

    // Đưa tất cả nét về "chưa vẽ" rồi vẽ lần lượt
    for (const stroke of strokes) stroke.offset.setValue(stroke.length);

    if (reduceMotionRef.current) {
      // Bật giảm chuyển động: hiện luôn cả chữ, không animate
      for (const stroke of strokes) stroke.offset.setValue(0);
      return;
    }

    const run = async () => {
      for (const stroke of strokes) {
        if (token !== runRef.current) return;
        await animateStroke(stroke.offset);
        if (token !== runRef.current) return;
        await wait(STROKE_GAP_MS);
      }
    };
    void run();
  }, [strokes]);

  // Tự chạy khi có dữ liệu (đổi chữ → chạy lại từ đầu)
  React.useEffect(() => {
    if (state.status === "done") play();
  }, [state.status, play]);

  // Lỗi/không có dữ liệu → ẩn cả khối, không hiện lỗi
  if (state.status === "error") return null;

  // Chỉ có SVG khi dữ liệu sẵn sàng; đang tải thì hiện spinner
  const svg = state.status === "done" ? state.data : null;

  return (
    <View className="gap-2" testID="kanji-stroke-player">
      <SectionHeader title={t("dict.sectionStrokes")} />
      <View className="items-center gap-2">
        <View
          className="h-[168px] w-[168px] items-center justify-center rounded-lg border border-border bg-card p-2"
        >
          {svg ? (
            <Svg width="100%" height="100%" viewBox={svg.viewBox}>
              {/* Nét mờ của cả chữ — nét đã vẽ được phủ đè lên trên */}
              <Path
                d={svg.paths.join(" ")}
                fill="none"
                stroke={theme.colors.text}
                strokeWidth={STROKE_WIDTH}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={GHOST_OPACITY}
              />
              {strokes.map((stroke, index) => (
                <AnimatedPath
                  key={`stroke-${index}`}
                  d={stroke.d}
                  fill="none"
                  stroke={theme.colors.text}
                  strokeWidth={STROKE_WIDTH}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={[stroke.length, stroke.length]}
                  strokeDashoffset={stroke.offset}
                />
              ))}
            </Svg>
          ) : (
            <ActivityIndicator size="small" color={theme.colors.textMuted} />
          )}
          {svg ? (
            <IconButton
              icon={<RotateCw size={16} color={theme.colors.text} />}
              accessibilityLabel={t("dict.strokeReplay")}
              size="sm"
              shape="rounded"
              variant="outline"
              onPress={play}
              testID="kanji-stroke-replay"
              className="absolute right-1 top-1"
            />
          ) : null}
        </View>
        {svg ? (
          <AppText variant="caption">
            {t("dict.strokes", { count: svg.paths.length })}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}
