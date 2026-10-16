import React from "react";
import { LookupText } from "@/components/domain/LookupText";
import { AppText } from "@/components/ui";

export interface QuizContextSentenceProps {
  sentence: string;
  start: number | null;
  end: number | null;
  onLookup: (char: string, index: number) => void;
}

/**
 * Câu ngữ cảnh + highlight từ khoá.
 * Offset là CODE POINT (không phải UTF-16), `end` exclusive — cắt bằng Array.from
 * để không lệch khi câu có ký tự ngoài BMP (emoji, kanji hiếm).
 * Từng ký tự nhấn giữ được để tra nhanh (xem LookupText) — offset của đoạn
 * highlight được cộng bù để index trả về luôn tính theo cả câu.
 */
export function QuizContextSentence({ sentence, start, end, onLookup }: QuizContextSentenceProps) {
  const chars = Array.from(sentence);
  const from = typeof start === "number" ? Math.max(0, Math.min(chars.length, start)) : -1;
  const to = typeof end === "number" ? Math.max(0, Math.min(chars.length, end)) : -1;

  if (from < 0 || to <= from) {
    return (
      <AppText variant="caption" center>
        <LookupText text={sentence} onLookup={onLookup} />
      </AppText>
    );
  }

  return (
    <AppText variant="caption" center>
      <LookupText text={chars.slice(0, from).join("")} onLookup={onLookup} />
      <AppText
        variant="caption"
        weight="semibold"
        color="primary"
        testID="quiz-context-target"
        className="rounded-[4px] bg-primary-soft"
      >
        <LookupText
          text={chars.slice(from, to).join("")}
          onLookup={(char, index) => onLookup(char, from + index)}
        />
      </AppText>
      <LookupText
        text={chars.slice(to).join("")}
        onLookup={(char, index) => onLookup(char, to + index)}
      />
    </AppText>
  );
}
