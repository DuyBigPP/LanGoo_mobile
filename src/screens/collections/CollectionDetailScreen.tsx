import * as React from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ApiError } from "@/api/client";
import { CollectionHeaderCard } from "@/components/collections/CollectionHeaderCard";
import { CollectionItemRow } from "@/components/collections/CollectionItemRow";
import { CollectionNameDialog } from "@/components/collections/CollectionNameDialog";
import { StartStudySheet } from "@/components/review/StartStudySheet";
import {
  AppText,
  Button,
  Card,
  Dialog,
  EmptyState,
  Screen,
  SectionHeader,
  SegmentedControl,
  Skeleton,
  useToast,
} from "@/components/ui";
import {
  useArchiveCollectionMutation,
  useCollectionItemsQuery,
  useCollectionQuery,
  useDeleteItemMutation,
  useUpdateCollectionMutation,
} from "@/hooks/use-collections";
import {
  useSortedCollectionItems,
  type CollectionSortKey,
} from "@/hooks/use-sorted-collection-items";
import { useTagsQuery } from "@/hooks/use-tags";
import { useT } from "@/i18n";
import { formatNumber } from "@/lib/format";
import type { RootStackParamList } from "@/navigation/types";
import { spacing, useTheme } from "@/theme";
import type { ItemResponseDto, TagDto } from "@/types/api";

type Props = NativeStackScreenProps<RootStackParamList, "CollectionDetail">;

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

  const [sort, setSort] = React.useState<CollectionSortKey>("added_desc");
  const [studyOpen, setStudyOpen] = React.useState(false);
  const [renameOpen, setRenameOpen] = React.useState(false);
  const [renameDraft, setRenameDraft] = React.useState("");
  const [archiveOpen, setArchiveOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<ItemResponseDto | null>(null);

  const { items, sortedItems } = useSortedCollectionItems(itemsQuery, sort);

  // Tra tên tag theo id để hiện chip trên từng hàng (như CollectionItemRow bản web)
  const tagsById = React.useMemo(() => {
    const map = new Map<string, TagDto>();
    for (const tag of tags.data?.data ?? []) map.set(tag.id, tag);
    return map;
  }, [tags.data]);

  /** Cuộn tới đáy -> nạp trang kế theo next_cursor. */
  const handleEndReached = () => {
    if (!itemsQuery.hasNextPage || itemsQuery.isFetchingNextPage) return;
    void itemsQuery.fetchNextPage();
  };

  const collectionData = collection.data;
  const displayName = collectionData?.name ?? name;

  /** Chạy một thao tác ghi; lỗi -> toast thông điệp của API. */
  const runMutation = async (action: () => Promise<unknown>, successMessage: string, done: () => void) => {
    try {
      await action();
      show(successMessage, { type: "success" });
      done();
    } catch (error) {
      show(ApiError.from(error).message, { type: "error" });
    }
  };

  const handleRename = () => {
    const trimmed = renameDraft.trim();
    if (!trimmed) return;
    void runMutation(
      () => updateCollection.mutateAsync({ name: trimmed }),
      t("study.renamedNamed", { name: trimmed }),
      () => setRenameOpen(false),
    );
  };

  const handleArchive = () =>
    void runMutation(
      () => archiveCollection.mutateAsync(collectionId),
      t("study.archivedNamed", { name: displayName }),
      () => {
        setArchiveOpen(false);
        navigation.goBack();
      },
    );

  const handleDelete = () => {
    const target = deleteTarget;
    if (!target) return;
    void runMutation(
      () => deleteItem.mutateAsync(target.id),
      t("study.removeItemDone"),
      () => setDeleteTarget(null),
    );
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

  const visibleCount =
    collectionData?.visible_item_count ?? collectionData?.item_count ?? items.length;

  // Đầu danh sách: thông tin sổ tay + sắp xếp + tiêu đề mục
  const listHeader = (
    <View style={styles.headerBlock}>
      <CollectionHeaderCard
        name={displayName}
        kind={collectionData?.kind}
        description={collectionData?.description}
        wordCount={visibleCount}
        onStudy={() => setStudyOpen(true)}
        onRename={() => {
          setRenameDraft(displayName);
          setRenameOpen(true);
        }}
        onArchive={() => setArchiveOpen(true)}
      />

      <View style={styles.sortRow}>
        <AppText variant="label">{t("study.sort")}</AppText>
        <SegmentedControl
          options={sortOptions}
          value={sort}
          onChange={value => setSort(value as CollectionSortKey)}
          testID="items-sort"
        />
      </View>

      <SectionHeader title={t("study.wordsInCollection")} count={visibleCount} testID="items-header" />
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
          <CollectionItemRow
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

      <CollectionNameDialog
        visible={renameOpen}
        title={t("study.formRenameTitle")}
        description={t("study.formRenameDesc")}
        confirmLabel={t("study.formSaveRename")}
        value={renameDraft}
        onChange={setRenameDraft}
        onConfirm={handleRename}
        onClose={() => setRenameOpen(false)}
        testID="collection-rename-dialog"
        inputTestID="collection-rename-input"
      />

      {/* Xác nhận lưu trữ */}
      <Dialog
        visible={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        title={t("study.archiveTitle")}
        testID="collection-archive-dialog"
        actions={[
          { label: t("common.cancel"), variant: "outline", onPress: () => setArchiveOpen(false) },
          { label: t("study.archive"), variant: "danger", onPress: handleArchive },
        ]}
      >
        <AppText variant="body">{t("study.archiveDesc", { name: displayName })}</AppText>
      </Dialog>

      {/* Xác nhận xoá từ khỏi sổ tay */}
      <Dialog
        visible={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title={t("study.removeItemConfirm")}
        testID="item-delete-dialog"
        actions={[
          { label: t("common.cancel"), variant: "outline", onPress: () => setDeleteTarget(null) },
          { label: t("study.removeItem"), variant: "danger", onPress: handleDelete },
        ]}
      >
        <AppText variant="body">{t("study.removeItemDesc")}</AppText>
      </Dialog>
    </Screen>
  );
}

/** Khoảng cách giữa các hàng trong danh sách (thay cho gap của ScrollView). */
function ListSeparator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  screenContent: { padding: 0 },
  content: { padding: spacing.lg, gap: spacing.lg },
  headerBlock: { gap: spacing.lg },
  sortRow: { gap: spacing.xs },
  list: { gap: spacing.sm },
  skeletonCard: { gap: spacing.sm },
  errorCard: { gap: spacing.sm },
  retry: { alignSelf: "center" },
  separator: { height: spacing.sm },
  footer: { paddingVertical: spacing.md, alignItems: "center" },
  footerText: { paddingVertical: spacing.md },
});
