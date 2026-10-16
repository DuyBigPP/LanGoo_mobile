import * as React from "react";
import { ScrollView, View, useWindowDimensions } from "react-native";
import { MessageSquarePlus } from "lucide-react-native";
import { AppText, BottomSheet, Button, Divider, Skeleton } from "@/components/ui";
import { useT } from "@/i18n";
import { useTheme } from "@/theme";
import type { ChatSessionDto } from "@/types/api";
import { SessionRow } from "./SessionRow";

export interface SessionsSheetProps {
  visible: boolean;
  onClose: () => void;
  sessions: ChatSessionDto[];
  /** Phiên đang mở (được tô nền). */
  activeId: string | null;
  isPending: boolean;
  isError: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  onNew: () => void;
  onSelect: (id: string) => void;
  onManage: (session: ChatSessionDto) => void;
}

/** Danh sách phiên: chạm = mở, nhấn giữ (hoặc nút ...) = đổi tên/lưu trữ. */
export function SessionsSheet({
  visible,
  onClose,
  sessions,
  activeId,
  isPending,
  isError,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onNew,
  onSelect,
  onManage,
}: SessionsSheetProps) {
  const t = useT();
  const theme = useTheme();
  const { height: windowHeight } = useWindowDimensions();

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t("chat.sessions")}
      testID="chat-sessions-sheet"
    >
      <Button
        label={t("chat.newSession")}
        variant="outline"
        size="sm"
        icon={<MessageSquarePlus size={16} color={theme.colors.text} />}
        onPress={onNew}
        fullWidth
        className="mb-2"
        testID="chat-new-session-sheet"
      />
      <ScrollView
        style={{ maxHeight: Math.max(240, windowHeight * 0.55) }}
        contentContainerClassName="pb-2"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {isPending ? (
          <View className="gap-4 py-4">
            {[0, 1, 2].map(index => (
              <View key={index} className="gap-2">
                <Skeleton height={16} width="55%" />
                <Skeleton height={12} width="35%" />
              </View>
            ))}
          </View>
        ) : isError ? (
          <AppText variant="caption" center className="py-7">
            {t("chat.sessionsLoadError")}
          </AppText>
        ) : sessions.length === 0 ? (
          <AppText variant="caption" center className="py-7">
            {t("chat.noSessions")}
          </AppText>
        ) : (
          sessions.map((session, index) => (
            <React.Fragment key={session.id}>
              {index > 0 ? <Divider /> : null}
              <SessionRow
                session={session}
                active={session.id === activeId}
                onSelect={() => onSelect(session.id)}
                onManage={() => onManage(session)}
              />
            </React.Fragment>
          ))
        )}
        {hasNextPage ? (
          <View className="items-center py-3">
            <Button
              label={isFetchingNextPage ? t("common.loading") : t("common.loadMore")}
              variant="outline"
              size="sm"
              onPress={onLoadMore}
              disabled={isFetchingNextPage}
              className="self-center"
              testID="chat-sessions-more"
            />
          </View>
        ) : null}
      </ScrollView>
    </BottomSheet>
  );
}
