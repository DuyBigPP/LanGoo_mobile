import * as React from "react";
import {
  ActivityIndicator,
  PanResponder,
  View,
  type GestureResponderEvent,
} from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { AppText } from "@/components/ui";
import { useT } from "@/i18n";
import type { InkPoint, InkStroke } from "@/lib/kanji-ink";
import { useTheme } from "@/theme";

/** Bề dày nét hiển thị trong khung vẽ (khớp bản web) */
const STROKE_WIDTH = 10;

export interface InkCanvasProps {
  /** Cạnh khung vẽ vuông (px). */
  size: number;
  strokes: InkStroke[];
  /** Đang nạp model: phủ lớp chờ lên khung vẽ. */
  loadingModel: boolean;
  /** Đang nhận dạng: không nhận nét mới. */
  busy: boolean;
  /** Bắt đầu nét mới (để huỷ lần nhận dạng đang chờ). */
  onStrokeStart: () => void;
  onStrokeEnd: (stroke: InkStroke) => void;
}

/**
 * Ô vẽ vuông + đường dóng 2×2 như ô tập viết (react-native-svg + PanResponder thay canvas web).
 * Cố ý KHÔNG đặt trong ScrollView: PanResponder nhận cử chỉ sau một vòng JS, nằm trong
 * ScrollView thì cú kéo đầu tiên có thể bị cuộn trang giành mất.
 */
export function InkCanvas({
  size,
  strokes,
  loadingModel,
  busy,
  onStrokeStart,
  onStrokeEnd,
}: InkCanvasProps) {
  const t = useT();
  const theme = useTheme();
  const [active, setActive] = React.useState<InkPoint[]>([]);
  // Bản ref để PanResponder không đọc phải state cũ
  const activeRef = React.useRef<InkPoint[]>([]);
  const busyRef = React.useRef(busy);
  busyRef.current = busy;

  /** Toạ độ chạm -> toạ độ px trong khung vẽ (kẹp trong khung cho an toàn) */
  const pointFromEvent = React.useCallback(
    (event: GestureResponderEvent): InkPoint => {
      const { locationX, locationY } = event.nativeEvent;
      return {
        x: Math.max(0, Math.min(size, locationX)),
        y: Math.max(0, Math.min(size, locationY)),
      };
    },
    [size],
  );

  const finishStroke = React.useCallback(() => {
    const stroke = activeRef.current;
    if (stroke.length === 0) return;
    activeRef.current = [];
    setActive([]);
    onStrokeEnd(stroke);
  }, [onStrokeEnd]);

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        // Đang vẽ thì không nhường cử chỉ cho ScrollView
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: event => {
          if (busyRef.current) return;
          onStrokeStart();
          const next = [pointFromEvent(event)];
          activeRef.current = next;
          setActive(next);
        },
        onPanResponderMove: event => {
          if (activeRef.current.length === 0) return;
          const next = [...activeRef.current, pointFromEvent(event)];
          activeRef.current = next;
          setActive(next);
        },
        onPanResponderRelease: () => finishStroke(),
        onPanResponderTerminate: () => finishStroke(),
      }),
    [finishStroke, onStrokeStart, pointFromEvent],
  );

  const inkColor = theme.colors.text;
  // Nét đã vẽ xong chỉ vẽ lại khi danh sách nét đổi (nét đang vẽ ở lớp riêng)
  const finishedShapes = React.useMemo(
    () =>
      strokes.map((stroke, index) => (
        <InkStrokeShape key={index} stroke={stroke} color={inkColor} width={STROKE_WIDTH} />
      )),
    [inkColor, strokes],
  );

  return (
    <View className="items-center">
      <View
        testID="handwriting-canvas"
        className="overflow-hidden rounded-xl border border-border bg-card"
        style={{ width: size, height: size }}
        {...panResponder.panHandlers}
      >
        <Svg width={size} height={size} pointerEvents="none">
          <Line x1={size / 2} y1={0} x2={size / 2} y2={size} stroke={theme.colors.border} strokeWidth={1} />
          <Line x1={0} y1={size / 2} x2={size} y2={size / 2} stroke={theme.colors.border} strokeWidth={1} />
          {finishedShapes}
          {active.length > 0 ? (
            <InkStrokeShape stroke={active} color={inkColor} width={STROKE_WIDTH} />
          ) : null}
        </Svg>
        {loadingModel ? (
          <View
            className="absolute inset-0 items-center justify-center gap-2 bg-card"
            testID="handwriting-canvas-loading"
          >
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <AppText variant="caption">{t("dict.inkLoading")}</AppText>
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** Một nét vẽ: đa đoạn thẳng bo tròn đầu/cuối; nét 1 điểm thì vẽ chấm tròn. */
function InkStrokeShape({ stroke, color, width }: { stroke: InkPoint[]; color: string; width: number }) {
  if (stroke.length === 0) return null;
  if (stroke.length === 1) {
    return <Circle cx={stroke[0].x} cy={stroke[0].y} r={width / 2} fill={color} />;
  }
  const d = stroke
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");
  return (
    <Path
      d={d}
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  );
}
