import * as React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Check, Flag } from "lucide-react-native";
import { ApiError } from "@/api/client";
import type { GlossReportIssue } from "@/api/dictionary";
import { AppText, BottomSheet, Button, Divider, Input, useToast } from "@/components/ui";
import { useGlossReportMutation } from "@/hooks/use-dictionary";
import { useT } from "@/i18n";
import { spacing, useTheme } from "@/theme";
import type { SenseGlossDto } from "@/types/dictionary";

/** Lý do báo lỗi — nhãn lấy từ khoá i18n dict.report* (như bản web). */
const ISSUE_OPTIONS: { value: GlossReportIssue; labelKey: string }[] = [
  { value: "wrong", labelKey: "dict.reportWrong" },
  { value: "missing", labelKey: "dict.reportMissing" },
  { value: "offensive", labelKey: "dict.reportOffensive" },
  { value: "other", labelKey: "dict.reportOther" },
];

/** Giới hạn ghi chú như web (Textarea maxLength=500) */
const MAX_COMMENT = 500;

export interface ReportGlossSheetProps {
  visible: boolean;
  /** Nghĩa đang báo lỗi; null thì không có gì để hiện */
  gloss: SenseGlossDto | null;
  onClose: () => void;
}

/**
 * Sheet "Báo lỗi nghĩa" (bản mobile của ReportGlossDialog bên web):
 * chọn lý do + ghi chú rồi gửi POST /v1/gloss-reports cho đúng gloss đang xem.
 */
export function ReportGlossSheet({ visible, gloss, onClose }: ReportGlossSheetProps) {
  const t = useT();
  const theme = useTheme();
  const { show } = useToast();
  const report = useGlossReportMutation();
  const [issue, setIssue] = React.useState<GlossReportIssue>("wrong");
  const [comment, setComment] = React.useState("");

  // Mở sheet -> nội dung nhập của lần trước không giữ lại
  React.useEffect(() => {
    if (visible) {
      setIssue("wrong");
      setComment("");
    }
  }, [visible]);

  if (!gloss) return null;

  const handleSubmit = () => {
    report.mutate(
      {
        target_kind: "sense_gloss",
        target_id: gloss.id,
        language_id: gloss.language_id,
        issue,
        comment: comment.trim() || undefined,
      },
      {
        onSuccess: () => {
          show(t("dict.reportSent"), { type: "success" });
          onClose();
        },
        onError: error => show(ApiError.from(error).message, { type: "error" }),
      },
    );
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t("dict.reportTitle")}
      testID="report-gloss"
    >
      <View style={styles.body}>
        <AppText variant="caption" numberOfLines={2}>
          {`“${gloss.text}”`}
        </AppText>

        <View style={styles.block}>
          <AppText variant="label">{t("dict.reportIssue")}</AppText>
          {ISSUE_OPTIONS.map((option, index) => {
            const selected = option.value === issue;
            return (
              <View key={option.value}>
                {index > 0 ? <Divider /> : null}
                <Pressable
                  onPress={() => setIssue(option.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  testID={`report-issue-${option.value}`}
                  style={({ pressed }) => [styles.issueRow, pressed ? styles.rowPressed : null]}
                >
                  <AppText
                    variant="body"
                    weight={selected ? "semibold" : "regular"}
                    style={styles.flex}
                  >
                    {t(option.labelKey)}
                  </AppText>
                  {selected ? <Check size={18} color={theme.colors.primary} /> : null}
                </Pressable>
              </View>
            );
          })}
        </View>

        <Input
          label={t("dict.reportComment")}
          value={comment}
          onChangeText={text => setComment(text.slice(0, MAX_COMMENT))}
          placeholder={t("dict.reportPlaceholder")}
          multiline
          numberOfLines={3}
          testID="report-comment"
        />

        <View style={styles.actions}>
          <Button
            label={t("common.cancel")}
            variant="outline"
            onPress={onClose}
            testID="report-cancel"
          />
          <Button
            label={t("dict.reportSubmit")}
            icon={<Flag size={14} color={theme.colors.onPrimary} />}
            onPress={handleSubmit}
            loading={report.isPending}
            testID="report-submit"
          />
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.md, paddingBottom: spacing.md },
  flex: { flex: 1 },
  block: { gap: spacing.sm },
  issueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 44,
    paddingVertical: spacing.xs,
  },
  rowPressed: { opacity: 0.85 },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm },
});
