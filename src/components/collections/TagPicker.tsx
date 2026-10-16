import * as React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui";
import { useTagsQuery } from "@/hooks/use-tags";
import { useT } from "@/i18n";
import { radius, spacing, useTheme } from "@/theme";

export interface TagPickerProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

/**
 * Chọn tag cho một từ trong sổ tay (port từ web `TagPicker`).
 * Danh sách tag lấy từ máy chủ; bấm để chọn/bỏ chọn (web chưa có tạo tag tại đây).
 */
export function TagPicker({ selectedIds, onChange }: TagPickerProps) {
  const t = useT();
  const theme = useTheme();
  const tags = useTagsQuery(true);
  const items = tags.data?.data ?? [];

  if (tags.isPending) {
    return <AppText variant="caption">{t("study.tagsLoading")}</AppText>;
  }

  if (items.length === 0) {
    return <AppText variant="caption">{t("study.tagsEmpty")}</AppText>;
  }

  const toggle = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter(value => value !== id)
        : [...selectedIds, id],
    );
  };

  return (
    <View style={styles.wrap} testID="tag-picker">
      {items.map(tag => {
        const selected = selectedIds.includes(tag.id);
        return (
          <Pressable
            key={tag.id}
            onPress={() => toggle(tag.id)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            testID="tag-option"
            className="active:opacity-85" style={[styles.option,
              {
                borderColor: selected ? theme.colors.primary : theme.colors.border,
                backgroundColor: selected ? theme.colors.primary : theme.colors.card,
              }]}
          >
            <AppText
              size="sm"
              weight={selected ? "semibold" : "regular"}
              color={selected ? "onPrimary" : "muted"}
            >
              {tag.name}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  option: {
    borderWidth: 1.5,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  pressed: { opacity: 0.85 },
});
