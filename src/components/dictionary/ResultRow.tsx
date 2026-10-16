import React from "react";
import { StyleSheet, View } from "react-native";
import { SpeakButton } from "@/components/domain/SpeakButton";
import { AppText, Badge, Card, Chip, Flag, Skeleton } from "@/components/ui";
import { useLexemeSenses } from "@/hooks/use-dictionary";
import { useT } from "@/i18n";
import { posLabel, surfaceKindLabel } from "@/lib/dictionary-labels";
import { spacing } from "@/theme";
import type { SearchHitDto } from "@/types/dictionary";

export interface ResultRowProps {
  hit: SearchHitDto;
  testID: string;
  onPress: () => void;
}

/** Một kết quả: mặt chữ, cách đọc, từ loại + gloss xem trước từ nghĩa đầu tiên.
 *  Kèm nhãn "gần đúng", tần suất, đồng âm và loại mặt chữ (như bản web). */
export function ResultRow({ hit, testID, onPress }: ResultRowProps) {
  const t = useT();
  const senses = useLexemeSenses(hit.lexeme_id);
  const first = senses.data?.data[0];
  const gloss = first?.gloss_vi ?? first?.gloss_en ?? first?.definition ?? null;
  // Chỉ giữ huy hiệu "Đã duyệt" — badge "Máy" đã bỏ như bản web
  const reviewed = Boolean(first?.gloss_vi_reviewed);
  const pos = posLabel(hit.pos);
  const kind = surfaceKindLabel(hit.surface_kind);
  const homograph = hit.homograph_no != null && hit.homograph_no > 1 ? hit.homograph_no : null;

  return (
    <Card onPress={onPress} testID={testID} style={styles.card}>
      <View style={styles.top}>
        <Flag code="jp" size="sm" />
        <AppText size="lg" weight="semibold" numberOfLines={1} style={styles.surface}>
          {hit.surface}
        </AppText>
        {hit.reading && hit.reading !== hit.surface ? (
          <AppText variant="caption" numberOfLines={1}>
            {hit.reading}
          </AppText>
        ) : null}
        {pos ? <Chip>{pos}</Chip> : null}
        {/* Kết quả không khớp chính xác -> nhãn "gần đúng" */}
        {!hit.is_exact ? (
          <AppText variant="caption" testID={`${testID}-near-match`}>
            {t("dict.nearMatch")}
          </AppText>
        ) : null}
        {/* Loa đọc mặt chữ — đẩy về bên phải dòng (như bản web) */}
        <View style={styles.speak}>
          <SpeakButton text={hit.surface} lang="ja" size="sm" />
        </View>
      </View>
      {reviewed ? (
        <View style={styles.badgeRow}>
          <Badge tone="success">{t("dict.reviewed")}</Badge>
        </View>
      ) : null}
      {gloss ? (
        <AppText variant="caption" numberOfLines={2}>
          {gloss}
        </AppText>
      ) : senses.isPending ? (
        <Skeleton height={12} width="70%" />
      ) : null}
      {/* Tần suất · đồng âm · loại mặt chữ */}
      {hit.frequency_rank != null || homograph != null || kind ? (
        <View style={styles.meta}>
          {hit.frequency_rank != null ? (
            <AppText variant="caption" size="xs">
              {t("dict.frequency", { rank: hit.frequency_rank })}
            </AppText>
          ) : null}
          {homograph != null ? (
            <AppText variant="caption" size="xs">
              {t("dict.homograph", { n: homograph })}
            </AppText>
          ) : null}
          {kind ? (
            <AppText variant="caption" size="xs">
              {kind}
            </AppText>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  top: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.sm },
  speak: { marginLeft: "auto" },
  surface: { flexShrink: 1 },
  meta: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.md },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
});
