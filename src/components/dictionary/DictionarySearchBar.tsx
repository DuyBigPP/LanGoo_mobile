import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Search, X } from "lucide-react-native";
import {
  AppText,
  Button,
  Card,
  Chip,
  Flag,
  IconButton,
  Input,
  SegmentedControl,
} from "@/components/ui";
import { useT } from "@/i18n";
import { posLabel } from "@/lib/dictionary-labels";
import type { detectLang, LangMode } from "@/lib/lang";
import { spacing, useTheme } from "@/theme";
import type { SearchHitDto } from "@/types/dictionary";

/** Một gợi ý: kết quả trực tiếp, hoặc thể gốc suy ra từ dạng chia (`inflected`). */
export interface SuggestionEntry {
  hit: SearchHitDto;
  inflected: boolean;
}

export interface DictionarySearchBarProps {
  input: string;
  onInputChange: (text: string) => void;
  onClear: () => void;
  onSubmit: () => void;
  langMode: LangMode;
  onLangModeChange: (mode: LangMode) => void;
  /** Ngôn ngữ nhận diện từ ô nhập (chỉ hiện khi ở chế độ tự động). */
  detectedInput: ReturnType<typeof detectLang> | null;
  suggestions: SuggestionEntry[];
  onPickSuggestion: (hit: SearchHitDto) => void;
}

/** Ô tra + nút tra + chế độ ngôn ngữ + chip nhận diện + danh sách gợi ý. */
export function DictionarySearchBar({
  input,
  onInputChange,
  onClear,
  onSubmit,
  langMode,
  onLangModeChange,
  detectedInput,
  suggestions,
  onPickSuggestion,
}: DictionarySearchBarProps) {
  const t = useT();
  const theme = useTheme();

  return (
    <View style={styles.block}>
      <Input
        value={input}
        onChangeText={onInputChange}
        placeholder={t(langMode === "vi" ? "dict.searchPlaceholderVi" : "dict.searchPlaceholder")}
        autoCapitalize="none"
        autoCorrect={false}
        rightSlot={
          input ? (
            <IconButton
              icon={<X size={18} color={theme.colors.textMuted} />}
              onPress={onClear}
              accessibilityLabel={t("dict.searchClear")}
              size="sm"
              testID="dict-clear"
            />
          ) : undefined
        }
        maxLength={100}
        testID="dict-input"
      />
      <Button
        label={t("dict.searchSubmit")}
        size="sm"
        icon={<Search size={16} color={theme.colors.onPrimary} />}
        onPress={onSubmit}
        disabled={!input.trim()}
        fullWidth
        testID="dict-submit"
      />
      <SegmentedControl
        options={[
          { value: "auto", label: t("dict.langAuto") },
          { value: "ja", label: t("dict.langJa") },
          { value: "vi", label: t("dict.langVi") },
        ]}
        value={langMode}
        onChange={value => onLangModeChange(value === "ja" || value === "vi" ? value : "auto")}
        testID="dict-lang-mode"
      />
      {/* Chế độ tự động: chip báo ngôn ngữ đã nhận diện (như web) */}
      {langMode === "auto" && detectedInput ? (
        <View style={styles.detectedRow}>
          <Chip testID="dict-detected">
            {t("dict.detected", {
              lang:
                detectedInput === "ja"
                  ? t("dict.detectedJa")
                  : detectedInput === "vi"
                    ? t("dict.detectedVi")
                    : t("dict.detectedEnOrRomaji"),
            })}
          </Chip>
        </View>
      ) : null}
      {suggestions.length > 0 ? (
        <Card padded={false} testID="dict-suggestions">
          {suggestions.map((entry, index) => (
            <Pressable
              key={`${entry.hit.lexeme_id}-${entry.hit.surface_kind}-${index}`}
              onPress={() => onPickSuggestion(entry.hit)}
              accessibilityRole="button"
              accessibilityLabel={entry.hit.surface}
              testID={`dict-suggestion-${index}`}
              className="active:opacity-85"
              style={styles.suggestionRow}
            >
              <Flag code="jp" size="sm" />
              <AppText variant="body" weight="medium" numberOfLines={1}>
                {entry.hit.surface}
              </AppText>
              {entry.hit.reading && entry.hit.reading !== entry.hit.surface ? (
                <AppText variant="caption" numberOfLines={1}>
                  {entry.hit.reading}
                </AppText>
              ) : null}
              {entry.inflected ? (
                <Chip testID="dict-suggestion-inflected">{t("dict.deinflectChip")}</Chip>
              ) : null}
              {posLabel(entry.hit.pos) ? (
                <View style={styles.suggestionPos}>
                  <Chip>{posLabel(entry.hit.pos)}</Chip>
                </View>
              ) : null}
            </Pressable>
          ))}
        </Card>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.md },
  detectedRow: { flexDirection: "row" },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  suggestionPos: { marginLeft: "auto" },
});
