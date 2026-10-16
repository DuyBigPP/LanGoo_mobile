import React from "react";
import { Pressable, View } from "react-native";
import { cn } from "@/lib/utils";
import { MoreHorizontal } from "lucide-react-native";
import { AppText, Chip, IconButton } from "@/components/ui";
import { useT } from "@/i18n";
import { formatRelativeTime } from "@/lib/format";
import { useTheme } from "@/theme";
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
      className={cn(
        "min-h-[56px] flex-row items-center gap-2 rounded-md p-2 active:bg-primary-soft",
        active && "bg-primary-soft",
      )}
    >
      <View className="flex-1 gap-0.5">
        <View className="flex-row items-center gap-2">
          <AppText
            variant="body"
            weight={active ? "semibold" : "medium"}
            numberOfLines={1}
            className="shrink"
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
        className="self-center"
        testID="chat-session-options"
      />
    </Pressable>
  );
}
