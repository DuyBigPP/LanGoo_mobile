import * as React from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MoreHorizontal, NotebookText, Play, Plus, Search, X } from "lucide-react-native";
import { ApiError } from "@/api/client";
import {
  AppText,
  Button,
  Card,
  Chip,
  Dialog,
  EmptyState,
  IconButton,
  Input,
  Screen,
  SectionHeader,
  Skeleton,
  useToast,
} from "@/components/ui";
import { StartStudySheet } from "@/components/review/StartStudySheet";
import {
  useArchiveCollectionMutation,
  useCollectionsInfiniteQuery,
  useCreateCollectionMutation,
  useUpdateCollectionMutation,
} from "@/hooks/use-collections";
import { useActiveProfile } from "@/hooks/use-profile";
import { useSrsStatsQuery } from "@/hooks/use-stats";
import { useT } from "@/i18n";
import { collectionKindLabel } from "@/lib/dictionary-labels";
import { formatDate, formatNumber } from "@/lib/format";
import type { RootStackParamList } from "@/navigation/types";
import { radius, spacing, useTheme } from "@/theme";
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
  const [menuTarget, setMenuTarget] = React.useState<CollectionDto | null>(null);
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

  const handleCreate = async () => {
    const trimmed = createDraft.trim();
    if (!trimmed) return;
    try {
      await createCollection.mutateAsync({
        name: trimmed,
        profile_id: profileId ?? undefined,
      });
      show(t("study.created"), { type: "success" });
      setCreateOpen(false);
      setCreateDraft("");
    } catch (error) {
      show(ApiError.from(error).message, { type: "error" });
    }
  };

  const handleRename = async () => {
    const target = renameTarget;
    const trimmed = renameDraft.trim();
    if (!target || !trimmed) return;
    try {
      await updateCollection.mutateAsync({ name: trimmed });
      show(t("study.renamed"), { type: "success" });
      setRenameTarget(null);
    } catch (error) {
      show(ApiError.from(error).message, { type: "error" });
    }
  };

  const handleArchive = async () => {
    const target = archiveTarget;
    if (!target) return;
    try {
      await archiveCollection.mutateAsync(target.id);
      show(t("study.archived"), { type: "success" });
      setArchiveTarget(null);
    } catch (error) {
      show(ApiError.from(error).message, { type: "error" });
    }
  };

  /** (a) Tổng quan ôn tập hôm nay + (b) đầu mục sổ tay (đếm, tìm kiếm, tạo mới). */
  const header = (
    <View style={styles.headerBlock}>
      <Card testID="study-overview">
        <View style={styles.statsGrid}>
          <StatCell
            label={t("study.dueToday")}
            value={stats.data?.due_now}
            unit={t("study.cardUnit")}
            loading={stats.isPending}
          />
          <StatCell
            label={t("study.learning")}
            value={stats.data?.learning}
            unit={t("study.cardUnit")}
            loading={stats.isPending}
          />
          <StatCell
            label={t("study.newToday")}
            value={stats.data?.new_introduced_today}
            unit={t("study.cardUnit")}
            loading={stats.isPending}
          />
          <StatCell
            label={t("study.reviewedToday")}
            value={stats.data?.reviews_today}
            unit={t("study.reviewUnit")}
            loading={stats.isPending}
          />
        </View>
        <Button
          label={t("study.startToday")}
          icon={<Play size={18} color={theme.colors.onPrimary} />}
          onPress={() => openStudy(null)}
          fullWidth
          style={styles.startButton}
          testID="start-study-all"
        />
      </Card>

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
    <View style={styles.list}>
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index} style={styles.skeletonCard}>
          <Skeleton height={18} width="55%" />
          <Skeleton height={12} width="35%" />
        </Card>
      ))}
    </View>
  ) : collections.isError ? (
    <Card style={styles.errorCard}>
      <AppText variant="caption" center>
        {t("study.loadError")}
      </AppText>
      <Button
        label={t("common.retry")}
        variant="outline"
        size="sm"
        onPress={() => void collections.refetch()}
        style={styles.retry}
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
    <View style={styles.listFooter} testID="collections-footer">
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
    <Screen title={t("study.title")} testID="collections-screen" contentStyle={styles.screenContent}>
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <NotebookCard
            collection={item}
            onOpen={() =>
              navigation.navigate("CollectionDetail", {
                collectionId: item.id,
                name: item.name,
              })
            }
            onStudy={() => openStudy(item)}
            onMenu={() => setMenuTarget(item)}
          />
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={emptyBlock}
        ListFooterComponent={footer}
        contentContainerStyle={styles.content}
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

      {/* Tạo sổ tay */}
      <Dialog
        visible={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t("study.formCreateTitle")}
        testID="collection-create-dialog"
        actions={[
          {
            label: t("common.cancel"),
            variant: "outline",
            onPress: () => setCreateOpen(false),
          },
          {
            label: t("study.formCreate"),
            variant: "primary",
            onPress: () => void handleCreate(),
          },
        ]}
      >
        <AppText variant="caption">{t("study.formCreateDesc")}</AppText>
        <Input
          label={t("study.formName")}
          value={createDraft}
          onChangeText={setCreateDraft}
          placeholder={t("study.formNamePlaceholder")}
          testID="collection-create-input"
        />
      </Dialog>

      {/* Menu tuỳ chọn của một sổ tay */}
      <Dialog
        visible={Boolean(menuTarget)}
        onClose={() => setMenuTarget(null)}
        title={menuTarget?.name ?? t("study.collectionMenu")}
        testID="collection-menu-dialog"
        actions={[
          {
            label: t("study.studyNotebook"),
            variant: "outline",
            onPress: () => {
              const target = menuTarget;
              setMenuTarget(null);
              if (target) openStudy(target);
            },
          },
          {
            label: t("study.rename"),
            variant: "outline",
            onPress: () => {
              setRenameDraft(menuTarget?.name ?? "");
              setRenameTarget(menuTarget);
              setMenuTarget(null);
            },
          },
          {
            label: t("study.archive"),
            variant: "danger",
            onPress: () => {
              setArchiveTarget(menuTarget);
              setMenuTarget(null);
            },
          },
        ]}
      >
        <AppText variant="caption">{t("study.collectionMenu")}</AppText>
      </Dialog>

      {/* Đổi tên sổ tay */}
      <Dialog
        visible={Boolean(renameTarget)}
        onClose={() => setRenameTarget(null)}
        title={t("study.formRenameTitle")}
        testID="collection-rename-dialog"
        actions={[
          {
            label: t("common.cancel"),
            variant: "outline",
            onPress: () => setRenameTarget(null),
          },
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
        visible={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        title={t("study.archiveTitle")}
        testID="collection-archive-dialog"
        actions={[
          {
            label: t("common.cancel"),
            variant: "outline",
            onPress: () => setArchiveTarget(null),
          },
          {
            label: t("study.archive"),
            variant: "danger",
            onPress: () => void handleArchive(),
          },
        ]}
      >
        <AppText variant="body">
          {t("study.archiveDesc", { name: archiveTarget?.name ?? "" })}
        </AppText>
      </Dialog>
    </Screen>
  );
}

/** Thẻ một sổ tay (mirror web `NotebookCard`): mở chi tiết, học nhanh, menu đổi tên/lưu trữ. */
function NotebookCard({
  collection,
  onOpen,
  onStudy,
  onMenu,
}: {
  collection: CollectionDto;
  onOpen: () => void;
  onStudy: () => void;
  onMenu: () => void;
}) {
  const t = useT();
  const theme = useTheme();
  const count = formatNumber(collection.visible_item_count ?? collection.item_count);

  return (
    <Card onPress={onOpen} testID={`collection-row-${collection.id}`} style={styles.notebookCard}>
      <View style={styles.notebookTop}>
        <View
          style={[
            styles.notebookIcon,
            { borderColor: theme.colors.border, backgroundColor: theme.colors.primarySoft },
          ]}
        >
          <NotebookText size={18} color={theme.colors.primary} />
        </View>
        <View style={styles.notebookInfo}>
          <AppText variant="body" weight="semibold" numberOfLines={1}>
            {collection.name}
          </AppText>
          <Chip>{collectionKindLabel(collection.kind)}</Chip>
        </View>
        <IconButton
          icon={<MoreHorizontal size={18} color={theme.colors.textMuted} />}
          onPress={onMenu}
          accessibilityLabel={t("study.collectionMenu")}
          size="sm"
          testID={`collection-menu-${collection.id}`}
        />
      </View>

      <View style={styles.notebookFooter}>
        <AppText variant="caption" numberOfLines={1} style={styles.flex}>
          {`${t("study.wordsCount", { count })} · ${formatDate(collection.created_at)}`}
        </AppText>
        {/* Học nhanh ngay trên thẻ — mở sheet chọn hình thức học cho sổ này */}
        <Button
          label={t("study.studyNotebook")}
          variant="outline"
          size="sm"
          icon={<Play size={14} color={theme.colors.text} />}
          onPress={onStudy}
          testID={`collection-study-${collection.id}`}
        />
      </View>
    </Card>
  );
}

/** Một ô thống kê nhỏ: giá trị lớn + nhãn; hiện skeleton khi đang tải. */
function StatCell({
  label,
  value,
  unit,
  loading,
}: {
  label: string;
  value?: number;
  unit: string;
  loading: boolean;
}) {
  if (loading) {
    return (
      <View style={styles.statCell}>
        <Skeleton width={48} height={24} />
        <Skeleton width={84} height={12} />
      </View>
    );
  }

  return (
    <View style={styles.statCell}>
      <AppText variant="title">
        {`${formatNumber(value ?? 0)} ${unit}`}
      </AppText>
      <AppText variant="caption">{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContent: { padding: 0 },
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg },
  headerBlock: { gap: spacing.md },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: spacing.lg,
  },
  statCell: { width: "50%", gap: spacing.xs },
  startButton: { marginTop: spacing.lg },
  list: { gap: spacing.sm },
  skeletonCard: { gap: spacing.sm },
  errorCard: { gap: spacing.sm },
  retry: { alignSelf: "center" },
  listFooter: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm },
  notebookCard: { gap: spacing.md },
  notebookTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  notebookIcon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: radius.md,
  },
  notebookInfo: { flex: 1, gap: spacing.xs },
  notebookFooter: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
});
