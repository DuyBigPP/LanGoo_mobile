import React from "react";
import { FlatList, RefreshControl, View } from "react-native";
import { HistoryRow } from "@/components/dictionary/HistoryRow";
import {
  AppText,
  Button,
  Card,
  EmptyState,
  SectionHeader,
  Skeleton,
} from "@/components/ui";
import type { useSearchHistory } from "@/hooks/use-dictionary";
import { useT } from "@/i18n";
import { formatNumber } from "@/lib/format";
import { useTheme } from "@/theme";
import type { SearchHistoryItemDto } from "@/types/dictionary";

export interface DictionaryHistoryListProps {
  /** Khối trên cùng (ô tra + tab) hiển thị làm header của danh sách. */
  header: React.ReactNode;
  history: ReturnType<typeof useSearchHistory>;
  /** Toàn bộ dòng đã có ở client và phần đang hiện (cuộn vô hạn theo khối). */
  allItems: SearchHistoryItemDto[];
  visibleItems: SearchHistoryItemDto[];
  isGuest: boolean;
  onShowMore: () => void;
  onPick: (query: string) => void;
  onLogin: () => void;
}

/** Lịch sử tra: cuộn vô hạn — chạm đáy hiện thêm một khối (dữ liệu đã có sẵn ở client). */
export function DictionaryHistoryList({
  header,
  history,
  allItems,
  visibleItems,
  isGuest,
  onShowMore,
  onPick,
  onLogin,
}: DictionaryHistoryListProps) {
  const t = useT();
  const theme = useTheme();
  const hasMore = visibleItems.length < allItems.length;

  return (
    <FlatList
      data={visibleItems}
      keyExtractor={item => item.id}
      renderItem={({ item, index }) => <HistoryRow item={item} index={index} onPick={onPick} />}
      ListHeaderComponent={
        <>
          {header}
          {allItems.length > 0 ? (
            <SectionHeader title={t("dict.historyTitle")} count={allItems.length} />
          ) : null}
        </>
      }
      ListEmptyComponent={
        // isLoading (không phải isPending): guest có query bị tắt -> rơi về trạng thái trống
        isGuest ? (
          <EmptyState
            title={t("dict.historyTitle")}
            description={t("dict.historyGuest")}
            actionLabel={t("auth.loginAction")}
            onAction={onLogin}
            testID="dict-history-guest"
          />
        ) : history.isLoading ? (
          <Card testID="dict-history-loading">
            {[0, 1, 2, 3].map(index => (
              <View key={index} className="gap-2 py-2">
                <Skeleton height={14} width="45%" />
                <Skeleton height={12} width="35%" />
              </View>
            ))}
          </Card>
        ) : history.isError ? (
          <Card className="gap-2">
            <AppText variant="caption" center>
              {t("dict.loadError")}
            </AppText>
            <Button
              label={t("common.retry")}
              variant="outline"
              size="sm"
              onPress={() => void history.refetch()}
              className="self-center"
            />
          </Card>
        ) : (
          <EmptyState title={t("dict.historyTitle")} description={t("dict.historyEmpty")} />
        )
      }
      ListFooterComponent={
        allItems.length > 0 && !hasMore ? (
          <AppText variant="caption" center testID="dict-history-end">
            {t("dict.allLoaded", { count: formatNumber(allItems.length) })}
          </AppText>
        ) : null
      }
      contentContainerClassName="gap-3 p-4"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      onEndReached={onShowMore}
      onEndReachedThreshold={0.4}
      // Guest: không kéo làm mới (refetch() bỏ qua `enabled` -> sẽ dính 401)
      refreshControl={
        isGuest ? undefined : (
          <RefreshControl
            refreshing={history.isRefetching}
            onRefresh={() => void history.refetch()}
            tintColor={theme.colors.primary}
          />
        )
      }
      testID="dict-history"
    />
  );
}
