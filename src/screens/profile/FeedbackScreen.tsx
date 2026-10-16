import * as React from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ImagePlus, Send, X } from "lucide-react-native";
import { ApiError } from "@/api/client";
import {
  AppText,
  Badge,
  Button,
  Card,
  EmptyState,
  IconButton,
  Input,
  Screen,
  SectionHeader,
  SegmentedControl,
  Skeleton,
  toastError,
  useToast,
} from "@/components/ui";
import { useCreateFeedbackMutation, useMyFeedbackInfiniteQuery } from "@/hooks/use-feedback";
import { useT } from "@/i18n";
import { formatDate } from "@/lib/format";
import {
  FEEDBACK_IMAGE_MAX_BYTES,
  FEEDBACK_IMAGE_MAX_COUNT,
  pickImages,
  type LocalImage,
  type MediaError,
} from "@/lib/media";
import type { RootStackParamList } from "@/navigation/types";
import { useTheme } from "@/theme";
import type { FeedbackCategory, FeedbackDto } from "@/types/api";

type FeedbackScreenProps = NativeStackScreenProps<RootStackParamList, "Feedback">;

const CONTENT_MIN = 10;
const CONTENT_MAX = 4000;
const DEFAULT_PAGE_SIZE = 10;

const CATEGORY_OPTIONS: Array<{ value: FeedbackCategory; labelKey: string }> = [
  { value: "bug", labelKey: "feedback.categoryBug" },
  { value: "feature", labelKey: "feedback.categoryFeature" },
  { value: "content", labelKey: "feedback.categoryContent" },
  { value: "other", labelKey: "feedback.categoryOther" },
];

/** Trạng thái góp ý -> nhãn + tông màu của Badge. */
const STATUS_META: Record<string, { labelKey: string; tone: "default" | "success" | "warning" }> = {
  new: { labelKey: "feedback.statusNew", tone: "default" },
  in_progress: { labelKey: "feedback.statusInProgress", tone: "warning" },
  resolved: { labelKey: "feedback.statusResolved", tone: "success" },
};

/** Lỗi chọn ảnh -> thông báo tương ứng. */
const MEDIA_ERROR_KEYS: Record<MediaError, string> = {
  type: "feedback.photoInvalidType",
  size: "feedback.photoTooBig",
  count: "feedback.photoTooMany",
  read: "errors.generic",
};

/** Màn Góp ý: gửi bug/đề xuất (kèm tối đa 3 ảnh) + lịch sử góp ý cuộn vô hạn. */
export function FeedbackScreen({ navigation }: FeedbackScreenProps) {
  const t = useT();
  const theme = useTheme();
  const { show } = useToast();

  const createFeedback = useCreateFeedbackMutation();

  const [category, setCategory] = React.useState<FeedbackCategory>("bug");
  const [content, setContent] = React.useState("");
  const [files, setFiles] = React.useState<LocalImage[]>([]);

  const history = useMyFeedbackInfiniteQuery(DEFAULT_PAGE_SIZE);

  // Gộp mọi trang đã tải thành một danh sách phẳng cho FlatList
  const items = React.useMemo(
    () => (history.data?.pages ?? []).flatMap(page => page.data),
    [history.data],
  );
  const loadedCount = items.length;

  /** Cuộn tới đáy -> tải thêm một trang (cursor). */
  const handleEndReached = () => {
    if (!history.hasNextPage || history.isFetchingNextPage) return;
    // Lỗi tải trang kế hiển thị qua history.isError — chặn unhandled rejection
    history.fetchNextPage().catch(() => undefined);
  };

  // Giữ ổn định để gõ trong form không kéo theo re-render các dòng lịch sử
  const renderFeedback = React.useCallback(
    ({ item }: { item: FeedbackDto }) => (
      <Card>
        <FeedbackRow item={item} />
      </Card>
    ),
    [],
  );

  /** Chọn ảnh từ thư viện — giữ nguyên { uri, name, type } để gửi multipart. */
  const handlePickImages = async () => {
    if (files.length >= FEEDBACK_IMAGE_MAX_COUNT) {
      show(t("feedback.photoTooMany"), { type: "error" });
      return;
    }
    const result = await pickImages({
      remaining: FEEDBACK_IMAGE_MAX_COUNT - files.length,
      maxBytes: FEEDBACK_IMAGE_MAX_BYTES,
    });
    const messages = Array.from(new Set(result.errors.map(error => t(MEDIA_ERROR_KEYS[error]))));
    messages.forEach(message => show(message, { type: "error" }));
    if (result.images.length > 0) {
      setFiles(previous => [...previous, ...result.images].slice(0, FEEDBACK_IMAGE_MAX_COUNT));
    }
  };

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (trimmed.length < CONTENT_MIN) {
      show(t("feedback.contentMin"), { type: "error" });
      return;
    }
    try {
      await createFeedback.mutateAsync({
        category,
        content: trimmed,
        files: files.map(file => ({ uri: file.uri, name: file.name, type: file.type })),
      });
      show(t("feedback.sent"), { type: "success" });
      setContent("");
      setFiles([]);
    } catch (error) {
      toastError(ApiError.from(error).message);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Screen
        title={t("feedback.title")}
        onBack={() => navigation.goBack()}
        contentClassName="p-0"
        testID="feedback-screen"
      >
        {/* FlatList là scroller chính: kéo xuống làm mới + cuộn tới đáy tải thêm */}
        <FlatList
          data={items}
          keyExtractor={item => item.id}
          renderItem={renderFeedback}
          ListHeaderComponent={
            <View className="mb-4 gap-4">
              <AppText variant="caption">{t("feedback.subtitle")}</AppText>

              {/* Form gửi góp ý: loại + nội dung + ảnh đính kèm */}
              <Card className="gap-3">
                <AppText variant="label">{t("feedback.category")}</AppText>
                <SegmentedControl
                  options={CATEGORY_OPTIONS.map(option => ({
                    value: option.value,
                    label: t(option.labelKey),
                  }))}
                  value={category}
                  onChange={value => setCategory(value as FeedbackCategory)}
                  testID="feedback-category"
                />

                <View className="flex-row items-center justify-between gap-2">
                  <AppText variant="label">{t("feedback.content")}</AppText>
                  <AppText variant="caption">
                    {t("feedback.contentHint", { count: content.length })}
                  </AppText>
                </View>
                <Input
                  value={content}
                  onChangeText={text => setContent(text.slice(0, CONTENT_MAX))}
                  placeholder={t("feedback.contentPlaceholder")}
                  multiline
                  numberOfLines={5}
                  testID="feedback-content"
                />

                <AppText variant="label">{t("feedback.photos")}</AppText>
                <View className="flex-row flex-wrap items-center gap-2">
                  {files.map((file, index) => (
                    <View
                      key={`${file.uri}-${index}`}
                      className="max-w-[220px] flex-row items-center rounded-lg border border-border pl-2"
                    >
                      <AppText variant="caption" numberOfLines={1} className="shrink">
                        {file.name}
                      </AppText>
                      <IconButton
                        icon={<X size={14} color={theme.colors.textMuted} />}
                        onPress={() => setFiles(previous => previous.filter((_, i) => i !== index))}
                        accessibilityLabel={t("feedback.photoRemove")}
                        size="sm"
                        testID={`feedback-file-remove-${index}`}
                      />
                    </View>
                  ))}
                  {files.length < FEEDBACK_IMAGE_MAX_COUNT ? (
                    <Button
                      label={t("feedback.photoAdd")}
                      variant="outline"
                      size="sm"
                      icon={<ImagePlus size={16} color={theme.colors.text} />}
                      onPress={() => void handlePickImages()}
                      testID="feedback-add-photos"
                    />
                  ) : null}
                </View>
                <AppText variant="caption">{t("feedback.photosHint")}</AppText>

                <Button
                  label={t("feedback.submit")}
                  onPress={() => void handleSubmit()}
                  loading={createFeedback.isPending}
                  fullWidth
                  icon={<Send size={16} color={theme.colors.onPrimary} />}
                  testID="feedback-submit"
                />
              </Card>

              {/* Lịch sử góp ý đã gửi (phân trang bằng cursor) */}
              <SectionHeader
                title={t("feedback.mine")}
                count={history.data ? loadedCount : undefined}
              />
            </View>
          }
          ListEmptyComponent={
            history.isPending ? (
              <View className="gap-2 py-4">
                <Skeleton height={16} width="45%" />
                <Skeleton height={12} width="90%" />
                <Skeleton height={12} width="70%" />
              </View>
            ) : history.isError ? (
              <AppText variant="caption" center className="p-7">
                {t("feedback.loadError")}
              </AppText>
            ) : (
              <EmptyState title={t("feedback.empty")} />
            )
          }
          ListFooterComponent={
            history.isFetchingNextPage ? (
              <View className="items-center py-3">
                <Skeleton height={12} width="60%" />
              </View>
            ) : history.data && !history.hasNextPage && loadedCount > 0 ? (
              <AppText variant="caption" center className="py-3">
                {t("dict.allLoaded", { count: loadedCount })}
              </AppText>
            ) : null
          }
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              // isRefetching cũng bật khi tải trang kế — chỉ hiện spinner khi kéo làm mới
              refreshing={history.isRefetching && !history.isFetchingNextPage}
              onRefresh={() => void history.refetch()}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
              progressBackgroundColor={theme.colors.card}
            />
          }
          // Screen đã đệm đáy tránh home indicator — list chỉ cần padding đều
          contentContainerClassName="p-4"
          testID="feedback-list"
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}

/** Một dòng góp ý: loại + trạng thái + ngày + nội dung + phản hồi admin (nếu có). */
function FeedbackRow({ item }: { item: FeedbackDto }) {
  const t = useT();
  const status = STATUS_META[item.status] ?? STATUS_META.new;
  const category = CATEGORY_OPTIONS.find(option => option.value === item.category);

  return (
    <View className="gap-2" testID="feedback-row">
      <View className="flex-row flex-wrap items-center gap-2">
        <AppText variant="label">{category ? t(category.labelKey) : item.category}</AppText>
        <Badge tone={status.tone}>{t(status.labelKey)}</Badge>
        <AppText variant="caption" className="ml-auto">
          {formatDate(item.created_at)}
        </AppText>
      </View>

      <AppText variant="caption">{item.content}</AppText>

      {item.attachments && item.attachments.length > 0 ? (
        <AppText variant="caption">
          {t("feedback.attachments", { count: item.attachments.length })}
        </AppText>
      ) : null}

      {item.admin_note ? (
        <View
          className="gap-1 rounded-lg border border-border bg-primary-soft px-3 py-2"
        >
          <AppText variant="label" color="primary">
            {t("feedback.adminNote")}
          </AppText>
          <AppText variant="caption">{item.admin_note}</AppText>
        </View>
      ) : null}
    </View>
  );
}
