import React from "react";
import { View } from "react-native";
import { Archive, Pencil, Play } from "lucide-react-native";
import { AppText, Button, Card, Chip } from "@/components/ui";
import { useT } from "@/i18n";
import { collectionKindLabel } from "@/lib/dictionary-labels";
import { formatNumber } from "@/lib/format";
import { useTheme } from "@/theme";

export interface CollectionHeaderCardProps {
  name: string;
  kind: string | undefined;
  description: string | null | undefined;
  wordCount: number;
  onStudy: () => void;
  onRename: () => void;
  onArchive: () => void;
}

/** Đầu trang chi tiết sổ tay: tên, loại, số từ, mô tả + hành động học / đổi tên / lưu trữ. */
export function CollectionHeaderCard({
  name,
  kind,
  description,
  wordCount,
  onStudy,
  onRename,
  onArchive,
}: CollectionHeaderCardProps) {
  const t = useT();
  const theme = useTheme();

  return (
    <Card testID="collection-header">
      <View className="flex-row flex-wrap items-center gap-2">
        <AppText variant="subtitle" numberOfLines={1} className="shrink">
          {name}
        </AppText>
        <Chip>{collectionKindLabel(kind)}</Chip>
      </View>
      <AppText variant="caption">{t("study.wordsCount", { count: formatNumber(wordCount) })}</AppText>
      {description ? (
        <AppText variant="caption" numberOfLines={2}>
          {description}
        </AppText>
      ) : null}
      <View className="mt-3 flex-row flex-wrap gap-2">
        <Button
          label={t("study.studyThis")}
          size="sm"
          icon={<Play size={16} color={theme.colors.onPrimary} />}
          onPress={onStudy}
          testID="study-collection"
        />
        <Button
          label={t("study.rename")}
          size="sm"
          variant="outline"
          icon={<Pencil size={16} color={theme.colors.text} />}
          onPress={onRename}
          testID="rename-collection"
        />
        <Button
          label={t("study.archive")}
          size="sm"
          variant="outline"
          icon={<Archive size={16} color={theme.colors.danger} />}
          onPress={onArchive}
          testID="archive-collection"
        />
      </View>
    </Card>
  );
}

