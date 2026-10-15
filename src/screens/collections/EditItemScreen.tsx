import * as React from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ApiError } from "@/api/client";
import {
  AppText,
  Button,
  Card,
  Dialog,
  EmptyState,
  Input,
  Screen,
  SegmentedControl,
  Skeleton,
  useToast,
} from "@/components/ui";
import { SpeakButton } from "@/components/domain/SpeakButton";
import { WordCell } from "@/components/domain/WordCell";
import { TagPicker } from "@/components/collections/TagPicker";
import {
  useCollectionItemsQuery,
  useDeleteItemMutation,
  useUpdateItemMutation,
} from "@/hooks/use-collections";
import { useSenseDetail } from "@/hooks/use-dictionary";
import { useT } from "@/i18n";
import type { RootStackParamList } from "@/navigation/types";
import { spacing } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "EditItem">;

const ITEM_NOT_FOUND = "Không tìm thấy từ này trong sổ tay.";
const STATUS_LABEL = "Trạng thái học";

/**
 * Sửa một từ trong sổ tay: nghĩa VI, ghi chú, trạng thái học.
 * Tìm item bằng cách quét các trang của useCollectionItemsQuery (tự nạp tiếp nếu ở trang sau).
 */
export function EditItemScreen({ navigation, route }: Props) {
  const { collectionId, itemId } = route.params;
  const t = useT();
  const { show } = useToast();

  const itemsQuery = useCollectionItemsQuery(collectionId, {});
  const updateItem = useUpdateItemMutation(collectionId);
  const deleteItem = useDeleteItemMutation(collectionId);

  const items = React.useMemo(
    () => itemsQuery.data?.pages.flatMap(page => page.data) ?? [],
    [itemsQuery.data],
  );
  const item = items.find(entry => entry.id === itemId) ?? null;

  const sense = useSenseDetail(item ? item.display_sense_id ?? item.anchor_sense_id : null);
  const card = sense.data?.card;

  const [meaning, setMeaning] = React.useState("");
  const [note, setNote] = React.useState("");
  const [status, setStatus] = React.useState("learning");
  const [tagIds, setTagIds] = React.useState<string[]>([]);
  const [error, setError] = React.useState<string | undefined>(undefined);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const hydratedRef = React.useRef(false);

  // Item có thể nằm ở trang sau — nạp tiếp cho tới khi thấy (mirror hành vi "tìm trong cache")
  React.useEffect(() => {
    if (item || !itemsQuery.hasNextPage || itemsQuery.isFetchingNextPage) return;
    void itemsQuery.fetchNextPage();
  }, [item, itemsQuery]);

  // Điền sẵn giá trị khi tìm thấy item (chỉ một lần, tránh ghi đè lúc đang gõ)
  React.useEffect(() => {
    if (!item || hydratedRef.current) return;
    setMeaning(item.meaning_vi);
    setNote(item.note ?? "");
    setStatus(item.status || "learning");
    setTagIds(item.tag_ids);
    hydratedRef.current = true;
  }, [item]);

  const statusOptions = React.useMemo(
    () => [
      // Khoá study.status* chưa có trong i18n — dùng nhóm nhãn labels.itemStatus.* (báo cáo cuối)
      { value: "learning", label: t("labels.itemStatus.learning") },
      { value: "paused", label: t("labels.itemStatus.paused") },
      { value: "known", label: t("labels.itemStatus.known") },
    ],
    [t],
  );

  const handleSave = async () => {
    if (!item) return;
    const trimmed = meaning.trim();
    if (!trimmed) {
      setError(t("errors.fieldRequired"));
      return;
    }
    setError(undefined);
    try {
      await updateItem.mutateAsync({
        itemId: item.id,
        patch: { meaning_vi: trimmed, note: note.trim() || null, status, tag_ids: tagIds },
      });
      // Khoá study.itemUpdated chưa có — dùng study.editSaved (báo cáo cuối)
      show(t("study.editSaved"), { type: "success" });
      navigation.goBack();
    } catch (err) {
      show(ApiError.from(err).message, { type: "error" });
    }
  };

  const handleDelete = async () => {
    if (!item) return;
    try {
      await deleteItem.mutateAsync(item.id);
      show(t("study.removeItemDone"), { type: "success" });
      setDeleteOpen(false);
      navigation.goBack();
    } catch (err) {
      show(ApiError.from(err).message, { type: "error" });
    }
  };

  // Đang tải / chưa tìm thấy item
  if (itemsQuery.isPending || (!item && itemsQuery.hasNextPage)) {
    return (
      <Screen title={t("study.editItem")} onBack={() => navigation.goBack()} testID="edit-item">
        <View style={styles.loading}>
          <Card style={styles.skeletonCard}>
            <Skeleton height={22} width="45%" />
            <Skeleton height={14} width="65%" />
          </Card>
          <Card style={styles.skeletonCard}>
            <Skeleton height={44} width="100%" />
            <Skeleton height={44} width="100%" />
          </Card>
        </View>
      </Screen>
    );
  }

  if (itemsQuery.isError) {
    return (
      <Screen title={t("study.editItem")} onBack={() => navigation.goBack()} testID="edit-item">
        <Card style={styles.errorCard}>
          <AppText variant="caption" center>
            {t("study.loadError")}
          </AppText>
          <Button
            label={t("common.retry")}
            variant="outline"
            size="sm"
            onPress={() => void itemsQuery.refetch()}
            style={styles.retry}
            testID="edit-item-retry"
          />
        </Card>
      </Screen>
    );
  }

  if (!item) {
    return (
      <Screen title={t("study.editItem")} onBack={() => navigation.goBack()} testID="edit-item">
        <Card>
          <EmptyState
            title={ITEM_NOT_FOUND}
            actionLabel={t("study.backToStudy")}
            onAction={() => navigation.goBack()}
            testID="edit-item-not-found"
          />
        </Card>
      </Screen>
    );
  }

  const pending = updateItem.isPending || deleteItem.isPending;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Screen
        title={t("study.editItem")}
        onBack={() => navigation.goBack()}
        scroll
        contentStyle={styles.content}
        testID="edit-item"
      >
        {/* Mặt từ (đọc từ cache sense) */}
        <Card>
          <WordCell
            surface={card?.lemma ?? "…"}
            reading={card?.reading ?? undefined}
            langCode="ja"
            right={
              card?.lemma ? (
                <SpeakButton text={card.lemma} lang="ja" testID="edit-item-speak" />
              ) : undefined
            }
          />
          <AppText variant="caption" style={styles.hint}>
            {t("study.editItemDesc")}
          </AppText>
        </Card>

        {/* Nghĩa VI + ghi chú */}
        <Card style={styles.formCard}>
          <Input
            label={t("dict.meaningVi")}
            value={meaning}
            onChangeText={setMeaning}
            placeholder={t("dict.meaningPlaceholder")}
            error={error}
            testID="edit-item-meaning"
          />
          <Input
            label={t("study.noteLabel")}
            value={note}
            onChangeText={setNote}
            placeholder={t("study.notePlaceholder")}
            multiline
            numberOfLines={3}
            testID="edit-item-note"
          />
        </Card>

        {/* Trạng thái học */}
        <View style={styles.statusField}>
          <AppText variant="label">{STATUS_LABEL}</AppText>
          <SegmentedControl
            options={statusOptions}
            value={status}
            onChange={setStatus}
            testID="edit-item-status"
          />
        </View>

        {/* Tag của từ (mirror web EditItemDialog: chọn/bỏ tag) */}
        <View style={styles.tagField} testID="edit-item-tags">
          <AppText variant="label">Tag</AppText>
          <TagPicker selectedIds={tagIds} onChange={setTagIds} />
        </View>

        <View style={styles.actions}>
          <Button
            label={t("common.saveChanges")}
            onPress={() => void handleSave()}
            loading={updateItem.isPending}
            disabled={pending}
            fullWidth
            testID="edit-item-save"
          />
          <Button
            label={t("study.removeItem")}
            variant="outline"
            onPress={() => setDeleteOpen(true)}
            disabled={pending}
            fullWidth
            testID="edit-item-delete"
          />
        </View>
      </Screen>

      {/* Xác nhận xoá từ */}
      <Dialog
        visible={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={t("study.removeItemConfirm")}
        testID="item-delete-dialog"
        actions={[
          { label: t("common.cancel"), variant: "outline", onPress: () => setDeleteOpen(false) },
          { label: t("study.removeItem"), variant: "danger", onPress: () => void handleDelete() },
        ]}
      >
        <AppText variant="body">{t("study.removeItemConfirm")}</AppText>
      </Dialog>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { gap: spacing.lg },
  loading: { gap: spacing.md },
  skeletonCard: { gap: spacing.sm },
  errorCard: { gap: spacing.sm },
  retry: { alignSelf: "center" },
  hint: { marginTop: spacing.sm },
  formCard: { gap: spacing.md },
  statusField: { gap: spacing.xs },
  tagField: { gap: spacing.xs },
  actions: { gap: spacing.sm },
});
