/**
 * Bottom sheet vẽ chữ Hán để nhận dạng (port từ `HandwritingDialog` bên web).
 *
 * Bố cục như web: hàng gợi ý nhỏ cuộn ngang ở trên → khung vẽ → từ đang ghép → một hàng nút
 * (Xoá tất cả · Hoàn tác · số nét · Nhận dạng/Tra cứu). Tự nhận dạng sau khi ngừng vẽ; chạm gợi ý
 * thì ghép vào "từ đang viết", bấm Tra cứu thì trả từ về màn Từ điển qua `onPick`.
 */

import * as React from "react";
import { ActivityIndicator, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Delete, Eraser, Search, Undo2 } from "lucide-react-native";
import { AppText, BottomSheet, Button, IconButton } from "@/components/ui";
import { useT } from "@/i18n";
import {
  getKanjiRecognizer,
  recognizeInk,
  type InkStroke,
  type KanjiCandidate,
} from "@/lib/kanji-ink";
import { spacing, useTheme } from "@/theme";
import { CANDIDATE_SIZE, CandidateStrip } from "./handwriting/CandidateStrip";
import { InkCanvas } from "./handwriting/InkCanvas";

export interface HandwritingSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Người dùng chốt từ đã ghép (1 hoặc nhiều chữ) để tra */
  onPick: (text: string) => void;
}

type Status = "idle" | "loading-model" | "recognizing" | "error";

/** Ngừng vẽ bao lâu thì tự nhận dạng lại */
const RECOGNIZE_DELAY = 600;
/** Tỷ lệ chiều cao sheet so với màn hình */
const SHEET_MAX_RATIO = 0.92;
/** Kích thước khung vẽ tối đa / tối thiểu (px) */
const CANVAS_MAX = 340;
const CANVAS_MIN = 120;
/** Phần khung của sheet: lề trên + tay cầm + tiêu đề (nút X 36) + lề dưới. */
const SHEET_CHROME_HEIGHT = spacing.sm + 4 + spacing.sm + 36 + spacing.sm + spacing.lg;
/** Phần còn lại ngoài khung vẽ: hàng gợi ý + hàng nút + dòng trạng thái/lỗi + các khoảng cách. */
const PANEL_HEIGHT = CANDIDATE_SIZE + spacing.md + 44 + spacing.md + 24 + spacing.md;

/** Sheet vẽ chữ Hán — nhận dạng chạy hoàn toàn trên máy (DaKanji ONNX). */
export function HandwritingSheet({ visible, onClose, onPick }: HandwritingSheetProps) {
  const t = useT();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  // Khung vẽ vuông, vừa cả bề ngang lẫn phần còn lại của sheet -> không tràn ra ngoài sheet.
  const canvasSize = React.useMemo(() => {
    const availableWidth = width - spacing.lg * 2;
    const availableHeight =
      height * SHEET_MAX_RATIO - SHEET_CHROME_HEIGHT - insets.bottom - PANEL_HEIGHT;
    return Math.max(CANVAS_MIN, Math.min(CANVAS_MAX, availableWidth, availableHeight));
  }, [height, insets.bottom, width]);

  const [strokes, setStrokes] = React.useState<InkStroke[]>([]);
  const [status, setStatus] = React.useState<Status>("loading-model");
  const [candidates, setCandidates] = React.useState<KanjiCandidate[]>([]);
  const [errorMessage, setErrorMessage] = React.useState("");
  // Từ đang ghép: chọn gợi ý -> chữ vào đây, ô vẽ xoá để viết chữ kế (mirror web ComposedWord)
  const [composed, setComposed] = React.useState<string[]>([]);

  // Bản ref để callback hẹn giờ không đọc phải state cũ
  const strokesRef = React.useRef<InkStroke[]>([]);
  const busyRef = React.useRef(false);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelScheduled = React.useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const commitStrokes = React.useCallback((next: InkStroke[]) => {
    strokesRef.current = next;
    setStrokes(next);
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
      setCandidates(await recognizeInk(current));
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

  const loadModel = React.useCallback(
    (isCancelled: () => boolean = () => false) => {
      setErrorMessage("");
      setStatus("loading-model");
      void getKanjiRecognizer()
        .then(() => {
          if (isCancelled()) return;
          if (strokesRef.current.flat().length >= 2) void runRecognize();
          else setStatus("idle");
        })
        .catch((error: unknown) => {
          if (isCancelled()) return;
          setErrorMessage(error instanceof Error ? error.message : t("dict.inkLoadError"));
          setStatus("error");
        });
    },
    [runRecognize, t],
  );

  // Mở sheet -> xoá nét cũ + nạp trước model; đóng sheet -> dừng mọi việc đang chờ
  React.useEffect(() => {
    if (!visible) {
      cancelScheduled();
      return;
    }
    commitStrokes([]);
    setCandidates([]);
    setComposed([]);
    busyRef.current = false;
    let cancelled = false;
    loadModel(() => cancelled);
    return () => {
      cancelled = true;
      cancelScheduled();
    };
  }, [cancelScheduled, commitStrokes, loadModel, visible]);

  const handleStrokeEnd = React.useCallback(
    (stroke: InkStroke) => {
      commitStrokes([...strokesRef.current, stroke]);
      scheduleRecognize();
    },
    [commitStrokes, scheduleRecognize],
  );

  const handleClear = React.useCallback(() => {
    cancelScheduled();
    commitStrokes([]);
    setCandidates([]);
  }, [cancelScheduled, commitStrokes]);

  const handleUndo = React.useCallback(() => {
    cancelScheduled();
    const next = strokesRef.current.slice(0, -1);
    commitStrokes(next);
    if (next.length === 0) setCandidates([]);
    else scheduleRecognize();
  }, [cancelScheduled, commitStrokes, scheduleRecognize]);

  /** Chọn chữ trong gợi ý -> ghép vào từ đang viết (không đóng sheet), xoá nét để viết chữ kế */
  const handlePick = React.useCallback(
    (char: string) => {
      setComposed(previous => [...previous, char]);
      handleClear();
    },
    [handleClear],
  );

  const composedText = composed.join("");
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
      <View className="shrink gap-3">
        <CandidateStrip candidates={status === "idle" ? candidates : []} onPick={handlePick} />

        <InkCanvas
          size={canvasSize}
          strokes={strokes}
          loadingModel={status === "loading-model"}
          busy={busy}
          onStrokeStart={cancelScheduled}
          onStrokeEnd={handleStrokeEnd}
        />

        {composed.length > 0 ? (
          <View
            className="flex-row items-center gap-2"
            accessibilityLabel={t("dict.inkComposed")}
            testID="handwriting-composed"
          >
            {composed.map((char, index) => (
              <View
                key={`${char}-${index}`}
                className="h-9 w-9 items-center justify-center rounded-md border border-border bg-card"
              >
                <AppText size="lg" weight="semibold">
                  {char}
                </AppText>
              </View>
            ))}
            <IconButton
              icon={<Delete size={16} color={theme.colors.textMuted} />}
              accessibilityLabel={t("dict.inkComposedUndo")}
              onPress={() => setComposed(previous => previous.slice(0, -1))}
              size="sm"
              testID="handwriting-composed-undo"
            />
          </View>
        ) : null}

        {/* Một hàng như web: Xoá tất cả · Hoàn tác · số nét · Nhận dạng/Tra cứu */}
        <View className="flex-row items-center gap-2">
          <IconButton
            icon={<Eraser size={18} color={theme.colors.text} />}
            onPress={handleClear}
            accessibilityLabel={t("dict.inkClear")}
            variant="outline"
            disabled={strokeCount === 0}
            testID="handwriting-clear"
          />
          <IconButton
            icon={<Undo2 size={18} color={theme.colors.text} />}
            onPress={handleUndo}
            accessibilityLabel={t("dict.inkUndo")}
            variant="outline"
            disabled={strokeCount === 0}
            testID="handwriting-undo"
          />
          <View className="flex-1 items-center" testID="handwriting-status">
            {status === "recognizing" ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <AppText variant="caption" numberOfLines={1}>
                {t("dict.inkStrokes", { count: strokeCount })}
              </AppText>
            )}
          </View>
          <Button
            label={composedText ? t("dict.inkSearch") : t("dict.inkRecognize")}
            size="sm"
            icon={<Search size={16} color={theme.colors.onPrimary} />}
            onPress={() => (composedText ? onPick(composedText) : void runRecognize())}
            disabled={composedText ? false : strokeCount === 0 || busy}
            testID="handwriting-recognize"
          />
        </View>

        {status === "error" ? (
          <View className="flex-row items-center gap-2">
            <AppText variant="caption" color="danger" className="flex-1">
              {errorMessage}
            </AppText>
            <Button
              label={t("common.retry")}
              variant="outline"
              size="sm"
              onPress={() => loadModel()}
              testID="handwriting-retry"
            />
          </View>
        ) : null}
      </View>
    </BottomSheet>
  );
}
