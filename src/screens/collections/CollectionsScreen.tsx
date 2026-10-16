import * as React from "react";
import { ActivityIndicator, FlatList, RefreshControl, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Plus, Search, X } from "lucide-react-native";
import { ApiError } from "@/api/client";
import { CollectionNameDialog } from "@/components/collections/CollectionNameDialog";
import { NotebookCard } from "@/components/collections/NotebookCard";
import { StudyOverviewCard } from "@/components/collections/StudyOverviewCard";
import { StartStudySheet } from "@/components/review/StartStudySheet";
import {
  AppText,
  Button,
  Card,
  Dialog,
  EmptyState,
  IconButton,
  Input,
  Screen,
  SectionHeader,
  Skeleton,
  useToast,
} from "@/components/ui";
import {
  useArchiveCollectionMutation,
  useCollectionsInfiniteQuery,
  useCreateCollectionMutation,
  useUpdateCollectionMutation,
} from "@/hooks/use-collections";
import { useActiveProfile } from "@/hooks/use-profile";
import { useSrsStatsQuery } from "@/hooks/use-stats";
import { useT } from "@/i18n";
import { formatNumber } from "@/lib/format";
import type { RootStackParamList } from "@/navigation/types";
import { useTheme } from "@/theme";
import type { CollectionDto } from "@/types/api";

type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

/** Số sổ tay nạp mỗi trang khi cuộn tới đáy (onEndReached). */
const PAGE_SIZE = 10;

/**
 * Tab Học tập (mirror web /collections):
 * tổng quan SRS hôm nay + danh sách sổ tay (tìm kiếm, cuộn vô hạn, tạo/đổi tên/lưu trữ,
 * học nhanh một sổ hoặc tất cả).
 */
export function CollectionsScreen() {
  const t = useT();
  const theme = useTheme();
  const { show } = useToast();
  const navigation = useNavigation<RootNavigation>();
  const { profileId } = useActiveProfile();

  const stats = useSrsStatsQuery();
  const collections = useCollectionsInfiniteQuery(true, PAGE_SIZE);
  const createCollection = useCreateCollectionMutation();

  const [studyOpen, setStudyOpen] = React.useState(false);
  // Sổ tay đang mở sheet học; null = học tất cả
  const [studyTarget, setStudyTarget] = React.useState<CollectionDto | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createDraft, setCreateDraft] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [renameTarget, setRenameTarget] = React.useState<CollectionDto | null>(null);
  const [renameDraft, setRenameDraft] = React.useState("");
  const [archiveTarget, setArchiveTarget] = React.useState<CollectionDto | null>(null);

  // Hook gắn với id đang chọn — dialog mở xong mới gọi mutate nên closure luôn đúng
  const updateCollection = useUpdateCollectionMutation(renameTarget?.id ?? "");
  const archiveCollection = useArchiveCollectionMutation();

  const items = React.useMemo(
    () => collections.data?.pages.flatMap(page => page.data) ?? [],
    [collections.data],
  );

  // Lọc theo tên ở client (API /v1/collections không có tham số `q` — giống bản web)
  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(collection => collection.name.toLowerCase().includes(needle));
  }, [items, query]);

  /** Chạm đáy danh sách -> nạp thêm một trang sổ tay từ máy chủ. */
  const handleEndReached = () => {
    if (!collections.hasNextPage || collections.isFetchingNextPage) return;
    void collections.fetchNextPage();
  };

  const openStudy = (collection: CollectionDto | null) => {
    setStudyTarget(collection);
    setStudyOpen(true);
  };

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

  const handleCreate = () => {
    const name = createDraft.trim();
    if (!name) return;
    void runMutation(
      () => createCollection.mutateAsync({ name, profile_id: profileId ?? undefined }),
      t("study.createdNamed", { name }),
      () => {
        setCreateOpen(false);
        setCreateDraft("");
      },
    );
  };

  const handleRename = () => {
    const name = renameDraft.trim();
    if (!renameTarget || !name) return;
    void runMutation(
      () => updateCollection.mutateAsync({ name }),
      t("study.renamedNamed", { name }),
      () => setRenameTarget(null),
    );
  };

  const handleArchive = () => {
    const target = archiveTarget;
    if (!target) return;
    void runMutation(
      () => archiveCollection.mutateAsync(target.id),
      t("study.archivedNamed", { name: target.name }),
      () => setArchiveTarget(null),
    );
  };

  /** (a) Tổng quan ôn tập hôm nay + (b) đầu mục sổ tay (đếm, tìm kiếm, tạo mới). */
  const header = (
    <View className="gap-3">
      <StudyOverviewCard stats={stats} onStartAll={() => openStudy(null)} />

      <SectionHeader
        title={t("study.notebooks")}
        count={items.length}
        right={
          <Button
            label={t("study.createNotebook")}
            size="sm"
            icon={<Plus size={16} color={theme.colors.onPrimary} />}
            onPress={() => setCreateOpen(true)}
            testID="collections-create"
          />
        }
      />

      {/* Tìm sổ tay theo tên (lọc client, như bản web) */}
      <Input
        value={query}
        onChangeText={setQuery}
        placeholder={t("study.searchNotebooks")}
        autoCapitalize="none"
        autoCorrect={false}
        rightSlot={
          query ? (
            <IconButton
              icon={<X size={18} color={theme.colors.textMuted} />}
              onPress={() => setQuery("")}
              accessibilityLabel={t("dict.searchClear")}
              size="sm"
              testID="collections-search-clear"
            />
          ) : (
            <Search size={18} color={theme.colors.textMuted} />
          )
        }
        testID="collections-search"
      />
    </View>
  );

  /** Trạng thái khi danh sách trống: đang tải / lỗi / chưa có sổ / không khớp tìm kiếm. */
  const emptyBlock = collections.isPending ? (
    <View className="gap-2">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index} className="gap-2">
          <Skeleton height={18} width="55%" />
          <Skeleton height={12} width="35%" />
        </Card>
      ))}
    </View>
  ) : collections.isError ? (
    <Card className="gap-2">
      <AppText variant="caption" center>
        {t("study.loadError")}
      </AppText>
      <Button
        label={t("common.retry")}
        variant="outline"
        size="sm"
        onPress={() => void collections.refetch()}
        className="self-center"
        testID="collections-retry"
      />
    </Card>
  ) : items.length === 0 ? (
    <Card>
      <EmptyState
        title={t("study.noNotebooks")}
        description={t("study.noNotebooksHint")}
        actionLabel={t("study.createNotebook")}
        onAction={() => setCreateOpen(true)}
        testID="collections-empty"
      />
    </Card>
  ) : (
    <AppText variant="caption" center testID="collections-no-match">
      {t("study.noMatch", { query })}
    </AppText>
  );

  /** Chân danh sách: đang nạp trang tiếp / đã hết / lỗi nạp thêm. */
  const footer = (
    <View className="items-center gap-2 py-2" testID="collections-footer">
      {collections.isFetchingNextPage ? (
        <ActivityIndicator size="small" color={theme.colors.primary} />
      ) : null}
      {!collections.hasNextPage && filtered.length > 0 ? (
        <AppText variant="caption" center testID="collections-end">
          {t("study.allLoaded", { count: formatNumber(filtered.length) })}
        </AppText>
      ) : null}
      {collections.isFetchNextPageError ? (
        <AppText variant="caption" color="danger" center>
          {t("study.loadError")}
        </AppText>
      ) : null}
    </View>
  );

  return (
    <Screen title={t("study.title")} testID="collections-screen" contentClassName="p-0">
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <NotebookCard
            collection={item}
            onOpen={() =>
              navigation.navigate("CollectionDetail", { collectionId: item.id, name: item.name })
            }
            onStudy={() => openStudy(item)}
            onRename={() => {
              setRenameDraft(item.name);
              setRenameTarget(item);
            }}
            onArchive={() => setArchiveTarget(item)}
          />
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={emptyBlock}
        ListFooterComponent={footer}
        contentContainerClassName="gap-4 p-4"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={collections.isRefetching || stats.isRefetching}
            onRefresh={() => {
              void collections.refetch();
              void stats.refetch();
            }}
            tintColor={theme.colors.primary}
          />
        }
        testID="collections-list"
      />

      {/* Bắt đầu phiên học: sổ đang chọn hoặc tất cả sổ tay */}
      <StartStudySheet
        visible={studyOpen}
        onClose={() => setStudyOpen(false)}
        collection={studyTarget ? { id: studyTarget.id, name: studyTarget.name } : null}
      />

      <CollectionNameDialog
        visible={createOpen}
        title={t("study.formCreateTitle")}
        description={t("study.formCreateDesc")}
        confirmLabel={t("study.formCreate")}
        value={createDraft}
        onChange={setCreateDraft}
        onConfirm={handleCreate}
        onClose={() => setCreateOpen(false)}
        testID="collection-create-dialog"
        inputTestID="collection-create-input"
      />

      <CollectionNameDialog
        visible={Boolean(renameTarget)}
        title={t("study.formRenameTitle")}
        description={t("study.formRenameDesc")}
        confirmLabel={t("study.formSaveRename")}
        value={renameDraft}
        onChange={setRenameDraft}
        onConfirm={handleRename}
        onClose={() => setRenameTarget(null)}
        testID="collection-rename-dialog"
        inputTestID="collection-rename-input"
      />

      {/* Xác nhận lưu trữ */}
      <Dialog
        visible={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        title={t("study.archiveTitle")}
        testID="collection-archive-dialog"
        actions={[
          { label: t("common.cancel"), variant: "outline", onPress: () => setArchiveTarget(null) },
          { label: t("study.archive"), variant: "danger", onPress: handleArchive },
        ]}
      >
        <AppText variant="body">{t("study.archiveDesc", { name: archiveTarget?.name ?? "" })}</AppText>
      </Dialog>
    </Screen>
  );
}

