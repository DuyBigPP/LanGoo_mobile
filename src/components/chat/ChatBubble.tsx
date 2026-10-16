import React from "react";
import { Image, View } from "react-native";
import { cn } from "@/lib/utils";
import { AppText } from "@/components/ui";
import { useT } from "@/i18n";
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
  const isUser = role === "user";
  const body = streaming && !thinking && content ? `${content}▍` : content;

  return (
    <View className={cn("w-full", isUser ? "items-end" : "items-start")}>
      <View className="flex-row items-center gap-2">
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
        className={cn(
          "max-w-[85%] rounded-lg border border-border px-3.5 py-2.5",
          isUser ? "bg-primary-soft" : "bg-card",
        )}
        testID={isUser ? "chat-message-user" : "chat-message-assistant"}
      >
        {images && images.length > 0 ? (
          <View className="mb-2 flex-row flex-wrap gap-2" testID="chat-message-images">
            {images.map((uri, index) => (
              <Image key={index} source={{ uri }} className="h-[72px] w-[72px] rounded-md" />
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
