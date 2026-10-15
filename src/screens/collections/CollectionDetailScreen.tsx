import * as React from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Archive, Pencil, Play } from "lucide-react-native";
import { ApiError } from "@/api/client";
import {
  AppText,
  Button,
  Card,
  Chip,
  Dialog,
  EmptyState,
  Input,
  Screen,
  SectionHeader,
  SegmentedControl,
  Skeleton,
  useToast,
} from "@/components/ui";
import { SpeakButton } from "@/components/domain/SpeakButton";
import { WordCell } from "@/components/domain/WordCell";
import { StartStudySheet } from "@/components/review/StartStudySheet";
import {
  useArchiveCollectionMutation,
  useCollectionItemsQuery,
  useCollectionQuery,
  useDeleteItemMutation,
  useUpdateCollectionMutation,
} from "@/hooks/use-collections";
import { useSenseDetail, useSensesMany } from "@/hooks/use-dictionary";
import { useTagsQuery } from "@/hooks/use-tags";
import { useT } from "@/i18n";
import { collectionKindLabel, itemStatusLabel } from "@/lib/dictionary-labels";
import { formatNumber } from "@/lib/format";
import type { RootStackParamList } from "@/navigation/types";
import { radius, spacing, useTheme } from "@/theme";
import type { ItemResponseDto, TagDto } from "@/types/api";

type Props = NativeStackScreenProps<RootStackParamList, "CollectionDetail">;
type SortKey = "added_desc" | "added_asc" | "az";

/**
 * Chi tiết sổ tay (mirror web /collections/:id):
 * đầu trang (tên, loại, số từ + hành động) + sắp xếp + danh sách từ
 * cuộn vô hạn (FlatList + onEndReached theo next_cursor, bỏ phân trang kiểu web).
 */
export function CollectionDetailScreen({ navigation, route }: Props) {
  const { collectionId, name } = route.params;
  const t = useT();
  const theme = useTheme();
  const { show } = useToast();

  const collection = useCollectionQuery(collectionId);
  const itemsQuery = useCollectionItemsQuery(collectionId, {});
  const tags = useTagsQuery();
  const updateCollection = useUpdateCollectionMutation(collectionId);
  const archiveCollection = useArchiveCollectionMutation();
  const deleteItem = useDeleteItemMutation(collectionId);

  const [sort, setSort] = React.useState<SortKey>("added_desc");
  const [studyOpen, setStudyOpen] = React.useState(false);
  const [renameOpen, setRenameOpen] = React.useState(false);
  const [renameDraft, setRenameDraft] = React.useState("");
  const [archiveOpen, setArchiveOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<ItemResponseDto | null>(null);

  const items = React.useMemo(
    () => itemsQuery.data?.pages.flatMap(page => page.data) ?? [],
    [itemsQuery.data],
  );

  // Tra tên tag theo id để hiện chip trên từng hàng (như CollectionItemRow bản web)
  const tagsById = React.useMemo(() => {
    const map = new Map<string, TagDto>();
    for (const tag of tags.data?.data ?? []) map.set(tag.id, tag);
    return map;
  }, [tags.data]);

  // Cách đọc từng từ (dùng chung cache với useSenseDetail trong hàng) để sắp xếp A–Z
  const senseIds = React.useMemo(
    () => items.map(item => item.display_sense_id ?? item.anchor_sense_id),
    [items],
  );
  const senses = useSensesMany(senseIds);

  const sortedItems = React.useMemo(() => {
    const decorated = items.map((item, index) => ({
      item,
      key: (
        senses[index]?.data?.card.reading ??
        senses[index]?.data?.card.lemma ??
        item.meaning_vi
      ).toLowerCase(),
    }));
    if (sort === "az") {
      decorated.sort((a, b) => a.key.localeCompare(b.key, "ja"));
    } else if (sort === "added_asc") {
      decorated.sort(
        (a, b) => new Date(a.item.created_at).getTime() - new Date(b.item.created_at).getTime(),
      );
    } else {
      decorated.sort(
        (a, b) => new Date(b.item.created_at).getTime() - new Date(a.item.created_at).getTime(),
      );
    }
    return decorated.map(entry => entry.item);
  }, [items, senses, sort]);

  // Sắp xếp A–Z cần đủ dữ liệu -> tự nạp nốt các trang còn lại (mirror web)
  React.useEffect(() => {
    if (sort !== "az" || !itemsQuery.hasNextPage || itemsQuery.isFetchingNextPage) return;
    void itemsQuery.fetchNextPage();
  }, [sort, itemsQuery]);

  /** Cuộn tới đáy -> nạp trang kế theo next_cursor. */
  const handleEndReached = () => {
    if (!itemsQuery.hasNextPage || itemsQuery.isFetchingNextPage) return;
    void itemsQuery.fetchNextPage();
  };

  const openRename = () => {
    setRenameDraft(collection.data?.name ?? name);
    setRenameOpen(true);
  };

  const handleRename = async () => {
    const trimmed = renameDraft.trim();
    if (!trimmed) return;
    try {
      await updateCollection.mutateAsync({ name: trimmed });
      show(t("study.renamed"), { type: "success" });
      setRenameOpen(false);
    } catch (error) {
      show(ApiError.from(error).message, { type: "error" });
    }
  };

  const handleArchive = async () => {
    try {
      await archiveCollection.mutateAsync(collectionId);
      show(t("study.archived"), { type: "success" });
      setArchiveOpen(false);
      navigation.goBack();
    } catch (error) {
      show(ApiError.from(error).message, { type: "error" });
    }
  };

  const handleDelete = async () => {
    const target = deleteTarget;
    if (!target) return;
    try {
      await deleteItem.mutateAsync(target.id);
      show(t("study.removeItemDone"), { type: "success" });
      setDeleteTarget(null);
    } catch (error) {
      show(ApiError.from(error).message, { type: "error" });
    }
  };

  const sortOptions = React.useMemo(
    () => [
      { value: "added_desc", label: t("study.sortAddedDesc") },
      { value: "added_asc", label: t("study.sortAddedAsc") },
      { value: "az", label: t("study.sortAz") },
    ],
    [t],
  );

  // Sổ tay không tồn tại / lỗi tải
  if (collection.isError) {
    return (
      <Screen onBack={() => navigation.goBack()} testID="collection-detail" contentStyle={styles.content}>
        <Card>
          <EmptyState
            title={t("study.notFound")}
            actionLabel={t("study.backToList")}
            onAction={() => navigation.goBack()}
            testID="collection-not-found"
          />
        </Card>
      </Screen>
    );
  }

  const collectionData = collection.data;
  const visibleCount =
    collectionData?.visible_item_count ?? collectionData?.item_count ?? items.length;

  // Đầu danh sách: thông tin sổ tay + sắp xếp + tiêu đề mục
  const listHeader = (
    <View style={styles.headerBlock}>
      <Card testID="collection-header">
        <View style={styles.headerTitleRow}>
          <AppText variant="subtitle" numberOfLines={1} style={styles.headerName}>
            {collectionData?.name ?? name}
          </AppText>
          <Chip>{collectionKindLabel(collectionData?.kind)}</Chip>
        </View>
        <AppText variant="caption">
          {t("study.wordsCount", { count: formatNumber(visibleCount) })}
        </AppText>
        {collectionData?.description ? (
          <AppText variant="caption" numberOfLines={2}>
            {collectionData.description}
          </AppText>
        ) : null}
        <View style={styles.headerActions}>
          <Button
            label={t("study.studyThis")}
            size="sm"
            icon={<Play size={16} color={theme.colors.onPrimary} />}
            onPress={() => setStudyOpen(true)}
            testID="study-collection"
          />
          <Button
            label={t("study.rename")}
            size="sm"
            variant="outline"
            icon={<Pencil size={16} color={theme.colors.text} />}
            onPress={openRename}
            testID="rename-collection"
          />
          <Button
            label={t("study.archive")}
            size="sm"
            variant="outline"
            icon={<Archive size={16} color={theme.colors.danger} />}
            onPress={() => setArchiveOpen(true)}
            testID="archive-collection"
          />
        </View>
      </Card>

      <View style={styles.sortRow}>
        <AppText variant="label">{t("study.sort")}</AppText>
        <SegmentedControl
          options={sortOptions}
          value={sort}
          onChange={value => setSort(value as SortKey)}
          testID="items-sort"
          style={styles.sortControl}
        />
      </View>

      <SectionHeader
        title={t("study.wordsInCollection")}
        count={visibleCount}
        testID="items-header"
      />
    </View>
  );

  // Trạng thái rỗng khi chưa tải xong / lỗi / sổ tay không có từ
  const listEmpty = itemsQuery.isPending ? (
    <View style={styles.list}>
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} style={styles.skeletonCard}>
          <Skeleton height={20} width="45%" />
          <Skeleton height={14} width="70%" />
        </Card>
      ))}
    </View>
  ) : itemsQuery.isError ? (
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
        testID="items-retry"
      />
    </Card>
  ) : (
    <Card>
      <EmptyState
        title={t("study.emptyCollection")}
        description={t("study.emptyCollectionHint")}
        actionLabel={t("study.addFromDictionary")}
        onAction={() => navigation.navigate("Tabs", { screen: "Dictionary" })}
        testID="items-empty"
      />
    </Card>
  );

  // Chân danh sách: đang nạp thêm / đã hiện tất cả
  const listFooter =
    sortedItems.length === 0 ? null : itemsQuery.isFetchingNextPage ? (
      <View style={styles.footer} testID="items-loading-more">
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    ) : !itemsQuery.hasNextPage ? (
      <AppText variant="caption" center style={styles.footerText} testID="items-all-loaded">
        {t("dict.allLoaded", { count: formatNumber(sortedItems.length) })}
      </AppText>
    ) : null;

  return (
    <Screen onBack={() => navigation.goBack()} testID="collection-detail" contentStyle={styles.screenContent}>
      <FlatList
        data={sortedItems}
        keyExtractor={item => item.id}
        renderItem={({ item, index }) => (
          <ItemRow
            item={item}
            index={index}
            tagsById={tagsById}
            onOpen={() => navigation.navigate("EditItem", { collectionId, itemId: item.id })}
            onDelete={() => setDeleteTarget(item)}
          />
        )}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        ListEmptyComponent={listEmpty}
        ItemSeparatorComponent={ListSeparator}
        contentContainerStyle={styles.content}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={itemsQuery.isRefetching || collection.isRefetching}
            onRefresh={() => {
              void itemsQuery.refetch();
              void collection.refetch();
            }}
            tintColor={theme.colors.primary}
          />
        }
        testID="collection-items-list"
      />

      {/* Bắt đầu phiên học cho riêng sổ tay này */}
      <StartStudySheet
        visible={studyOpen}
        onClose={() => setStudyOpen(false)}
        collection={collectionData ? { id: collectionData.id, name: collectionData.name } : null}
      />

      {/* Đổi tên sổ tay */}
      <Dialog
        visible={renameOpen}
        onClose={() => setRenameOpen(false)}
        title={t("study.formRenameTitle")}
        testID="collection-rename-dialog"
        actions={[
          { label: t("common.cancel"), variant: "outline", onPress: () => setRenameOpen(false) },
          {
            label: t("study.formSaveRename"),
            variant: "primary",
            onPress: () => void handleRename(),
          },
        ]}
      >
        <AppText variant="caption">{t("study.formRenameDesc")}</AppText>
        <Input
          label={t("study.formName")}
          value={renameDraft}
          onChangeText={setRenameDraft}
          placeholder={t("study.formNamePlaceholder")}
          testID="collection-rename-input"
        />
      </Dialog>

      {/* Xác nhận lưu trữ */}
      <Dialog
        visible={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        title={t("study.archiveTitle")}
        testID="collection-archive-dialog"
        actions={[
          { label: t("common.cancel"), variant: "outline", onPress: () => setArchiveOpen(false) },
          { label: t("study.archive"), variant: "danger", onPress: () => void handleArchive() },
        ]}
      >
        <AppText variant="body">
          {t("study.archiveDesc", { name: collectionData?.name ?? name })}
        </AppText>
      </Dialog>

      {/* Xác nhận xoá từ khỏi sổ tay */}
      <Dialog
        visible={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={t("study.removeItemConfirm")}
        testID="item-delete-dialog"
        actions={[
          { label: t("common.cancel"), variant: "outline", onPress: () => setDeleteTarget(null) },
          { label: t("study.removeItem"), variant: "danger", onPress: () => void handleDelete() },
        ]}
      >
        <AppText variant="body">{t("study.removeItemConfirm")}</AppText>
      </Dialog>
    </Screen>
  );
}

/** Khoảng cách giữa các hàng trong danh sách (thay cho gap của ScrollView). */
function ListSeparator() {
  return <View style={styles.separator} />;
}

/**
 * Một hàng từ: WordCell (đọc từ cache sense) + loa đọc mặt chữ + chip tag
 * + nghĩa VI + ghi chú + chip trạng thái.
 */
function ItemRow({
  item,
  index,
  tagsById,
  onOpen,
  onDelete,
}: {
  item: ItemResponseDto;
  index: number;
  tagsById: Map<string, TagDto>;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const theme = useTheme();
  const sense = useSenseDetail(item.display_sense_id ?? item.anchor_sense_id);
  const card = sense.data?.card;
  const itemTags = item.tag_ids
    .map(id => tagsById.get(id))
    .filter((tag): tag is TagDto => Boolean(tag));

  return (
    <Pressable
      onPress={onOpen}
      onLongPress={onDelete}
      delayLongPress={350}
      accessibilityRole="button"
      accessibilityLabel={item.meaning_vi}
      testID={`item-row-${item.id}`}
      style={({ pressed }) => [
        styles.itemRow,
        { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
        pressed ? styles.itemRowPressed : null,
      ]}
    >
      <View style={styles.itemHeader}>
        <WordCell
          surface={card?.lemma ?? "…"}
          reading={card?.reading ?? undefined}
          langCode="ja"
          style={styles.itemWord}
          right={
            card?.lemma ? (
              // Loa đọc mặt chữ ngay trong hàng (như ItemWordCell bản web)
              <SpeakButton
                text={card.lemma}
                lang="ja"
                size="sm"
                testID={`item-speak-${index}`}
              />
            ) : undefined
          }
        />
        <Chip>{itemStatusLabel(item.status)}</Chip>
      </View>
      {itemTags.length > 0 ? (
        <View style={styles.tagRow}>
          {itemTags.map(tag => (
            <Chip key={tag.id}>{tag.name}</Chip>
          ))}
        </View>
      ) : null}
      <AppText variant="body" weight="medium" numberOfLines={2}>
        {item.meaning_vi}
      </AppText>
      {item.note ? (
        <AppText variant="caption" numberOfLines={2}>
          {item.note}
        </AppText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screenContent: { padding: 0 },
  content: { padding: spacing.lg, gap: spacing.lg },
  headerBlock: { gap: spacing.lg },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  headerName: { flexShrink: 1 },
  headerActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  sortRow: { gap: spacing.xs },
  sortControl: { alignSelf: "stretch" },
  list: { gap: spacing.sm },
  skeletonCard: { gap: spacing.sm },
  errorCard: { gap: spacing.sm },
  retry: { alignSelf: "center" },
  separator: { height: spacing.sm },
  itemRow: {
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  itemRowPressed: { opacity: 0.9 },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  itemWord: { flex: 1 },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  footer: { paddingVertical: spacing.md, alignItems: "center" },
  footerText: { paddingVertical: spacing.md },
});
