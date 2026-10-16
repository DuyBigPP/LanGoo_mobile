import * as React from "react";
import type { useCollectionItemsQuery } from "@/hooks/use-collections";
import { useSensesMany } from "@/hooks/use-dictionary";
import type { ItemResponseDto } from "@/types/api";

export type CollectionSortKey = "added_desc" | "added_asc" | "az";

/**
 * Sắp xếp các từ trong sổ tay: mới nhất / cũ nhất / A–Z (theo cách đọc, dùng chung cache sense
 * với từng hàng). Chọn A–Z thì tự nạp nốt các trang còn lại để sắp đúng (mirror web).
 */
export function useSortedCollectionItems(
  itemsQuery: ReturnType<typeof useCollectionItemsQuery>,
  sort: CollectionSortKey,
): { items: ItemResponseDto[]; sortedItems: ItemResponseDto[] } {
  const items = React.useMemo(
    () => itemsQuery.data?.pages.flatMap(page => page.data) ?? [],
    [itemsQuery.data],
  );

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
      time: new Date(item.created_at).getTime(),
    }));
    if (sort === "az") decorated.sort((a, b) => a.key.localeCompare(b.key, "ja"));
    else if (sort === "added_asc") decorated.sort((a, b) => a.time - b.time);
    else decorated.sort((a, b) => b.time - a.time);
    return decorated.map(entry => entry.item);
  }, [items, senses, sort]);

  React.useEffect(() => {
    if (sort !== "az" || !itemsQuery.hasNextPage || itemsQuery.isFetchingNextPage) return;
    void itemsQuery.fetchNextPage();
  }, [sort, itemsQuery]);

  return { items, sortedItems };
}
