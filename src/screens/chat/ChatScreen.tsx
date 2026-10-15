import * as React from "react";
import {
  Animated,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useBottomTabBarHeight, type BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { format } from "date-fns";
import {
  Bot,
  ImagePlus,
  List,
  MessageSquarePlus,
  MoreHorizontal,
  SendHorizontal,
  Square,
  X,
} from "lucide-react-native";
import Markdown from "react-native-markdown-display";
import { ApiError } from "@/api/client";
import {
  AppText,
  BottomSheet,
  Button,
  Chip,
  Dialog,
  Divider,
  EmptyState,
  IconButton,
  Input,
  Screen,
  Skeleton,
  toastError,
  useToast,
  type DialogAction,
} from "@/components/ui";
import { CHAT_LANGUAGE_ID } from "@/config/env";
import {
  useArchiveChatSessionMutation,
  useChatMessagesQuery,
  useChatSessionsQuery,
  useChatStream,
  useChatUsageQuery,
  useCreateChatSessionMutation,
  useUpdateChatSessionMutation,
  type ChatPendingTurn,
} from "@/hooks/use-chat";
import { translate, useT } from "@/i18n";
import { formatRelativeTime } from "@/lib/format";
import {
  CHAT_IMAGE_MAX_BYTES,
  CHAT_IMAGE_MAX_COUNT,
  imageToDataUrl,
  pickImages,
  type LocalImage,
  type MediaError,
} from "@/lib/media";
import type { MainTabParamList } from "@/navigation/types";
import { fontSize, radius, spacing, useTheme, type Theme } from "@/theme";
import type { ChatMessageDto, ChatSessionDto } from "@/types/api";

type ChatScreenProps = BottomTabScreenProps<MainTabParamList, "Chat">;

/** Lỗi chọn ảnh -> khoá thông báo tương ứng (giống web). */
const MEDIA_ERROR_KEYS: Record<MediaError, string> = {
  count: "chat.imageLimit",
  size: "chat.imageTooLarge",
  type: "chat.imageBadType",
  read: "chat.imageReadError",
};

/** 3 câu hỏi gợi ý cho phiên trống (dùng khoá i18n chat.suggest*). */
const SUGGESTION_KEYS = [
  "chat.suggestGeneral1",
  "chat.suggestGeneral2",
  "chat.suggestVocabulary1",
] as const;

/** Kịch bản phiên chat -> khoá i18n (mirror web `chatScenarioLabel`). */
const SCENARIO_KEYS: Record<string, string> = {
  general: "chat.scenarioGeneral",
  vocabulary: "chat.scenarioVocabulary",
  grammar: "chat.scenarioGrammar",
  conversation: "chat.scenarioConversation",
};

/** Khoá i18n cho câu hỏi soạn sẵn khi mở chat từ chi tiết nghĩa. */
const ASK_ABOUT_KEY = "chat.askAbout";
/** Thiếu khoá i18n `chat.askAbout` — dùng tạm câu tiếng Việt của bản web (đã ghi trong báo cáo). */
const ASK_ABOUT_FALLBACK = "Giải thích từ 「{word}」 giúp mình: nghĩa, cách dùng và một câu ví dụ.";

const MONO_FONT = Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" });

/** Nhãn kịch bản của phiên (Tổng quát / Từ vựng / Ngữ pháp / Hội thoại). */
function chatScenarioLabel(scenario: string | null | undefined): string {
  const key = (scenario && SCENARIO_KEYS[scenario]) || SCENARIO_KEYS.general;
  return translate(key);
}

/** Giờ gửi tin (HH:mm) — bản web dùng Intl "vi-VN", ở đây dùng date-fns cho gọn. */
function formatTime(iso: string): string {
  try {
    return format(new Date(iso), "HH:mm");
  } catch {
    return "";
  }
}

/** Câu hỏi soạn sẵn khi mở từ phiếu chi tiết nghĩa (web `/chat?ask=…&sense=…`). */
function askAboutDraft(t: (key: string, params?: Record<string, string | number>) => string, word: string) {
  const template = t(ASK_ABOUT_KEY, { word });
  // Khoá i18n chưa có -> t() trả lại chính khoá, dùng tạm câu tiếng Việt của bản web
  return template === ASK_ABOUT_KEY ? ASK_ABOUT_FALLBACK.replace("{word}", word) : template;
}

/** Tên phiên hiển thị — chưa đặt tên thì dùng nhãn mặc định. */
function sessionTitle(title: string | null, untitled: string): string {
  const trimmed = title?.trim();
  return trimmed ? trimmed : untitled;
}

/** Dòng "lượt đã dùng" của chat. */
function formatUsage(count: number, limit: number): string {
  return translate("chat.usage", { count, limit });
}

/** Tab Trợ lý AI: chat streaming SSE, danh sách phiên (đổi tên/lưu trữ), gửi kèm ảnh. */
export function ChatScreen({ route, navigation }: ChatScreenProps) {
  const t = useT();
  const theme = useTheme();
  const { show } = useToast();
  const tabBarHeight = useBottomTabBarHeight();
  const { height: windowHeight } = useWindowDimensions();

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
  const [inputFocused, setInputFocused] = React.useState(false);
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
      <View style={styles.skeletonWrap}>
        <Skeleton height={56} width="70%" radius={radius.lg} />
        <Skeleton height={56} width="55%" radius={radius.lg} style={styles.skeletonRight} />
      </View>
    ) : messages.isError ? (
      <View style={styles.emptyWrap}>
        <AppText variant="caption" center>
          {t("chat.messagesLoadError")}
        </AppText>
        <Button
          label={t("common.retry")}
          variant="outline"
          size="sm"
          onPress={() => void messages.refetch()}
          style={styles.emptyAction}
          testID="chat-messages-retry"
        />
      </View>
    ) : sessionId ? (
      <View style={styles.emptyWrap}>
        <AppText variant="caption" center>
          {t("chat.emptySession")}
        </AppText>
        <SuggestionChips suggestions={suggestions} onPick={setDraft} />
      </View>
    ) : (
      <View style={styles.emptyWrap}>
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
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={tabBarHeight}
    >
      <Screen
        title={t("chat.title")}
        right={headerRight}
        contentStyle={styles.screenContent}
        testID="chat-screen"
      >
        <View style={styles.flex}>
          {/* Dòng phụ: phiên đang mở (kèm chip kịch bản) + số lượt chat đã dùng */}
          <View style={[styles.metaRow, { borderBottomColor: theme.colors.border }]}>
            <View style={styles.metaSession}>
              <AppText variant="caption" numberOfLines={1} style={styles.metaTitle}>
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
            style={styles.list}
            contentContainerStyle={styles.listContent}
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

          {/* Ô soạn tin: ảnh đính kèm + nhập nội dung + gửi/dừng */}
          <View
            style={[
              styles.composer,
              { borderTopColor: theme.colors.border, backgroundColor: theme.colors.card },
            ]}
          >
            {images.length > 0 ? (
              <View style={styles.previews}>
                {images.map((image, index) => (
                  <View key={`${image.uri}-${index}`} style={styles.previewWrap}>
                    <Image
                      source={{ uri: image.uri }}
                      style={[styles.previewImage, { borderColor: theme.colors.border }]}
                    />
                    <IconButton
                      icon={<X size={12} color={theme.colors.text} />}
                      onPress={() => handleRemoveImage(index)}
                      accessibilityLabel={t("chat.imageRemove")}
                      size="sm"
                      variant="outline"
                      style={[styles.previewRemove, { backgroundColor: theme.colors.card }]}
                      testID={`chat-image-remove-${index}`}
                    />
                  </View>
                ))}
                <AppText variant="caption">
                  {t("chat.imageCount", { count: images.length, max: CHAT_IMAGE_MAX_COUNT })}
                </AppText>
              </View>
            ) : null}

            <View style={styles.composerRow}>
              <IconButton
                icon={<ImagePlus size={20} color={theme.colors.text} />}
                onPress={() => void handlePickImages()}
                accessibilityLabel={t("chat.attachImage")}
                variant="outline"
                disabled={
                  stream.streaming ||
                  createSession.isPending ||
                  images.length >= CHAT_IMAGE_MAX_COUNT
                }
                style={styles.composerButton}
                testID="chat-attach-image"
              />
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder={t("chat.composerPlaceholder")}
                placeholderTextColor={theme.colors.textFaint}
                multiline
                editable={!stream.streaming && !createSession.isPending}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                testID="chat-input"
                style={[
                  styles.composerInput,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: inputFocused ? theme.colors.primary : theme.colors.border,
                    color: theme.colors.text,
                  },
                ]}
              />
              {stream.streaming ? (
                <Button
                  label={t("chat.stop")}
                  variant="outline"
                  size="sm"
                  icon={<Square size={14} color={theme.colors.text} />}
                  onPress={stream.cancel}
                  style={styles.composerButton}
                  testID="chat-stop"
                />
              ) : (
                <Button
                  label={t("chat.send")}
                  size="sm"
                  icon={<SendHorizontal size={15} color={theme.colors.onPrimary} />}
                  onPress={() => void handleSend()}
                  disabled={!draft.trim()}
                  loading={createSession.isPending}
                  style={styles.composerButton}
                  testID="chat-send"
                />
              )}
            </View>
          </View>
        </View>

        {/* Danh sách phiên: chạm = mở, nhấn giữ (hoặc nút ...) = đổi tên/lưu trữ */}
        <BottomSheet
          visible={sessionsOpen}
          onClose={() => setSessionsOpen(false)}
          title={t("chat.sessions")}
          testID="chat-sessions-sheet"
        >
          <Button
            label={t("chat.newSession")}
            variant="outline"
            size="sm"
            icon={<MessageSquarePlus size={16} color={theme.colors.text} />}
            onPress={handleNewSession}
            fullWidth
            style={styles.sheetNew}
            testID="chat-new-session-sheet"
          />
          <ScrollView
            style={{ maxHeight: Math.max(240, windowHeight * 0.55) }}
            contentContainerStyle={styles.sheetScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {sessionsQuery.isPending ? (
              <View style={styles.sheetLoading}>
                {[0, 1, 2].map(index => (
                  <View key={index} style={styles.sheetSkeleton}>
                    <Skeleton height={16} width="55%" />
                    <Skeleton height={12} width="35%" />
                  </View>
                ))}
              </View>
            ) : sessionsQuery.isError ? (
              <AppText variant="caption" center style={styles.sheetMessage}>
                {t("chat.sessionsLoadError")}
              </AppText>
            ) : sessions.length === 0 ? (
              <AppText variant="caption" center style={styles.sheetMessage}>
                {t("chat.noSessions")}
              </AppText>
            ) : (
              sessions.map((session, index) => (
                <React.Fragment key={session.id}>
                  {index > 0 ? <Divider /> : null}
                  <SessionRow
                    session={session}
                    active={session.id === sessionId}
                    onSelect={() => handleSelectSession(session.id)}
                    onManage={() => setManageSession(session)}
                  />
                </React.Fragment>
              ))
            )}
            {sessionsQuery.hasNextPage ? (
              <View style={styles.sheetMore}>
                <Button
                  label={
                    sessionsQuery.isFetchingNextPage ? t("common.loading") : t("common.loadMore")
                  }
                  variant="outline"
                  size="sm"
                  onPress={() => void sessionsQuery.fetchNextPage()}
                  disabled={sessionsQuery.isFetchingNextPage}
                  style={styles.sheetMoreButton}
                  testID="chat-sessions-more"
                />
              </View>
            ) : null}
          </ScrollView>
        </BottomSheet>

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

/** Bong bóng tin nhắn: user bên phải (nền primary nhạt), trợ lý bên trái + markdown.
 *  Trên bong bóng có nhãn người gửi + giờ gửi tin (như bản web). */
function ChatBubble({
  role,
  content,
  createdAt,
  images,
  thinking,
  streaming,
}: {
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
}) {
  const t = useT();
  const theme = useTheme();
  const isUser = role === "user";
  const body = streaming && !thinking && content ? `${content}▍` : content;

  return (
    <View style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowAssistant]}>
      <View style={styles.bubbleMeta}>
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
          <View style={styles.bubbleImages} testID="chat-message-images">
            {images.map((uri, index) => (
              <Image key={index} source={{ uri }} style={styles.bubbleImage} />
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

/** Lượt đang stream / lỗi / đã dừng: tin user tạm + phần trả lời đang chảy. */
function PendingTurn({
  turn,
  onRetry,
  onDismiss,
}: {
  turn: ChatPendingTurn;
  onRetry: () => void;
  onDismiss: () => void;
}) {
  const t = useT();
  const streaming = turn.status === "streaming";
  // Tin tạm chưa có id/thời điểm từ server -> lấy giờ hiện tại (như web `localMessage`)
  const stamp = new Date().toISOString();

  return (
    <View style={styles.pendingWrap}>
      <ChatBubble role="user" content={turn.content} createdAt={stamp} images={turn.images} />
      <ChatBubble
        role="assistant"
        content={turn.partial}
        createdAt={stamp}
        thinking={streaming && !turn.partial}
        streaming={streaming}
      />
      {!streaming ? (
        <View style={styles.pendingActions}>
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

/** 3 chấm nhấp nháy khi chờ chữ đầu tiên của trợ lý. */
function ThinkingDots() {
  const theme = useTheme();
  const t = useT();
  const first = React.useRef(new Animated.Value(0)).current;
  const second = React.useRef(new Animated.Value(0)).current;
  const third = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const values = [first, second, third];
    const loops = values.map((value, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 160),
          Animated.timing(value, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(value, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay((values.length - 1 - index) * 160),
        ]),
      ),
    );
    loops.forEach(loop => loop.start());
    return () => {
      loops.forEach(loop => loop.stop());
    };
  }, [first, second, third]);

  const dotAnimatedStyle = (value: Animated.Value) => ({
    opacity: value.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
    transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) }],
  });

  return (
    <View style={styles.thinkingRow} testID="chat-thinking">
      <View style={styles.thinkingDots}>
        {[first, second, third].map((value, index) => (
          <Animated.View
            key={index}
            style={[
              styles.thinkingDot,
              { backgroundColor: theme.colors.textMuted },
              dotAnimatedStyle(value),
            ]}
          />
        ))}
      </View>
      <AppText variant="caption">{t("chat.thinking")}</AppText>
    </View>
  );
}

/** Markdown cho câu trả lời AI — style theo theme, chỉ hiển thị (không HTML). */
function ChatMarkdown({ content }: { content: string }) {
  const theme = useTheme();
  const markdownStyles = React.useMemo(() => createMarkdownStyles(theme), [theme]);
  return <Markdown style={markdownStyles}>{content}</Markdown>;
}

/** Style markdown (tiêu đề, danh sách, code, bảng, trích dẫn...). */
function createMarkdownStyles(theme: Theme) {
  return StyleSheet.create({
    body: { color: theme.colors.text, fontSize: theme.fontSize.md, lineHeight: 22 },
    paragraph: { marginTop: 0, marginBottom: spacing.sm },
    strong: { fontWeight: theme.fontWeight.bold },
    em: { fontStyle: "italic" },
    link: { color: theme.colors.primary, textDecorationLine: "underline" },
    heading1: {
      fontSize: theme.fontSize.xl,
      fontWeight: theme.fontWeight.bold,
      marginTop: spacing.sm,
      marginBottom: spacing.xs,
    },
    heading2: {
      fontSize: theme.fontSize.lg,
      fontWeight: theme.fontWeight.bold,
      marginTop: spacing.sm,
      marginBottom: spacing.xs,
    },
    heading3: {
      fontSize: theme.fontSize.md,
      fontWeight: theme.fontWeight.bold,
      marginTop: spacing.sm,
      marginBottom: spacing.xs,
    },
    bullet_list: { marginTop: 0, marginBottom: spacing.sm },
    ordered_list: { marginTop: 0, marginBottom: spacing.sm },
    list_item: { marginBottom: 2 },
    code_inline: {
      fontFamily: MONO_FONT,
      backgroundColor: theme.colors.background,
      color: theme.colors.text,
      paddingHorizontal: 4,
      borderRadius: radius.sm,
    },
    fence: {
      fontFamily: MONO_FONT,
      backgroundColor: theme.colors.background,
      color: theme.colors.text,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: radius.sm,
      padding: spacing.sm,
      marginBottom: spacing.sm,
    },
    blockquote: {
      backgroundColor: theme.colors.primarySoft,
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.primary,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      marginBottom: spacing.sm,
    },
    hr: {
      backgroundColor: theme.colors.border,
      height: StyleSheet.hairlineWidth,
      marginVertical: spacing.sm,
    },
    table: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: radius.sm,
      marginBottom: spacing.sm,
    },
    th: { padding: 6, fontWeight: theme.fontWeight.bold },
    td: { padding: 6 },
    tr: { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
  });
}

/** Các chip câu hỏi gợi ý — chạm để đưa vào ô soạn tin. */
function SuggestionChips({
  suggestions,
  onPick,
}: {
  suggestions: string[];
  onPick: (text: string) => void;
}) {
  return (
    <View style={styles.chips}>
      {suggestions.map(suggestion => (
        <Pressable
          key={suggestion}
          onPress={() => onPick(suggestion)}
          accessibilityRole="button"
          accessibilityLabel={suggestion}
        >
          <Chip>{suggestion}</Chip>
        </Pressable>
      ))}
    </View>
  );
}

/** Một phiên trong danh sách: chạm = mở, nhấn giữ (hoặc nút ...) = tuỳ chọn. */
function SessionRow({
  session,
  active,
  onSelect,
  onManage,
}: {
  session: ChatSessionDto;
  active: boolean;
  onSelect: () => void;
  onManage: () => void;
}) {
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
      style={({ pressed }) => [
        styles.sessionRow,
        active || pressed ? { backgroundColor: theme.colors.primarySoft } : null,
      ]}
    >
      <View style={styles.sessionInfo}>
        <View style={styles.sessionTitleRow}>
          <AppText
            variant="body"
            weight={active ? "semibold" : "medium"}
            numberOfLines={1}
            style={styles.metaTitle}
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
        style={styles.sessionOptionsButton}
        testID="chat-session-options"
      />
    </Pressable>
  );
}

/** Hộp thoại tuỳ chọn phiên: đổi tên hoặc lưu trữ (mở bằng nhấn giữ trong danh sách). */
function SessionManageDialog({
  session,
  onClose,
  onArchived,
}: {
  session: ChatSessionDto;
  onClose: () => void;
  onArchived: (id: string) => void;
}) {
  const t = useT();
  const { show } = useToast();
  const [mode, setMode] = React.useState<"options" | "rename" | "archive">("options");
  const [name, setName] = React.useState(session.title ?? "");
  const updateSession = useUpdateChatSessionMutation(session.id);
  const archiveSession = useArchiveChatSessionMutation();
  const displayName = sessionTitle(session.title, t("chat.untitled"));

  // Mở phiên khác (hoặc tiêu đề đổi) -> về trạng thái ban đầu
  React.useEffect(() => {
    setName(session.title ?? "");
    setMode("options");
  }, [session.id, session.title]);

  const handleRename = async () => {
    try {
      await updateSession.mutateAsync({ title: name.trim() || undefined });
      show(t("chat.renamed"), { type: "success" });
      onClose();
    } catch (error) {
      toastError(ApiError.from(error).message);
    }
  };

  const handleArchive = async () => {
    try {
      await archiveSession.mutateAsync(session.id);
      show(t("chat.archived"), { type: "success" });
      onArchived(session.id);
      onClose();
    } catch (error) {
      toastError(ApiError.from(error).message);
    }
  };

  const actions: DialogAction[] =
    mode === "options"
      ? [
          { label: t("chat.rename"), variant: "outline", onPress: () => setMode("rename") },
          { label: t("study.archive"), variant: "danger", onPress: () => setMode("archive") },
        ]
      : mode === "rename"
        ? [
            { label: t("common.cancel"), variant: "outline", onPress: () => setMode("options") },
            { label: t("common.save"), onPress: () => void handleRename() },
          ]
        : [
            { label: t("common.cancel"), variant: "outline", onPress: () => setMode("options") },
            { label: t("study.archive"), variant: "danger", onPress: () => void handleArchive() },
          ];

  return (
    <Dialog
      visible
      onClose={onClose}
      title={
        mode === "options"
          ? t("chat.sessionOptions")
          : mode === "rename"
            ? t("chat.renameTitle")
            : t("chat.archiveTitle", { name: displayName })
      }
      actions={actions}
      testID="chat-session-manage"
    >
      {mode === "options" ? (
        <AppText variant="caption">
          {`${displayName} · ${t("chat.messagesUnit", { count: session.message_count })}`}
        </AppText>
      ) : mode === "rename" ? (
        <Input
          value={name}
          onChangeText={setName}
          placeholder={t("chat.renamePlaceholder")}
          testID="chat-rename-input"
        />
      ) : (
        <AppText variant="caption">{t("chat.archiveDesc")}</AppText>
      )}
    </Dialog>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screenContent: { padding: 0 },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  metaTitle: { flexShrink: 1 },
  metaSession: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  list: { flex: 1 },
  listContent: {
    flexGrow: 1,
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  emptyWrap: { flex: 1, justifyContent: "center", gap: spacing.md, paddingVertical: spacing.xl },
  emptyAction: { alignSelf: "center" },
  skeletonWrap: { gap: spacing.md, paddingVertical: spacing.lg },
  skeletonRight: { alignSelf: "flex-end" },
  chips: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: spacing.sm },
  bubbleRow: { width: "100%" },
  bubbleRowUser: { alignItems: "flex-end" },
  bubbleRowAssistant: { alignItems: "flex-start" },
  bubbleMeta: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  bubble: {
    maxWidth: "85%",
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleImages: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  bubbleImage: { width: 72, height: 72, borderRadius: radius.md },
  thinkingRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  thinkingDots: { flexDirection: "row", alignItems: "center", gap: 4 },
  thinkingDot: { width: 6, height: 6, borderRadius: radius.pill },
  pendingWrap: { gap: spacing.md },
  pendingActions: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingLeft: spacing.xs,
  },
  composer: {
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  composerRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm },
  composerInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: fontSize.md,
    textAlignVertical: "top",
  },
  composerButton: { alignSelf: "flex-end" },
  previews: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.sm },
  previewWrap: { position: "relative" },
  previewImage: { width: 64, height: 64, borderRadius: radius.md, borderWidth: 1 },
  previewRemove: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: radius.pill,
  },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 56,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  sessionInfo: { flex: 1, gap: 2 },
  sessionTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  sessionOptionsButton: { alignSelf: "center" },
  sheetNew: { marginBottom: spacing.sm },
  sheetScrollContent: { paddingBottom: spacing.sm },
  sheetLoading: { gap: spacing.lg, paddingVertical: spacing.lg },
  sheetSkeleton: { gap: spacing.sm },
  sheetMessage: { paddingVertical: spacing.xxl },
  sheetMore: { alignItems: "center", paddingVertical: spacing.md },
  sheetMoreButton: { alignSelf: "center" },
});
