import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addCollectionItem,
  archiveCollection,
  createCollection,
  deleteCollectionItem,
  fetchCollection,
  fetchCollectionItems,
  fetchCollections,
  updateCollection,
  updateCollectionItem,
} from "@/api/collections";
import type { FetchItemsParams } from "@/api/collections";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveProfile } from "@/hooks/use-profile";

export interface ItemFilters {
  status?: string;
  languageId?: number;
}

export const collectionKeys = {
  list: ["collections"] as const,
  detail: (id: string) => ["collections", id] as const,
  items: (id: string, filters: ItemFilters) =>
    ["collections", id, "items", filters.status ?? "all", filters.languageId ?? 0] as const,
};

function toParams(filters: ItemFilters): FetchItemsParams {
  return {
    status: filters.status === "all" ? undefined : filters.status,
    language_id: filters.languageId === 0 ? undefined : filters.languageId,
  };
}

/** Danh sách sổ tay của hồ sơ đang học (lọc theo profile_id active). */
export function useCollectionsQuery(enabled = true) {
  const { profileId } = useActiveProfile();
  // Sổ tay cần đăng nhập — sheet "Thêm vào sổ tay" mount được ở màn công khai
  const authenticated = useAuth().status === "authenticated";
  return useQuery({
    queryKey: [...collectionKeys.list, profileId ?? "none"],
    queryFn: () => fetchCollections({ limit: 100, profile_id: profileId ?? undefined }),
    enabled: enabled && authenticated,
    staleTime: 30_000,
  });
}

/** Danh sách sổ tay có phân trang (pager) — theo hồ sơ đang học. */
export function useCollectionsInfiniteQuery(enabled = true, pageSize = 12) {
  const { profileId } = useActiveProfile();
  const authenticated = useAuth().status === "authenticated";
  return useInfiniteQuery({
    queryKey: [...collectionKeys.list, "infinite", profileId ?? "none", pageSize] as const,
    queryFn: ({ pageParam }) =>
      fetchCollections({
        limit: pageSize,
        cursor: pageParam,
        profile_id: profileId ?? undefined,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next_cursor,
    enabled: enabled && authenticated,
    staleTime: 30_000,
  });
}

export function useCollectionQuery(id: string | undefined) {
  return useQuery({
    queryKey: collectionKeys.detail(id ?? "none"),
    queryFn: () => fetchCollection(id as string),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useCollectionItemsQuery(id: string | undefined, filters: ItemFilters) {
  return useInfiniteQuery({
    queryKey: collectionKeys.items(id ?? "none", filters),
    queryFn: ({ pageParam }) =>
      fetchCollectionItems(id as string, { ...toParams(filters), cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.next_cursor,
    enabled: Boolean(id),
    staleTime: 15_000,
  });
}

export function useCreateCollectionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCollection,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: collectionKeys.list });
    },
  });
}

export function useUpdateCollectionMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof updateCollection>[1]) => updateCollection(id, input),
    onSuccess: (collection) => {
      queryClient.setQueryData(collectionKeys.detail(id), collection);
      void queryClient.invalidateQueries({ queryKey: collectionKeys.list });
    },
  });
}

export function useArchiveCollectionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: archiveCollection,
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: collectionKeys.detail(id) });
      void queryClient.invalidateQueries({ queryKey: collectionKeys.list });
    },
  });
}

export function useAddCollectionItemMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      collectionId: string;
      item: Parameters<typeof addCollectionItem>[1];
    }) => addCollectionItem(input.collectionId, input.item),
    onSuccess: (_item, input) => {
      void queryClient.invalidateQueries({ queryKey: collectionKeys.list });
      void queryClient.invalidateQueries({ queryKey: ["collections", input.collectionId] });
      // Từ mới có thể vào hàng đợi học -> làm mới queue + số liệu
      void queryClient.invalidateQueries({ queryKey: ["srs"] });
      void queryClient.invalidateQueries({ queryKey: ["srs-stats"] });
      void queryClient.invalidateQueries({ queryKey: ["me-stats"] });
    },
  });
}

export function useUpdateItemMutation(collectionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { itemId: string; patch: Parameters<typeof updateCollectionItem>[2] }) =>
      updateCollectionItem(collectionId, input.itemId, input.patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["collections", collectionId] });
      // Đổi trạng thái (pause/resume/suspend…) ảnh hưởng hàng đợi + số liệu
      void queryClient.invalidateQueries({ queryKey: ["srs"] });
      void queryClient.invalidateQueries({ queryKey: ["srs-stats"] });
      void queryClient.invalidateQueries({ queryKey: ["me-stats"] });
    },
  });
}

export function useDeleteItemMutation(collectionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => deleteCollectionItem(collectionId, itemId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["collections", collectionId] });
      void queryClient.invalidateQueries({ queryKey: collectionKeys.list });
      void queryClient.invalidateQueries({ queryKey: ["srs"] });
      void queryClient.invalidateQueries({ queryKey: ["srs-stats"] });
      void queryClient.invalidateQueries({ queryKey: ["me-stats"] });
    },
  });
}
