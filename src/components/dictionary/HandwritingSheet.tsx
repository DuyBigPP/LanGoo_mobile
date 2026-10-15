/**
 * Bottom sheet vẽ chữ Hán để nhận dạng (port từ `HandwritingDialog` bên web).
 *
 * Khác bản web ở chỗ dùng `react-native-svg` + `PanResponder` thay cho canvas,
 * nhưng giữ nguyên hành vi: tự nhận dạng sau khi ngừng vẽ, danh sách gợi ý
 * kèm độ tin cậy, chốt gợi ý thì trả ký tự về màn Từ điển qua `onPick`
 * (không điều hướng sang màn khác như bản full-screen trước đây).
 */

import * as React from "react";
import {
  ActivityIndicator,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Eraser, Search, Undo2 } from "lucide-react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { AppText, BottomSheet, Button } from "@/components/ui";
import { useT } from "@/i18n";
import {
  getKanjiRecognizer,
  recognizeInk,
  type InkPoint,
  type InkStroke,
  type KanjiCandidate,
} from "@/lib/kanji-ink";
import { radius, spacing, useTheme } from "@/theme";

export interface HandwritingSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Người dùng chốt một ký tự trong gợi ý */
  onPick: (char: string) => void;
}

type Status = "idle" | "loading-model" | "recognizing" | "error";

/** Bề dày nét hiển thị trong khung vẽ (khớp bản web) */
const STROKE_WIDTH = 10;
/** Ngừng vẽ bao lâu thì tự nhận dạng lại */
const RECOGNIZE_DELAY = 600;
/** Số cột của lưới gợi ý */
const CANDIDATE_COLUMNS = 4;
/** Tỷ lệ chiều cao sheet so với màn hình */
const SHEET_MAX_RATIO = 0.92;
/** Kích thước khung vẽ tối đa / tối thiểu (px) */
const CANVAS_MAX = 340;
const CANVAS_MIN = 120;
/**
 * Chiều cao phần khung của sheet: lề trên + tay cầm + tiêu đề (nút X 36) + lề dưới.
 * Dùng để tính chỗ thực sự còn lại cho khung vẽ.
 */
const SHEET_CHROME_HEIGHT = spacing.sm + 4 + spacing.sm + 36 + spacing.sm + spacing.lg;
/** Chiều cao tối thiểu vùng điều khiển dưới khung vẽ: 2 nút + nút nhận dạng + trạng thái + credit + lề dưới */
const PANEL_MIN_HEIGHT =
  44 + spacing.md + 44 + spacing.md + 24 + spacing.md + 36 + spacing.sm;

/** Sheet vẽ chữ Hán — nhận dạng chạy hoàn toàn trên máy (DaKanji ONNX). */
export function HandwritingSheet({ visible, onClose, onPick }: HandwritingSheetProps) {
  const t = useT();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  // Khung vẽ vuông, vừa cả bề ngang lẫn phần còn lại của sheet sau khi chừa chỗ
  // cho hàng nút + trạng thái bên dưới -> không bao giờ tràn ra ngoài sheet.
  const canvasSize = React.useMemo(() => {
    const maxSheetHeight = height * SHEET_MAX_RATIO;
    const availableWidth = width - spacing.lg * 2;
    const availableHeight =
      maxSheetHeight - SHEET_CHROME_HEIGHT - insets.bottom - spacing.md - PANEL_MIN_HEIGHT;
    return Math.max(CANVAS_MIN, Math.min(CANVAS_MAX, availableWidth, availableHeight));
  }, [height, insets.bottom, width]);

  const candidateSize = Math.floor(
    (width - spacing.lg * 2 - spacing.sm * (CANDIDATE_COLUMNS - 1)) / CANDIDATE_COLUMNS,
  );

  const [strokes, setStrokes] = React.useState<InkStroke[]>([]);
  const [active, setActive] = React.useState<InkPoint[]>([]);
  const [status, setStatus] = React.useState<Status>("loading-model");
  const [candidates, setCandidates] = React.useState<KanjiCandidate[]>([]);
  const [errorMessage, setErrorMessage] = React.useState("");

  // Bản ref để PanResponder/callback không đọc phải state cũ
  const strokesRef = React.useRef<InkStroke[]>([]);
  const activeRef = React.useRef<InkPoint[]>([]);
  const busyRef = React.useRef(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelScheduled = React.useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const runRecognize = React.useCallback(async () => {
    if (busyRef.current) return;
    const current = strokesRef.current;
    if (current.flat().length < 2) {
      setCandidates([]);
      return;
    }
    busyRef.current = true;
    setStatus("recognizing");
    try {
      const result = await recognizeInk(current);
      setCandidates(result);
      setStatus("idle");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t("dict.inkRecognizeError"));
      setStatus("error");
    } finally {
      busyRef.current = false;
    }
  }, [t]);

  const scheduleRecognize = React.useCallback(() => {
    cancelScheduled();
    timerRef.current = setTimeout(() => void runRecognize(), RECOGNIZE_DELAY);
  }, [cancelScheduled, runRecognize]);

  const commitStrokes = React.useCallback((next: InkStroke[]) => {
    strokesRef.current = next;
    setStrokes(next);
  }, []);

  // Mở sheet -> xoá nét cũ + nạp trước model; đóng sheet -> dừng mọi việc đang chờ
  React.useEffect(() => {
    if (!visible) {
      cancelScheduled();
      return;
    }
    activeRef.current = [];
    setActive([]);
    commitStrokes([]);
    setCandidates([]);
    setErrorMessage("");
    busyRef.current = false;
    setStatus("loading-model");
    let cancelled = false;
    void getKanjiRecognizer()
      .then(() => {
        if (!cancelled) setStatus("idle");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setErrorMessage(error instanceof Error ? error.message : t("dict.inkLoadError"));
        setStatus("error");
      });
    return () => {
      cancelled = true;
      cancelScheduled();
    };
  }, [cancelScheduled, commitStrokes, t, visible]);

  const finishStroke = React.useCallback(() => {
    const stroke = activeRef.current;
    if (stroke.length === 0) return;
    activeRef.current = [];
    setActive([]);
    commitStrokes([...strokesRef.current, stroke]);
    scheduleRecognize();
  }, [commitStrokes, scheduleRecognize]);

  /** Toạ độ chạm -> toạ độ px trong khung vẽ (kẹp trong khung cho an toàn) */
  const pointFromEvent = React.useCallback(
    (event: GestureResponderEvent): InkPoint => {
      const { locationX, locationY } = event.nativeEvent;
      return {
        x: Math.max(0, Math.min(canvasSize, locationX)),
        y: Math.max(0, Math.min(canvasSize, locationY)),
      };
    },
    [canvasSize],
  );

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        // Đang vẽ thì không nhường cử chỉ cho ScrollView
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: event => {
          if (busyRef.current) return;
          // Người dùng vẽ tiếp -> huỷ lần nhận dạng đang chờ
          cancelScheduled();
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
    [cancelScheduled, finishStroke, pointFromEvent],
  );

  const handleClear = React.useCallback(() => {
    cancelScheduled();
    activeRef.current = [];
    setActive([]);
    commitStrokes([]);
    setCandidates([]);
  }, [cancelScheduled, commitStrokes]);

  const handleUndo = React.useCallback(() => {
    cancelScheduled();
    const next = strokesRef.current.slice(0, -1);
    commitStrokes(next);
    if (next.length === 0) {
      setCandidates([]);
      return;
    }
    scheduleRecognize();
  }, [cancelScheduled, commitStrokes, scheduleRecognize]);

  const handleRetry = React.useCallback(() => {
    setErrorMessage("");
    setStatus("loading-model");
    void getKanjiRecognizer()
      .then(() => {
        if (strokesRef.current.flat().length >= 2) {
          void runRecognize();
          return;
        }
        setStatus("idle");
      })
      .catch((error: unknown) => {
        setErrorMessage(error instanceof Error ? error.message : t("dict.inkLoadError"));
        setStatus("error");
      });
  }, [runRecognize, t]);

  /** Chốt một chữ trong gợi ý -> trả ký tự về màn Từ điển (không điều hướng) */
  const handlePick = React.useCallback(
    (char: string) => {
      cancelScheduled();
      onPick(char);
    },
    [cancelScheduled, onPick],
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

  const busy = status === "recognizing" || status === "loading-model";
  const strokeCount = strokes.length;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t("dict.inkTitle")}
      maxHeightRatio={SHEET_MAX_RATIO}
      testID="handwriting-sheet"
    >
      <View style={styles.body}>
        {/* Ô vẽ vuông + đường dóng 2×2 như ô tập viết.
            Cố ý để NGOÀI ScrollView: PanResponder chỉ nhận cử chỉ sau một vòng
            JS, nếu nằm trong ScrollView thì cú kéo đầu tiên có thể bị cuộn trang giành mất. */}
        <View style={styles.canvasWrap}>
          <View
            testID="handwriting-canvas"
            style={[
              styles.canvas,
              {
                width: canvasSize,
                height: canvasSize,
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.border,
              },
            ]}
            {...panResponder.panHandlers}
          >
            <Svg width={canvasSize} height={canvasSize} pointerEvents="none">
              <Line
                x1={canvasSize / 2}
                y1={0}
                x2={canvasSize / 2}
                y2={canvasSize}
                stroke={theme.colors.border}
                strokeWidth={1}
              />
              <Line
                x1={0}
                y1={canvasSize / 2}
                x2={canvasSize}
                y2={canvasSize / 2}
                stroke={theme.colors.border}
                strokeWidth={1}
              />
              {finishedShapes}
              {active.length > 0 ? (
                <InkStrokeShape stroke={active} color={inkColor} width={STROKE_WIDTH} />
              ) : null}
            </Svg>
            {status === "loading-model" ? (
              <View
                style={[styles.canvasOverlay, { backgroundColor: theme.colors.card }]}
                testID="handwriting-canvas-loading"
              >
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <AppText variant="caption">{t("dict.inkLoading")}</AppText>
              </View>
            ) : null}
          </View>
        </View>

        <ScrollView
          style={styles.panel}
          contentContainerStyle={styles.panelContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.actions}>
            <Button
              label={t("dict.inkUndo")}
              variant="outline"
              size="sm"
              icon={<Undo2 size={16} color={theme.colors.text} />}
              onPress={handleUndo}
              disabled={strokeCount === 0}
              testID="handwriting-undo"
            />
            <Button
              label={t("dict.inkClear")}
              variant="outline"
              size="sm"
              icon={<Eraser size={16} color={theme.colors.text} />}
              onPress={handleClear}
              disabled={strokeCount === 0}
              testID="handwriting-clear"
            />
          </View>

          <Button
            label={t("dict.inkRecognize")}
            size="sm"
            icon={
              status === "recognizing" ? (
                <ActivityIndicator size="small" color={theme.colors.onPrimary} />
              ) : (
                <Search size={16} color={theme.colors.onPrimary} />
              )
            }
            onPress={() => void runRecognize()}
            disabled={strokeCount === 0 || busy}
            fullWidth
            testID="handwriting-recognize"
          />

          {/* Trạng thái: số nét / đang nhận dạng / lỗi */}
          <View style={styles.status} testID="handwriting-status">
            {status === "error" ? (
              <>
                <AppText variant="caption" color="danger" center>
                  {errorMessage}
                </AppText>
                <Button
                  label={t("common.retry")}
                  variant="outline"
                  size="sm"
                  onPress={handleRetry}
                  style={styles.center}
                  testID="handwriting-retry"
                />
              </>
            ) : status === "idle" ? (
              <AppText variant="caption" center>
                {t("dict.inkStrokes", { count: strokeCount })}
              </AppText>
            ) : (
              <View style={styles.statusRow}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <AppText variant="caption">
                  {status === "recognizing" ? t("dict.inkRecognizing") : t("dict.inkLoading")}
                </AppText>
              </View>
            )}
          </View>

          {/* Gợi ý ký tự — bấm để tra luôn */}
          {status === "idle" && candidates.length > 0 ? (
            <View style={styles.candidates} testID="handwriting-candidates">
              {candidates.map((candidate, index) => {
                const percent = (candidate.score * 100).toFixed(1);
                return (
                  <Pressable
                    key={`${candidate.char}-${index}`}
                    testID={`handwriting-candidate-${index}`}
                    onPress={() => handlePick(candidate.char)}
                    accessibilityRole="button"
                    accessibilityLabel={candidate.char}
                    accessibilityHint={t("dict.confidence", { percent })}
                    style={({ pressed }) => [
                      styles.candidate,
                      {
                        width: candidateSize,
                        height: candidateSize,
                        backgroundColor: theme.colors.card,
                        borderColor:
                          index === 0 ? theme.colors.primary : theme.colors.border,
                      },
                      pressed ? styles.pressed : null,
                    ]}
                  >
                    <AppText size="xxl" weight="semibold">
                      {candidate.char}
                    </AppText>
                    <AppText size="xs" color="muted">
                      {`${percent}%`}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          <AppText variant="caption" center>
            {t("dict.inkCredit")}
          </AppText>
        </ScrollView>
      </View>
    </BottomSheet>
  );
}

interface InkStrokeShapeProps {
  stroke: InkPoint[];
  color: string;
  width: number;
}

/** Một nét vẽ: đa đoạn thẳng bo tròn đầu/cuối; nét 1 điểm thì vẽ chấm tròn. */
function InkStrokeShape({ stroke, color, width }: InkStrokeShapeProps) {
  if (stroke.length === 0) return null;
  if (stroke.length === 1) {
    return <Circle cx={stroke[0].x} cy={stroke[0].y} r={width / 2} fill={color} />;
  }
  const d = stroke
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`,
    )
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

const styles = StyleSheet.create({
  body: { gap: spacing.md, flexShrink: 1 },
  canvasWrap: { alignItems: "center" },
  canvas: {
    borderWidth: 1,
    borderRadius: radius.xl,
    overflow: "hidden",
  },
  canvasOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  // flexShrink để danh sách gợi ý dài thì cuộn bên trong, không đẩy tràn sheet
  panel: { flexShrink: 1 },
  panelContent: { gap: spacing.md, paddingBottom: spacing.sm },
  actions: { flexDirection: "row", gap: spacing.sm },
  status: { minHeight: 24, alignItems: "center", justifyContent: "center", gap: spacing.sm },
  statusRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  candidates: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  candidate: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: radius.md,
  },
  center: { alignSelf: "center" },
  pressed: { opacity: 0.85 },
});
