import React, { forwardRef, useState } from "react";
import {
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { Input as ReusablesInput } from "@/components/reusables/input";
import { Text } from "@/components/reusables/text";
import { cn } from "@/lib/utils";

export interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  secureTextEntry?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  /** Tắt tự sửa lỗi (email/mật khẩu/tìm kiếm nên tắt) */
  autoCorrect?: boolean;
  /** Nhãn nút trên bàn phím: "next" để sang ô kế, "go"/"done" để gửi form. */
  returnKeyType?: TextInputProps["returnKeyType"];
  /** Bấm nút trên bàn phím (chuyển ô kế tiếp / submit form). */
  onSubmitEditing?: TextInputProps["onSubmitEditing"];
  /** Tự focus khi màn hình vừa mở. */
  autoFocus?: boolean;
  /** Gợi ý điền tự động của hệ điều hành (chủ yếu iOS). */
  textContentType?: TextInputProps["textContentType"];
  /** true = đóng bàn phím sau khi submit (mặc định của TextInput). */
  blurOnSubmit?: boolean;
  /** Giới hạn ký tự (khớp giới hạn của API, tránh 400 khi gửi quá dài). */
  maxLength?: number;
  rightSlot?: React.ReactNode;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  className?: string;
}

/** Ô nhập liệu: viền primary khi focus, viền danger khi có lỗi. */
export const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    label,
    value,
    onChangeText,
    placeholder,
    error,
    secureTextEntry = false,
    multiline = false,
    numberOfLines,
    keyboardType,
    autoCapitalize,
    autoCorrect,
    returnKeyType,
    onSubmitEditing,
    autoFocus,
    textContentType,
    blurOnSubmit,
    maxLength,
    rightSlot,
    testID,
    style,
    className,
  },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const hasError = Boolean(error);

  return (
    <View className={className} style={style}>
      {label ? <Text className="mb-1 text-sm font-semibold">{label}</Text> : null}
      <View
        className={cn(
          // Cao tối thiểu 44 (vùng chạm mobile, web chỉ 36), bo góc 12, viền 1px như web, nền card
          "min-h-[44px] flex-row items-center rounded-lg border bg-card px-3",
          multiline && "items-start py-2",
          // Ưu tiên viền: lỗi > đang focus > mặc định
          hasError ? "border-destructive" : focused ? "border-primary" : "border-border",
        )}
      >
        <ReusablesInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          secureTextEntry={secureTextEntry}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : undefined}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          autoFocus={autoFocus}
          textContentType={textContentType}
          blurOnSubmit={blurOnSubmit}
          maxLength={maxLength}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          testID={testID}
          accessibilityLabel={label}
          // Bỏ viền/nền/padding của Reusables — khung ngoài đã lo phần đó
          className={cn(
            "h-auto flex-1 border-0 bg-transparent px-0 py-2.5 text-base text-foreground",
            "placeholder:text-text-faint dark:bg-transparent",
            multiline && "min-h-[88px]",
          )}
          // `textAlignVertical` là style riêng của Android, Tailwind không có utility tương ứng
          style={multiline ? { textAlignVertical: "top" } : undefined}
        />
        {rightSlot ? <View className="ml-2">{rightSlot}</View> : null}
      </View>
      {hasError ? <Text className="mt-1 text-sm text-destructive">{error}</Text> : null}
    </View>
  );
});
