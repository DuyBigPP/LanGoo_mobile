import React from "react";
import { StyleSheet, View } from "react-native";
import { Archive, NotebookText, Pencil, Play } from "lucide-react-native";
import { ActionMenu, AppText, Button, Card, Chip } from "@/components/ui";
import { useT } from "@/i18n";
import { collectionKindLabel } from "@/lib/dictionary-labels";
import { formatDate, formatNumber } from "@/lib/format";
import { radius, spacing, useTheme } from "@/theme";
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
    <Card onPress={onOpen} testID={`collection-row-${collection.id}`} style={styles.card}>
      <View style={styles.top}>
        <View
          style={[
            styles.icon,
            { borderColor: theme.colors.border, backgroundColor: theme.colors.primarySoft },
          ]}
        >
          <NotebookText size={18} color={theme.colors.primary} />
        </View>
        <View style={styles.info}>
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

      <View style={styles.footer}>
        <AppText variant="caption" numberOfLines={1} style={styles.meta}>
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

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  top: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  icon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: radius.md,
  },
  info: { flex: 1, gap: spacing.xs },
  footer: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  meta: { flex: 1 },
});
