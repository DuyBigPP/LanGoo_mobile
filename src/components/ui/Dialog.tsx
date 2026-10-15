import React from "react";
import { Modal, Pressable, View } from "react-native";
import { X } from "lucide-react-native";
import { useT } from "@/i18n";
import { useTheme } from "@/theme";
import { AppText } from "./Text";
import { Button } from "./Button";
import { IconButton } from "./IconButton";

export interface DialogAction {
  label: string;
  onPress: () => void;
  variant?: "primary" | "outline" | "danger";
}

export interface DialogProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  actions?: DialogAction[];
  testID?: string;
}

/** Hộp thoại giữa màn hình — backdrop bấm được để đóng, có nút X góc phải. */
export function Dialog({ visible, onClose, title, children, actions, testID }: DialogProps) {
  // Chỉ giữ theme cho màu icon lucide (giá trị phía JS); mọi style tĩnh đã là class.
  const theme = useTheme();
  const t = useT();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1 items-center justify-center p-5">
        <Pressable
          className="absolute inset-0 bg-overlay/45"
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t("common.close")}
        />
        <View
          testID={testID}
          accessibilityViewIsModal
          className="w-full max-w-[420px] gap-2 rounded-2xl border border-border bg-card-elevated p-4"
        >
          <View className="flex-row items-center gap-2">
            {title ? (
              <AppText variant="subtitle" className="flex-1">
                {title}
              </AppText>
            ) : (
              <View className="flex-1" />
            )}
            <IconButton
              icon={<X size={20} color={theme.colors.textMuted} />}
              onPress={onClose}
              accessibilityLabel={t("common.close")}
              size="sm"
              variant="ghost"
            />
          </View>
          <View className="gap-1">{children}</View>
          {actions && actions.length > 0 ? (
            <View className="mt-2 flex-row flex-wrap justify-end gap-2">
              {actions.map(action => (
                <Button
                  key={action.label}
                  label={action.label}
                  variant={action.variant ?? "primary"}
                  onPress={action.onPress}
                />
              ))}
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
