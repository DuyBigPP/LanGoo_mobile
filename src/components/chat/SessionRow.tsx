import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { MoreHorizontal } from "lucide-react-native";
import { AppText, Chip, IconButton } from "@/components/ui";
import { useT } from "@/i18n";
import { formatRelativeTime } from "@/lib/format";
import { radius, spacing, useTheme } from "@/theme";
import type { ChatSessionDto } from "@/types/api";
import { chatScenarioLabel, sessionTitle } from "./chat-helpers";

export interface SessionRowProps {
  session: ChatSessionDto;
  active: boolean;
  onSelect: () => void;
  onManage: () => void;
}

/** Một phiên trong danh sách: chạm = mở, nhấn giữ (hoặc nút ...) = tuỳ chọn. */
export function SessionRow({ session, active, onSelect, onManage }: SessionRowProps) {
  const t = useT();
  const theme = useTheme();
  const lastAt = session.last_message_at ?? session.created_at;

  return (
    <Pressable
      onPress={onSelect}
      onLongPress={onManage}
      delayLongPress={350}
      accessibilityRole="button"
      accessibilityLabel={sessionTitle(session.title, t("chat.untitled"))}
      testID="chat-session-item"
      className="active:bg-primary-soft"
      style={[styles.row, active ? { backgroundColor: theme.colors.primarySoft } : null]}
    >
      <View style={styles.info}>
        <View style={styles.titleRow}>
          <AppText
            variant="body"
            weight={active ? "semibold" : "medium"}
            numberOfLines={1}
            style={styles.title}
          >
            {sessionTitle(session.title, t("chat.untitled"))}
          </AppText>
          <Chip>{chatScenarioLabel(session.scenario)}</Chip>
        </View>
        <AppText variant="caption" numberOfLines={1}>
          {`${t("chat.messagesUnit", { count: session.message_count })} · ${formatRelativeTime(lastAt)}`}
        </AppText>
      </View>
      <IconButton
        icon={<MoreHorizontal size={18} color={theme.colors.textMuted} />}
        onPress={onManage}
        accessibilityLabel={t("chat.sessionOptions")}
        size="sm"
        style={styles.optionsButton}
        testID="chat-session-options"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 56,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  info: { flex: 1, gap: 2 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { flexShrink: 1 },
  optionsButton: { alignSelf: "center" },
});
