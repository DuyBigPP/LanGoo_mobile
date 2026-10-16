import React from "react";
import { View } from "react-native";
import { Archive, NotebookText, Pencil, Play } from "lucide-react-native";
import { ActionMenu, AppText, Button, Card, Chip } from "@/components/ui";
import { useT } from "@/i18n";
import { collectionKindLabel } from "@/lib/dictionary-labels";
import { formatDate, formatNumber } from "@/lib/format";
import { useTheme } from "@/theme";
import type { CollectionDto } from "@/types/api";

export interface NotebookCardProps {
  collection: CollectionDto;
  onOpen: () => void;
  onStudy: () => void;
  onRename: () => void;
  onArchive: () => void;
}

/** Thẻ một sổ tay (mirror web `NotebookCard`): mở chi tiết, học nhanh, menu đổi tên/lưu trữ. */
export function NotebookCard({ collection, onOpen, onStudy, onRename, onArchive }: NotebookCardProps) {
  const t = useT();
  const theme = useTheme();
  const count = formatNumber(collection.visible_item_count ?? collection.item_count);

  return (
    <Card onPress={onOpen} testID={`collection-row-${collection.id}`} className="gap-3">
      <View className="flex-row items-center gap-3">
        <View className="h-9 w-9 items-center justify-center rounded-md border border-border bg-primary-soft">
          <NotebookText size={18} color={theme.colors.primary} />
        </View>
        <View className="flex-1 gap-1">
          <AppText variant="body" weight="semibold" numberOfLines={1}>
            {collection.name}
          </AppText>
          <Chip>{collectionKindLabel(collection.kind)}</Chip>
        </View>
        <ActionMenu
          accessibilityLabel={t("study.collectionMenu")}
          testID={`collection-menu-${collection.id}`}
          items={[
            {
              label: t("study.studyNotebook"),
              icon: <Play size={16} color={theme.colors.text} />,
              onPress: onStudy,
            },
            {
              label: t("study.rename"),
              icon: <Pencil size={16} color={theme.colors.text} />,
              onPress: onRename,
            },
            {
              label: t("study.archive"),
              icon: <Archive size={16} color={theme.colors.danger} />,
              destructive: true,
              onPress: onArchive,
            },
          ]}
        />
      </View>

      <View className="flex-row items-center gap-2">
        <AppText variant="caption" numberOfLines={1} className="flex-1">
          {`${t("study.wordsCount", { count })} · ${formatDate(collection.created_at)}`}
        </AppText>
        {/* Học nhanh ngay trên thẻ — mở sheet chọn hình thức học cho sổ này */}
        <Button
          label={t("study.studyNotebook")}
          variant="outline"
          size="sm"
          icon={<Play size={14} color={theme.colors.text} />}
          onPress={onStudy}
          testID={`collection-study-${collection.id}`}
        />
      </View>
    </Card>
  );
}
