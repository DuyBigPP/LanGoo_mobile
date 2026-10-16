import * as React from "react";
import { FlatList, KeyboardAvoidingView, Platform, View } from "react-native";
import { useBottomTabBarHeight, type BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { Bot, List, MessageSquarePlus } from "lucide-react-native";
import { ApiError } from "@/api/client";
import {
  AppText,
  Button,
  Chip,
  EmptyState,
  IconButton,
  Screen,
  Skeleton,
  toastError,
  useToast,
} from "@/components/ui";
import { ChatBubble } from "@/components/chat/ChatBubble";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { PendingTurn } from "@/components/chat/PendingTurn";
import { SessionManageDialog } from "@/components/chat/SessionManageDialog";
import { SessionsSheet } from "@/components/chat/SessionsSheet";
import { SuggestionChips } from "@/components/chat/SuggestionChips";
import {
  MEDIA_ERROR_KEYS,
  SUGGESTION_KEYS,
  askAboutDraft,
  chatScenarioLabel,
  formatUsage,
  sessionTitle,
} from "@/components/chat/chat-helpers";
import { CHAT_LANGUAGE_ID } from "@/config/env";
import {
  useChatMessagesQuery,
  useChatSessionsQuery,
  useChatStream,
  useChatUsageQuery,
  useCreateChatSessionMutation,
} from "@/hooks/use-chat";
import { useT } from "@/i18n";
import {
  CHAT_IMAGE_MAX_BYTES,
  CHAT_IMAGE_MAX_COUNT,
  imageToDataUrl,
  pickImages,
  type LocalImage,
} from "@/lib/media";
import type { MainTabParamList } from "@/navigation/types";
import { useTheme } from "@/theme";
import type { ChatMessageDto, ChatSessionDto } from "@/types/api";

type ChatScreenProps = BottomTabScreenProps<MainTabParamList, "Chat">;

/** Tab Trợ lý AI: chat streaming SSE, danh sách phiên (đổi tên/lưu trữ), gửi kèm ảnh. */
export function ChatScreen({ route, navigation }: ChatScreenProps) {
  const t = useT();
  const theme = useTheme();
  const { show } = useToast();
  const tabBarHeight = useBottomTabBarHeight();

  const sessionsQuery = useChatSessionsQuery();
  const sessions = React.useMemo(
    () => sessionsQuery.data?.pages.flatMap(page => page.data) ?? [],
    [sessionsQuery.data],
  );

  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [sessionsOpen, setSessionsOpen] = React.useState(false);
  const [manageSession, setManageSession] = React.useState<ChatSessionDto | null>(null);
  const [draft, setDraft] = React.useState("");
  const [images, setImages] = React.useState<LocalImage[]>([]);
  // Nghĩa đang hỏi tới — gửi kèm `ref_sense_id` cho lượt chat kế tiếp (từ phiếu chi tiết nghĩa)
  const [refSenseId, setRefSenseId] = React.useState<string | null>(null);

  const messages = useChatMessagesQuery(sessionId);
  const usage = useChatUsageQuery();
  const createSession = useCreateChatSessionMutation();
  const stream = useChatStream();

  // Mở từ phiếu chi tiết nghĩa (deep-link `ask`/`sense`): soạn sẵn câu hỏi + nhớ nghĩa
  const askWord = route.params?.ask;
  const askSenseId = route.params?.sense;

  React.useEffect(() => {
    if (!askWord) return;
    setDraft(askAboutDraft(t, askWord));
    setRefSenseId(askSenseId ?? null);
    // Xoá tham số để không soạn lại câu hỏi mỗi lần quay lại tab
    navigation.setParams({ ask: undefined, sense: undefined });
  }, [askWord, askSenseId, navigation, t]);

  const messageList = messages.data?.data ?? [];
  const activeSession = sessions.find(session => session.id === sessionId) ?? null;
  // Lượt đang stream chỉ hiện khi thuộc đúng phiên đang mở
  const pendingTurn =
    stream.pending && stream.pending.sessionId === sessionId ? stream.pending : null;
  const suggestions = SUGGESTION_KEYS.map(key => t(key));

  const listRef = React.useRef<FlatList<ChatMessageDto>>(null);
  const scrollToEnd = React.useCallback(() => {
    if (messageList.length > 0 || pendingTurn) {
      listRef.current?.scrollToEnd({ animated: false });
    }
  }, [messageList.length, pendingTurn]);

  const handleSelectSession = (id: string) => {
    setSessionId(id);
    setSessionsOpen(false);
  };

  const handleNewSession = () => {
    setSessionId(null);
    setSessionsOpen(false);
  };

  /** Chọn ảnh từ thư viện — giữ base64 để gửi kèm dạng data URL. */
  const handlePickImages = async () => {
    const remaining = CHAT_IMAGE_MAX_COUNT - images.length;
    if (remaining <= 0) {
      show(t("chat.imageLimit"), { type: "error" });
      return;
    }
    const result = await pickImages({
      remaining,
      maxBytes: CHAT_IMAGE_MAX_BYTES,
      includeBase64: true,
    });
    // Gộp lỗi trùng (nhiều ảnh lỗi cùng loại) rồi hiện từng toast
    const errorMessages = Array.from(new Set(result.errors.map(error => t(MEDIA_ERROR_KEYS[error]))));
    errorMessages.forEach(message => show(message, { type: "error" }));
    if (result.images.length > 0) {
      setImages(previous => [...previous, ...result.images].slice(0, CHAT_IMAGE_MAX_COUNT));
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(previous => previous.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleSend = async () => {
    const content = draft.trim();
    if (!content || stream.streaming || createSession.isPending) return;
    const attached = images;
    const senseId = refSenseId;
    setDraft("");
    setImages([]);
    setRefSenseId(null);

    try {
      let targetId = sessionId;
      if (!targetId) {
        // Câu đầu tiên: tạo phiên, đặt tên theo một phần câu hỏi rồi gửi luôn
        const session = await createSession.mutateAsync({
          language_id: CHAT_LANGUAGE_ID,
          scenario: "general",
          title: content.slice(0, 60),
        });
        targetId = session.id;
        setSessionId(session.id);
      }

      const dataUrls = attached
        .map(imageToDataUrl)
        .filter((url): url is string => url !== null);
      await stream.send(
        targetId,
        content,
        senseId ?? undefined,
        dataUrls.length > 0 ? dataUrls : undefined,
      );
    } catch (error) {
      // Chỉ lỗi ở bước tạo phiên mới rơi vào đây; lỗi stream nằm trong stream.pending
      setDraft(content);
      setImages(attached);
      setRefSenseId(senseId);
      toastError(ApiError.from(error).message);
    }
  };

  const handleArchived = (id: string) => {
    if (id === sessionId) setSessionId(null);
  };

  const headerRight = (
    <>
      <IconButton
        icon={<List size={20} color={theme.colors.text} />}
        onPress={() => setSessionsOpen(true)}
        accessibilityLabel={t("chat.sessionsToggle")}
        size="sm"
        testID="chat-sessions-toggle"
      />
      <IconButton
        icon={<MessageSquarePlus size={20} color={theme.colors.primary} />}
        onPress={handleNewSession}
        accessibilityLabel={t("chat.newSession")}
        size="sm"
        testID="chat-new-session"
      />
    </>
  );

  // Trạng thái rỗng của khung tin nhắn (chưa chọn phiên / phiên trống / đang tải / lỗi)
  const emptyContent =
    messages.isPending && sessionId ? (
      <View className="gap-3 py-4">
        <Skeleton height={56} width="70%" className="rounded-lg" />
        <Skeleton height={56} width="55%" className="self-end rounded-lg" />
      </View>
    ) : messages.isError ? (
      <View className="flex-1 justify-center gap-3 py-5">
        <AppText variant="caption" center>
          {t("chat.messagesLoadError")}
        </AppText>
        <Button
          label={t("common.retry")}
          variant="outline"
          size="sm"
          onPress={() => void messages.refetch()}
          className="self-center"
          testID="chat-messages-retry"
        />
      </View>
    ) : sessionId ? (
      <View className="flex-1 justify-center gap-3 py-5">
        <AppText variant="caption" center>
          {t("chat.emptySession")}
        </AppText>
        <SuggestionChips suggestions={suggestions} onPick={setDraft} />
      </View>
    ) : (
      <View className="flex-1 justify-center gap-3 py-5">
        <EmptyState
          icon={<Bot size={30} color={theme.colors.primary} />}
          title={t("chat.askAnything")}
          description={t("chat.askAnythingHint")}
        />
        <SuggestionChips suggestions={suggestions} onPick={setDraft} />
      </View>
    );

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={tabBarHeight}
    >
      <Screen
        title={t("chat.title")}
        right={headerRight}
        contentClassName="p-0"
        testID="chat-screen"
      >
        <View className="flex-1">
          {/* Dòng phụ: phiên đang mở (kèm chip kịch bản) + số lượt chat đã dùng */}
          <View className="flex-row items-center justify-between gap-2 border-b-hairline border-border px-4 py-2">
            <View className="flex-1 flex-row items-center gap-2">
              <AppText variant="caption" numberOfLines={1} className="shrink">
                {activeSession
                  ? sessionTitle(activeSession.title, t("chat.untitled"))
                  : t("chat.newConversation")}
              </AppText>
              {activeSession ? (
                <Chip testID="chat-scenario-chip">{chatScenarioLabel(activeSession.scenario)}</Chip>
              ) : null}
            </View>
            {usage.data ? (
              <AppText variant="caption">
                {formatUsage(usage.data.request_count, usage.data.limit)}
              </AppText>
            ) : null}
          </View>

          <FlatList
            ref={listRef}
            data={messageList}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <ChatBubble
                role={item.role}
                content={item.content}
                createdAt={item.created_at}
                images={item.role === "user" ? stream.sentImages[item.id] : undefined}
              />
            )}
            className="flex-1"
            contentContainerClassName="grow gap-3 px-4 py-3"
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
            onContentSizeChange={scrollToEnd}
            ListEmptyComponent={pendingTurn ? null : emptyContent}
            ListFooterComponent={
              pendingTurn ? (
                <PendingTurn
                  turn={pendingTurn}
                  onRetry={stream.retry}
                  onDismiss={stream.dismiss}
                />
              ) : null
            }
            testID="chat-messages"
          />

          <ChatComposer
            draft={draft}
            onDraftChange={setDraft}
            images={images}
            onPickImages={() => void handlePickImages()}
            onRemoveImage={handleRemoveImage}
            streaming={stream.streaming}
            creating={createSession.isPending}
            onSend={() => void handleSend()}
            onStop={stream.cancel}
          />
        </View>

        <SessionsSheet
          visible={sessionsOpen}
          onClose={() => setSessionsOpen(false)}
          sessions={sessions}
          activeId={sessionId}
          isPending={sessionsQuery.isPending}
          isError={sessionsQuery.isError}
          hasNextPage={Boolean(sessionsQuery.hasNextPage)}
          isFetchingNextPage={sessionsQuery.isFetchingNextPage}
          onLoadMore={() => void sessionsQuery.fetchNextPage()}
          onNew={handleNewSession}
          onSelect={handleSelectSession}
          onManage={session => {
            // Dialog Reusables render qua Portal -> phải đóng sheet (Modal gốc) trước, kẻo bị che
            setSessionsOpen(false);
            setManageSession(session);
          }}
        />

        {manageSession ? (
          <SessionManageDialog
            session={manageSession}
            onClose={() => setManageSession(null)}
            onArchived={handleArchived}
          />
        ) : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}
