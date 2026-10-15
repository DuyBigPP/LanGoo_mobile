import * as React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Check } from "lucide-react-native";
import { ApiError } from "@/api/client";
import {
  AppText,
  BottomSheet,
  Button,
  Divider,
  Input,
  Skeleton,
  useToast,
} from "@/components/ui";
import { useAddCollectionItemMutation, useCollectionsQuery, useCreateCollectionMutation } from "@/hooks/use-collections";
import { useActiveProfile } from "@/hooks/use-profile";
import { useT } from "@/i18n";
import { formatNumber } from "@/lib/format";
import { spacing, useTheme } from "@/theme";

export interface AddToCollectionSheetProps {
  visible: boolean;
  onClose: () => void;
  senseId: string;
  surface: string;
  /** Nghĩa có sẵn từ từ điển — dùng làm meaning_vi, không bắt người dùng nhập lại. */
  defaultMeaning: string;
}

/**
 * Sheet thêm nghĩa vào sổ tay: chọn bộ sưu tập (hoặc tạo sổ mới ngay trong sheet),
 * nghĩa (chỉ khi từ điển chưa có), ghi chú rồi lưu.
 * Lỗi COLLECTION_LANGUAGE_NOT_IN_PROFILE có thông báo riêng.
 */
export function AddToCollectionSheet({
  visible,
  onClose,
  senseId,
  surface,
  defaultMeaning,
}: AddToCollectionSheetProps) {
  const t = useT();
  const theme = useTheme();
  const { show } = useToast();
  const { profileId } = useActiveProfile();
  const collections = useCollectionsQuery(visible);
  const createCollection = useCreateCollectionMutation();
  const addItem = useAddCollectionItemMutation();

  const [collectionId, setCollectionId] = React.useState("");
  const [manualMeaning, setManualMeaning] = React.useState("");
  const [note, setNote] = React.useState("");
  const [newName, setNewName] = React.useState("");

  const items = React.useMemo(() => collections.data?.data ?? [], [collections.data]);
  const hasDefaultMeaning = defaultMeaning.trim().length > 0;
  const meaning = hasDefaultMeaning ? defaultMeaning.trim() : manualMeaning.trim();
  const canSubmit = Boolean(collectionId) && meaning.length > 0 && !addItem.isPending;

  // Mở sheet -> xoá nội dung nhập của lần trước
  React.useEffect(() => {
    if (visible) {
      setManualMeaning("");
      setNote("");
      setNewName("");
    }
  }, [visible]);

  // Mặc định chọn bộ đầu tiên khi có dữ liệu
  React.useEffect(() => {
    if (visible && !collectionId && items.length > 0) setCollectionId(items[0].id);
  }, [visible, collectionId, items]);

  /** Tạo sổ mới ngay trong sheet rồi chọn luôn sổ vừa tạo (như web AddToCollectionDialog). */
  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      const created = await createCollection.mutateAsync({
        name,
        profile_id: profileId ?? undefined,
      });
      setCollectionId(created.id);
      setNewName("");
      show(t("study.created"), { type: "success" });
    } catch (error) {
      show(ApiError.from(error).message, { type: "error" });
    }
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    addItem.mutate(
      {
        collectionId,
        item: {
          sense_id: senseId,
          meaning_vi: meaning,
          note: note.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          const name =
            items.find(collection => collection.id === collectionId)?.name ??
            t("dict.defaultCollection");
          show(t("dict.addedTo", { surface, name }), { type: "success" });
          onClose();
        },
        onError: error => {
          const apiError = ApiError.from(error);
          // Bộ không hỗ trợ ngôn ngữ của từ (scope hồ sơ) -> gợi ý chọn bộ khác
          if (apiError.code === "COLLECTION_LANGUAGE_NOT_IN_PROFILE") {
            show(t("dict.addLanguageMismatch"), { type: "error" });
          } else {
            show(apiError.message, { type: "error" });
          }
        },
      },
    );
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t("dict.addToTitle")}
      testID="add-to-collection"
    >
      <View style={styles.body}>
        <AppText variant="caption">
          {t("dict.addToDesc", {
            surface,
            withMeaning: hasDefaultMeaning ? t("dict.addToWithMeaning") : "",
          })}
        </AppText>

        {collections.isPending ? (
          <View style={styles.list}>
            {[0, 1, 2].map(index => (
              <Skeleton key={index} height={40} width="100%" />
            ))}
          </View>
        ) : collections.isError ? (
          <AppText variant="caption">{t("errors.generic")}</AppText>
        ) : items.length > 0 ? (
          <View style={styles.listBlock}>
            <AppText variant="label">{t("dict.chooseNotebook")}</AppText>
            <ScrollView
              style={styles.list}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {items.map((collection, index) => {
                const selected = collection.id === collectionId;
                return (
                  <View key={collection.id}>
                    {index > 0 ? <Divider /> : null}
                    <Pressable
                      onPress={() => setCollectionId(collection.id)}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      testID={`add-collection-${collection.id}`}
                      style={({ pressed }) => [
                        styles.collectionRow,
                        pressed ? styles.rowPressed : null,
                      ]}
                    >
                      <View style={styles.flex}>
                        <AppText
                          variant="body"
                          weight={selected ? "semibold" : "regular"}
                          numberOfLines={1}
                        >
                          {collection.name}
                        </AppText>
                        <AppText variant="caption">
                          {t("study.wordsCount", {
                            count: formatNumber(
                              collection.visible_item_count ?? collection.item_count,
                            ),
                          })}
                        </AppText>
                      </View>
                      {selected ? <Check size={18} color={theme.colors.primary} /> : null}
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        ) : (
          <AppText variant="label">{t("dict.noNotebook")}</AppText>
        )}

        {/* Tạo sổ mới ngay trong sheet rồi chọn luôn (như web AddToCollectionDialog) */}
        <View style={styles.createBlock}>
          <View style={styles.createRow}>
            <Input
              value={newName}
              onChangeText={setNewName}
              placeholder={t("dict.newNotebookPlaceholder")}
              autoCapitalize="sentences"
              style={styles.flex}
              testID="add-new-collection-input"
            />
            <Button
              label={t("dict.create")}
              variant="outline"
              size="sm"
              onPress={() => void handleCreate()}
              disabled={!newName.trim()}
              loading={createCollection.isPending}
              testID="add-new-collection"
            />
          </View>
        </View>

        {!hasDefaultMeaning ? (
          <Input
            label={t("dict.meaningVi")}
            value={manualMeaning}
            onChangeText={setManualMeaning}
            placeholder={t("dict.meaningPlaceholder")}
            testID="add-meaning"
          />
        ) : null}

        <Input
          label={t("dict.noteLabel")}
          value={note}
          onChangeText={setNote}
          placeholder={t("dict.notePlaceholder")}
          multiline
          numberOfLines={2}
          testID="add-note"
        />

        <Button
          label={t("common.save")}
          onPress={handleSubmit}
          disabled={!canSubmit}
          loading={addItem.isPending}
          fullWidth
          testID="add-save"
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.md, paddingBottom: spacing.md },
  flex: { flex: 1 },
  listBlock: { gap: spacing.sm },
  list: { maxHeight: 220 },
  collectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 52,
    paddingVertical: spacing.sm,
  },
  createBlock: { gap: spacing.sm },
  createRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  rowPressed: { opacity: 0.85 },
});
