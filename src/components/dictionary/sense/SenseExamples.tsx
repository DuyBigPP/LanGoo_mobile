import React from "react";
import { View } from "react-native";
import { LookupText } from "@/components/domain/LookupText";
import { SpeakButton } from "@/components/domain/SpeakButton";
import { AppText, Card, SectionHeader } from "@/components/ui";
import { useT } from "@/i18n";
import { findExampleTarget } from "@/lib/example-highlight";
import type { SenseExampleDto } from "@/types/dictionary";

export interface SenseExamplesProps {
  examples: SenseExampleDto[];
  /** Từ đang tra — được tô đỏ logo trong câu ví dụ. */
  surface: string;
  onLookup: (char: string, index: number) => void;
}

/** Bản dịch ví dụ ưu tiên tiếng Việt, sau đó tiếng Anh. */
function exampleTranslation(example: SenseExampleDto): string | null {
  return example.translation.vi ?? example.translation.en ?? null;
}

/** Mục Ví dụ: mỗi câu kèm bản dịch và loa đọc. */
export function SenseExamples({ examples, surface, onLookup }: SenseExamplesProps) {
  const t = useT();
  if (examples.length === 0) return null;

  return (
    <View className="gap-2">
      <SectionHeader title={t("dict.sectionExample")} />
      {examples.map(example => {
        const translation = exampleTranslation(example);
        return (
          <Card key={example.id} className="gap-1">
            <View className="flex-row items-start gap-2">
              <View className="flex-1">
                <AppText variant="body">
                  <ExampleSentence text={example.text} target={surface} onLookup={onLookup} />
                </AppText>
                {translation ? <AppText variant="caption">{translation}</AppText> : null}
              </View>
              {/* Loa đọc từng ví dụ (như bản web) */}
              <SpeakButton text={example.text} lang="ja" size="sm" />
            </View>
          </Card>
        );
      })}
    </View>
  );
}

/**
 * Câu ví dụ + highlight từ đang tra bằng màu đỏ logo (offset theo code point).
 * Từng ký tự nhấn giữ được để tra nhanh (xem LookupText); không tìm thấy từ
 * trong câu thì vẫn render bình thường, chỉ không highlight.
 */
function ExampleSentence({
  text,
  target,
  onLookup,
}: {
  text: string;
  target: string;
  onLookup: (char: string, index: number) => void;
}) {
  const range = target ? findExampleTarget(text, target) : null;
  if (!range) return <LookupText text={text} onLookup={onLookup} />;

  const chars = Array.from(text);
  return (
    <>
      <LookupText text={chars.slice(0, range.start).join("")} onLookup={onLookup} />
      <AppText testID="example-target" weight="semibold" className="text-brand">
        <LookupText
          text={chars.slice(range.start, range.end).join("")}
          onLookup={(char, index) => onLookup(char, range.start + index)}
        />
      </AppText>
      <LookupText
        text={chars.slice(range.end).join("")}
        onLookup={(char, index) => onLookup(char, range.end + index)}
      />
    </>
  );
}
