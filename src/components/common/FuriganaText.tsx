import React from "react";
import { View } from "react-native";
import { AppText } from "@/components/ui";
import type { FuriganaSegment } from "@/lib/furigana";

export interface FuriganaTextProps {
  segments: FuriganaSegment[];
  /** Cỡ chữ chính (px); furigana nhỏ hơn ~55%. */
  size?: number;
}

/**
 * Văn bản tiếng Nhật kèm furigana trên đầu chữ Hán — RN không có <ruby> nên mỗi đoạn là một cột
 * (dòng reading nhỏ trên, chữ chính dưới); đoạn không có reading vẫn chừa dòng trống để thẳng hàng.
 */
export function FuriganaText({ segments, size = 18 }: FuriganaTextProps) {
  const rubySize = Math.round(size * 0.55);
  return (
    <View className="flex-row flex-wrap items-end" accessibilityLabel={segments.map(s => s.text).join("")}>
      {segments.map((segment, index) => (
        <View key={`${index}-${segment.text}`} className="items-center">
          <AppText
            color="muted"
            style={{ fontSize: rubySize, lineHeight: Math.round(rubySize * 1.3) }}
            numberOfLines={1}
          >
            {segment.ruby ?? " "}
          </AppText>
          <AppText style={{ fontSize: size, lineHeight: Math.round(size * 1.35) }}>
            {segment.text}
          </AppText>
        </View>
      ))}
    </View>
  );
}
