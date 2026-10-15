import { Text, type StyleProp, type TextStyle } from "react-native";
import { cn } from "@/lib/utils";

export type FlagSize = "sm" | "md" | "lg";

export interface FlagProps {
  /**
   * Mã ngôn ngữ/quốc gia: jp/gb/vn/cn (kèm bí danh ja/en/vi vì app dùng mã này),
   * mã khác thì hiện 2 chữ đầu (như bản web).
   */
  code: string;
  size?: FlagSize;
  style?: StyleProp<TextStyle>;
  testID?: string;
}

/** Dấu ngôn ngữ hai mực như bản web: JA = dấu đỏ cam, các ngôn ngữ khác = mực navy. */
const LANGUAGE_MARKS: Record<string, { label: string; stamp?: boolean }> = {
  jp: { label: "JA", stamp: true },
  ja: { label: "JA", stamp: true },
  gb: { label: "EN" },
  us: { label: "EN" },
  en: { label: "EN" },
  vn: { label: "VI" },
  vi: { label: "VI" },
  cn: { label: "ZH" },
  zh: { label: "ZH" },
};

/** Cỡ theo bản web: sm/md/lg = 11/13/15px kèm đệm + bo góc tương ứng. */
const SIZE_CLASS: Record<FlagSize, string> = {
  sm: "rounded-md px-1.5 py-0.5 text-[11px]",
  md: "rounded-md px-2 py-0.5 text-sm",
  lg: "rounded-lg px-2.5 py-1 text-base",
};

/**
 * Dấu ngôn ngữ (thay cờ emoji): hộp nhỏ có viền, chữ JA/EN/VI/ZH in hoa.
 * JA dùng màu đỏ logo, các mã khác dùng mực primary — y như bản web.
 */
export function Flag({ code, size = "md", style, testID }: FlagProps) {
  const mark = LANGUAGE_MARKS[code.toLowerCase()] ?? {
    label: code.toUpperCase().slice(0, 2),
  };
  return (
    <Text
      testID={testID}
      accessibilityRole="image"
      accessibilityLabel={code}
      allowFontScaling={false}
      className={cn(
        "border-[1.5px] text-center font-semibold uppercase leading-none tracking-[0.5px]",
        SIZE_CLASS[size],
        mark.stamp ? "border-brand/70 text-brand" : "border-border text-primary",
      )}
      style={style}
    >
      {mark.label}
    </Text>
  );
}
