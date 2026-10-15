import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { useT } from "@/i18n";
import { spacing, useTheme } from "@/theme";
import { AppText } from "./Text";
import { IconButton } from "./IconButton";

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  /** Tỷ lệ chiều cao tối đa so với màn hình (mặc định 0.85). */
  maxHeightRatio?: number;
  testID?: string;
}

/** Kéo tay nắm xuống quá ngưỡng này (px) thì đóng sheet. */
const DISMISS_DISTANCE = 90;
/** Hoặc vuốt xuống đủ nhanh (px/ms) thì cũng đóng. */
const DISMISS_VELOCITY = 0.8;

/** Bottom sheet trượt lên — Modal + Animated, không dùng thư viện ngoài. */
export function BottomSheet({
  visible,
  onClose,
  children,
  title,
  maxHeightRatio = 0.85,
  testID,
}: BottomSheetProps) {
  // Chỉ giữ theme cho màu icon lucide (giá trị phía JS); mọi style tĩnh đã là class.
  const theme = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const maxHeight = Math.max(1, windowHeight * maxHeightRatio);

  const progress = useRef(new Animated.Value(0)).current;
  // Kéo tay nắm: cộng thêm vào translateY của animation đóng/mở
  const panY = useRef(new Animated.Value(0)).current;
  // Giữ Modal mở trong lúc chạy animation đóng
  const [mounted, setMounted] = useState(visible);

  // PanResponder chỉ tạo một lần — đọc onClose qua ref để không giữ closure cũ
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const panResponder = useRef(
    PanResponder.create({
      // Chỉ nhận kéo khi người dùng vuốt xuống (không cướp vuốt ngang/dọc của nội dung)
      onMoveShouldSetPanResponder: (_, gesture) =>
        gesture.dy > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) panY.setValue(gesture.dy);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > DISMISS_DISTANCE || gesture.vy > DISMISS_VELOCITY) {
          onCloseRef.current();
        } else {
          Animated.spring(panY, {
            toValue: 0,
            bounciness: 0,
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(panY, {
          toValue: 0,
          bounciness: 0,
          useNativeDriver: true,
        }).start();
      },
    }),
  ).current;

  useEffect(() => {
    if (visible) {
      // Mở lại: trả tay nắm về vị trí gốc rồi trượt lên
      panY.setValue(0);
      setMounted(true);
      Animated.timing(progress, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(progress, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, progress, panY]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [maxHeight, 0] });
  const backdropOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1 justify-end">
        {/* Nền mờ: khung tĩnh bằng class, lớp mờ dùng Animated (Animated.View không nhận className) */}
        <View className="absolute inset-0">
          <Animated.View style={{ flex: 1, opacity: backdropOpacity }}>
            <View className="absolute inset-0 bg-overlay/45" />
            <Pressable
              className="absolute inset-0"
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t("common.close")}
            />
          </Animated.View>
        </View>
        <KeyboardAvoidingView
          className="justify-end"
          pointerEvents="box-none"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Animated.View
            testID={testID}
            accessibilityViewIsModal
            style={{
              maxHeight,
              transform: [{ translateY: Animated.add(translateY, panY) }],
            }}
          >
            {/* Khung thị giác của sheet (nền/bo góc/viền) nằm ở View thường để dùng className */}
            <View
              className="shrink overflow-hidden rounded-t-[20px] border-t border-border bg-card pt-2"
              style={{ paddingBottom: insets.bottom + spacing.lg }}
            >
              <View className="self-stretch items-center pb-2 pt-1" {...panResponder.panHandlers}>
                <View className="h-1 w-10 rounded-full bg-border" />
              </View>
              {title ? (
                <View className="flex-row items-center gap-2 px-4 pb-2">
                  <AppText variant="subtitle" numberOfLines={1} className="flex-1">
                    {title}
                  </AppText>
                  <IconButton
                    icon={<X size={20} color={theme.colors.textMuted} />}
                    onPress={onClose}
                    accessibilityLabel={t("common.close")}
                    size="sm"
                    variant="ghost"
                  />
                </View>
              ) : null}
              <View className="shrink px-4">{children}</View>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
