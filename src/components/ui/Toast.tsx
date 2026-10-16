import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Animated, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AlertCircle, CheckCircle2, Info } from "lucide-react-native";
import { spacing, useTheme } from "@/theme";
import { AppText } from "./Text";

export type ToastType = "success" | "error" | "info";

export interface ToastOptions {
  type?: ToastType;
  /** Thời gian hiển thị (ms), mặc định 2600. */
  duration?: number;
}

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastContextValue {
  show: (message: string, opts?: ToastOptions) => void;
  /**
   * Đặt khoảng cách đáy cho toast (px) — tab bar đẩy toast lên cho khỏi đè.
   * Component trong MainTabs set theo chiều cao tab bar; màn stack không set (= 0).
   */
  setBottomOffset: (offset: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION = 2600;
const MAX_QUEUE = 3;

/** Hàm show toàn cục — chỉ có tác dụng khi ToastProvider đã mount. */
let globalShow: ((message: string, opts?: ToastOptions) => void) | null = null;

/** Hiện toast lỗi (tiện dùng ngoài React) — API chính vẫn là useToast(). */
export function toastError(message: string): void {
  globalShow?.(message, { type: "error" });
}

/** Hiện toast thành công (tiện dùng ngoài React) — API chính vẫn là useToast(). */
export function toastSuccess(message: string): void {
  globalShow?.(message, { type: "success" });
}

/** Provider toast toàn app — bọc quanh cây gốc; hàng đợi tối đa 3 toast. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<ToastItem[]>([]);
  // Offset đáy do tab bar báo lên (màn stack để 0)
  const [bottomOffset, setBottomOffset] = useState(0);
  const idRef = useRef(0);

  const show = useCallback((message: string, opts?: ToastOptions) => {
    idRef.current += 1;
    const item: ToastItem = {
      id: idRef.current,
      message,
      type: opts?.type ?? "info",
      duration: opts?.duration ?? DEFAULT_DURATION,
    };
    // Quá 3 toast thì bỏ cái cũ nhất
    setQueue(prev => [...prev, item].slice(-MAX_QUEUE));
  }, []);

  const dismiss = useCallback((id: number) => {
    setQueue(prev => prev.filter(item => item.id !== id));
  }, []);

  useEffect(() => {
    globalShow = show;
    return () => {
      globalShow = null;
    };
  }, [show]);

  const value = useMemo<ToastContextValue>(() => ({ show, setBottomOffset }), [show]);
  const current = queue[0];

  return (
    <ToastContext.Provider value={value}>
      <View className="flex-1">
        {children}
        {current ? (
          <ToastView
            key={current.id}
            toast={current}
            onDone={dismiss}
            bottomOffset={bottomOffset}
          />
        ) : null}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast phải dùng trong <ToastProvider>");
  return context;
}

function ToastView({
  toast,
  onDone,
  bottomOffset,
}: {
  toast: ToastItem;
  onDone: (id: number) => void;
  bottomOffset: number;
}) {
  // Chỉ giữ theme cho màu icon lucide (giá trị phía JS); mọi style tĩnh đã là class.
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(progress, { toValue: 0, duration: 160, useNativeDriver: true }).start(
        ({ finished }) => {
          if (finished) onDone(toast.id);
        },
      );
    }, toast.duration);
    return () => clearTimeout(timer);
  }, [progress, toast.duration, toast.id, onDone]);

  const iconColor =
    toast.type === "success"
      ? theme.colors.success
      : toast.type === "error"
        ? theme.colors.danger
        : theme.colors.primary;

  const icon =
    toast.type === "success" ? (
      <CheckCircle2 size={18} color={iconColor} />
    ) : toast.type === "error" ? (
      <AlertCircle size={18} color={iconColor} />
    ) : (
      <Info size={18} color={iconColor} />
    );

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [24, 0] });

  // Trong tab: đáy = chiều cao tab bar (đã gồm safe area); màn stack: cộng safe area đáy
  const bottomPad = spacing.lg + (bottomOffset > 0 ? bottomOffset : insets.bottom);

  return (
    <View pointerEvents="box-none" className="absolute bottom-0 left-0 right-0 px-4" style={{ paddingBottom: bottomPad }}>
      {/* Animated.View không nhận className — nó giãn ngang theo View cha (align-items: stretch) */}
      <Animated.View style={{ opacity: progress, transform: [{ translateY }] }}>
        <Pressable
          onPress={() => onDone(toast.id)}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          accessibilityLabel={toast.message}
          testID="toast"
          className="w-full max-w-[480px] self-center flex-row items-center gap-2 rounded-lg border border-border bg-card-elevated px-4 py-3 shadow-[0px_4px_12px_rgba(0,0,0,0.18)] elevation-md"
        >
          {icon}
          <AppText variant="caption" color="default" numberOfLines={3} className="flex-1">
            {toast.message}
          </AppText>
        </Pressable>
      </Animated.View>
    </View>
  );
}
