import React from "react";
import { Image, StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui";
import { useT } from "@/i18n";
import { radius, spacing, useTheme } from "@/theme";
import { formatTime } from "./chat-helpers";
import { ChatMarkdown } from "./ChatMarkdown";
import { ThinkingDots } from "./ThinkingDots";

export interface ChatBubbleProps {
  role: "user" | "assistant";
  content: string;
  /** Thời điểm gửi (ISO) — hiện giờ HH:mm phía trên bong bóng */
  createdAt?: string;
  /** Ảnh của tin user (data URL) — backend không lưu nên chỉ có trong phiên đang mở */
  images?: string[];
  /** Chờ chữ đầu tiên: hiện 3 chấm thay vì bong bóng trống */
  thinking?: boolean;
  /** Đang nhận chữ dần: thêm con trỏ ở cuối nội dung */
  streaming?: boolean;
}

/** Bong bóng tin nhắn: user bên phải (nền primary nhạt), trợ lý bên trái + markdown.
 *  Trên bong bóng có nhãn người gửi + giờ gửi tin (như bản web). */
export function ChatBubble({ role, content, createdAt, images, thinking, streaming }: ChatBubbleProps) {
  const t = useT();
  const theme = useTheme();
  const isUser = role === "user";
  const body = streaming && !thinking && content ? `${content}▍` : content;

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
      <View style={styles.meta}>
        <AppText variant="caption" size="xs">
          {isUser ? t("chat.you") : t("chat.title")}
        </AppText>
        {createdAt ? (
          <AppText variant="caption" size="xs" testID="chat-message-time">
            {formatTime(createdAt)}
          </AppText>
        ) : null}
      </View>
      <View
        style={[
          styles.bubble,
          { borderColor: theme.colors.border },
          isUser
            ? { backgroundColor: theme.colors.primarySoft }
            : { backgroundColor: theme.colors.card },
        ]}
        testID={isUser ? "chat-message-user" : "chat-message-assistant"}
      >
        {images && images.length > 0 ? (
          <View style={styles.images} testID="chat-message-images">
            {images.map((uri, index) => (
              <Image key={index} source={{ uri }} style={styles.image} />
            ))}
          </View>
        ) : null}
        {thinking ? (
          <ThinkingDots />
        ) : isUser ? (
          <AppText variant="body">{body}</AppText>
        ) : (
          <ChatMarkdown content={body} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { width: "100%" },
  rowUser: { alignItems: "flex-end" },
  rowAssistant: { alignItems: "flex-start" },
  meta: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  bubble: {
    maxWidth: "85%",
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  images: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.sm },
  image: { width: 72, height: 72, borderRadius: radius.md },
});
