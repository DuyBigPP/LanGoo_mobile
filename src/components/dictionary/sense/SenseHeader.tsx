import React from "react";
import { StyleSheet, View } from "react-native";
import { Bot, Copy } from "lucide-react-native";
import { SpeakButton } from "@/components/domain/SpeakButton";
import { AppText, Badge, Button, Chip } from "@/components/ui";
import { useT } from "@/i18n";
import { spacing, useTheme } from "@/theme";
import type { SenseCardDto } from "@/types/dictionary";

export interface SenseHeaderProps {
  surface: string;
  card: SenseCardDto | undefined;
  /** Hán–Việt của cả từ (ghép từ dữ liệu chữ Hán của các chữ trong từ). */
  vietnamReadings: string[];
  /** Nhãn từ loại đã dịch. */
  pos: string | null;
  onAskAi: () => void;
  onCopy: () => void;
}

/** Đầu mục: từ, cách đọc, Hán–Việt, chips thông tin + hành động hỏi AI / sao chép. */
export function SenseHeader({ surface, card, vietnamReadings, pos, onAskAi, onCopy }: SenseHeaderProps) {
  const t = useT();
  const theme = useTheme();

  return (
    <View style={styles.header}>
      <View style={styles.top}>
        <AppText size="xxl" weight="bold" numberOfLines={2} style={styles.surface}>
          {surface}
        </AppText>
        <SpeakButton text={surface} lang="ja" />
      </View>
      <View style={styles.meta}>
        {card?.reading && card.reading !== surface ? (
          <AppText variant="caption">{card.reading}</AppText>
        ) : null}
        {card?.romanization ? <AppText variant="caption">{card.romanization}</AppText> : null}
        {vietnamReadings.length > 0 ? (
          <AppText variant="body" weight="semibold">{`「${vietnamReadings.join(", ")}」`}</AppText>
        ) : null}
        {pos ? <Chip>{pos}</Chip> : null}
        {card?.frequency_rank != null ? (
          <Chip>{t("dict.frequency", { rank: card.frequency_rank })}</Chip>
        ) : null}
        {card?.register ? <Chip>{card.register}</Chip> : null}
        {card?.domain ? <Chip>{card.domain}</Chip> : null}
        {card?.gloss_vi_reviewed ? <Badge>{t("dict.reviewed")}</Badge> : null}
      </View>
      {/* Hành động như web: hỏi trợ lý AI kèm nghĩa đang xem, sao chép mặt chữ */}
      <View style={styles.actions}>
        <Button
          label={t("dict.askAi")}
          icon={<Bot size={16} color={theme.colors.text} />}
          variant="outline"
          size="sm"
          onPress={onAskAi}
          disabled={!surface}
          testID="sense-ask-ai"
        />
        <Button
          label={t("dict.copyWord")}
          icon={<Copy size={16} color={theme.colors.text} />}
          variant="outline"
          size="sm"
          onPress={onCopy}
          disabled={!surface}
          testID="sense-copy-word"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm },
  top: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  surface: { flex: 1 },
  meta: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.sm },
  actions: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.sm },
});
