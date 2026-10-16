import * as React from "react";
import { Pressable, View } from "react-native";
import { cn } from "@/lib/utils";
import { AppText } from "@/components/ui";
import { useTagsQuery } from "@/hooks/use-tags";
import { useT } from "@/i18n";

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
    <View className="flex-row flex-wrap gap-2" testID="tag-picker">
      {items.map(tag => {
        const selected = selectedIds.includes(tag.id);
        return (
          <Pressable
            key={tag.id}
            onPress={() => toggle(tag.id)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            testID="tag-option"
            className={cn(
              "rounded-sm border-[1.5px] px-2 py-[3px] active:opacity-85",
              selected ? "border-primary bg-primary" : "border-border bg-card",
            )}
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
