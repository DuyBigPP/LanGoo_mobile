import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createTag, deleteTag, fetchTags } from "@/api/tags";

export const tagKeys = {
  list: ["tags"] as const,
};

/** Danh sách tag của người dùng (port từ web `use-tags`). */
export function useTagsQuery(enabled = true) {
  return useQuery({
    queryKey: tagKeys.list,
    queryFn: fetchTags,
    enabled,
    staleTime: 60_000,
  });
}

export function useCreateTagMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTag,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tagKeys.list });
    },
  });
}

export function useDeleteTagMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTag,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tagKeys.list });
      // Item đang gắn tag bị xoá -> làm mới danh sách sổ tay
      void queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
  });
}
