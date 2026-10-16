import React from "react";
import { StyleSheet, View } from "react-native";
import { AppText, Button } from "@/components/ui";
import type { ChatPendingTurn } from "@/hooks/use-chat";
import { useT } from "@/i18n";
import { spacing } from "@/theme";
import { ChatBubble } from "./ChatBubble";

export interface PendingTurnProps {
  turn: ChatPendingTurn;
  onRetry: () => void;
  onDismiss: () => void;
}

/** Lượt đang stream / lỗi / đã dừng: tin user tạm + phần trả lời đang chảy. */
export function PendingTurn({ turn, onRetry, onDismiss }: PendingTurnProps) {
  const t = useT();
  const streaming = turn.status === "streaming";
  // Tin tạm chưa có id/thời điểm từ server -> lấy giờ hiện tại (như web `localMessage`)
  const stamp = new Date().toISOString();

  return (
    <View style={styles.wrap}>
      <ChatBubble role="user" content={turn.content} createdAt={stamp} images={turn.images} />
      <ChatBubble
        role="assistant"
        content={turn.partial}
        createdAt={stamp}
        thinking={streaming && !turn.partial}
        streaming={streaming}
      />
      {!streaming ? (
        <View style={styles.actions}>
          <AppText variant="caption" color={turn.status === "error" ? "danger" : "muted"}>
            {turn.status === "error" ? turn.error || t("chat.turnError") : t("chat.stopped")}
          </AppText>
          <Button
            label={t("chat.retry")}
            variant="outline"
            size="sm"
            onPress={onRetry}
            testID="chat-retry"
          />
          <Button
            label={t("common.close")}
            variant="ghost"
            size="sm"
            onPress={onDismiss}
            testID="chat-dismiss"
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingLeft: spacing.xs,
  },
});
