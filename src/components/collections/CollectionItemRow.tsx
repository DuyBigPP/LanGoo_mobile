import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SpeakButton } from "@/components/domain/SpeakButton";
import { WordCell } from "@/components/domain/WordCell";
import { AppText, Chip } from "@/components/ui";
import { useSenseDetail } from "@/hooks/use-dictionary";
import { itemStatusLabel } from "@/lib/dictionary-labels";
import { radius, spacing, useTheme } from "@/theme";
import type { ItemResponseDto, TagDto } from "@/types/api";

export interface CollectionItemRowProps {
  item: ItemResponseDto;
  index: number;
  tagsById: Map<string, TagDto>;
  onOpen: () => void;
  onDelete: () => void;
}

/**
 * Một hàng từ: WordCell (đọc từ cache sense) + loa đọc mặt chữ + chip tag
 * + nghĩa VI + ghi chú + chip trạng thái. Chạm = sửa, nhấn giữ = xoá.
 */
export function CollectionItemRow({ item, index, tagsById, onOpen, onDelete }: CollectionItemRowProps) {
  const theme = useTheme();
  const sense = useSenseDetail(item.display_sense_id ?? item.anchor_sense_id);
  const card = sense.data?.card;
  const itemTags = item.tag_ids
    .map(id => tagsById.get(id))
    .filter((tag): tag is TagDto => Boolean(tag));

  return (
    <Pressable
      onPress={onOpen}
      onLongPress={onDelete}
      delayLongPress={350}
      accessibilityRole="button"
      accessibilityLabel={item.meaning_vi}
      testID={`item-row-${item.id}`}
      className="active:opacity-90"
      style={[styles.row, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
    >
      <View style={styles.header}>
        <WordCell
          surface={card?.lemma ?? "…"}
          reading={card?.reading ?? undefined}
          langCode="ja"
          style={styles.word}
          right={
            card?.lemma ? (
              // Loa đọc mặt chữ ngay trong hàng (như ItemWordCell bản web)
              <SpeakButton text={card.lemma} lang="ja" size="sm" testID={`item-speak-${index}`} />
            ) : undefined
          }
        />
        <Chip>{itemStatusLabel(item.status)}</Chip>
      </View>
      {itemTags.length > 0 ? (
        <View style={styles.tags}>
          {itemTags.map(tag => (
            <Chip key={tag.id}>{tag.name}</Chip>
          ))}
        </View>
      ) : null}
      <AppText variant="body" weight="medium" numberOfLines={2}>
        {item.meaning_vi}
      </AppText>
      {item.note ? (
        <AppText variant="caption" numberOfLines={2}>
          {item.note}
        </AppText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, borderWidth: 1, borderRadius: radius.lg, padding: spacing.md },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  word: { flex: 1 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
