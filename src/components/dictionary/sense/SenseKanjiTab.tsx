import React from "react";
import { Pressable, View } from "react-native";
import { cn } from "@/lib/utils";
import { KanjiDetailContent } from "@/components/dictionary/KanjiDetailContent";
import { AppText } from "@/components/ui";
import { useT } from "@/i18n";

export interface SenseKanjiTabProps {
  /** Các chữ Hán có trong từ. */
  chars: string[];
  active: string;
  onSelect: (char: string) => void;
  onSearchWords: (char: string) => void;
}

/** Tab Hán tự: chọn chữ (khi có nhiều chữ) + chi tiết chữ Hán đang chọn. */
export function SenseKanjiTab({ chars, active, onSelect, onSearchWords }: SenseKanjiTabProps) {
  const t = useT();

  return (
    <>
      {/* Nhiều chữ Hán -> cho chọn chữ đang xem (như web) */}
      {chars.length > 1 ? (
        <View className="gap-2">
          <AppText variant="caption">{t("dict.chooseKanji")}</AppText>
          <View className="flex-row flex-wrap items-center gap-2">
            {chars.map(char => {
              const selected = active === char;
              return (
                <Pressable
                  key={char}
                  onPress={() => onSelect(char)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  testID={`sense-kanji-${char}`}
                  className={cn(
                    "h-11 w-11 items-center justify-center rounded-md border-[1.5px]",
                    selected ? "border-primary bg-primary" : "border-border bg-background",
                  )}
                >
                  <AppText
                    size="lg"
                    weight="semibold"
                    color={selected ? "onPrimary" : "default"}
                  >
                    {char}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      <KanjiDetailContent literal={active} onSearchWords={() => onSearchWords(active)} />
    </>
  );
}
