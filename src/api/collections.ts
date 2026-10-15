import { api } from "@/api/client";
import type {
  ArchivedResponseDto,
  CollectionDto,
  CollectionListResponseDto,
  CreateCollectionDto,
  CreateItemDto,
  DeletedResponseDto,
  ItemListResponseDto,
  ItemResponseDto,
  UpdateCollectionDto,
  UpdateItemDto,
} from "@/types/api";

export interface FetchCollectionsParams {
  limit?: number;
  cursor?: string | null;
  profile_id?: string;
}

export async function fetchCollections(
  params: FetchCollectionsParams = {},
): Promise<CollectionListResponseDto> {
  const { data } = await api.get<CollectionListResponseDto>("/v1/collections", {
    params: {
      profile_id: params.profile_id ?? undefined,
      limit: params.limit ?? 100,
      cursor: params.cursor ?? undefined,
    },
  });
  return data;
}

export async function fetchCollection(id: string): Promise<CollectionDto> {
  const { data } = await api.get<CollectionDto>(`/v1/collections/${id}`);
  return data;
}

export async function createCollection(dto: CreateCollectionDto): Promise<CollectionDto> {
  const { data } = await api.post<CollectionDto>("/v1/collections", dto);
  return data;
}

export async function updateCollection(
  id: string,
  dto: UpdateCollectionDto,
): Promise<CollectionDto> {
  const { data } = await api.patch<CollectionDto>(`/v1/collections/${id}`, dto);
  return data;
}

export async function archiveCollection(id: string): Promise<ArchivedResponseDto> {
  const { data } = await api.delete<ArchivedResponseDto>(`/v1/collections/${id}`);
  return data;
}

export interface FetchItemsParams {
  language_id?: number;
  status?: string;
  limit?: number;
  cursor?: string | null;
}

export async function fetchCollectionItems(
  collectionId: string,
  params: FetchItemsParams = {},
): Promise<ItemListResponseDto> {
  const { data } = await api.get<ItemListResponseDto>(`/v1/collections/${collectionId}/items`, {
    params: {
      language_id: params.language_id ?? undefined,
      status: params.status ?? undefined,
      limit: params.limit ?? 20,
      cursor: params.cursor ?? undefined,
    },
  });
  return data;
}

export async function addCollectionItem(
  collectionId: string,
  dto: CreateItemDto,
): Promise<ItemResponseDto> {
  const { data } = await api.post<ItemResponseDto>(`/v1/collections/${collectionId}/items`, dto);
  return data;
}

export async function updateCollectionItem(
  collectionId: string,
  itemId: string,
  dto: UpdateItemDto,
): Promise<ItemResponseDto> {
  const { data } = await api.patch<ItemResponseDto>(
    `/v1/collections/${collectionId}/items/${itemId}`,
    dto,
  );
  return data;
}

export async function deleteCollectionItem(
  collectionId: string,
  itemId: string,
): Promise<DeletedResponseDto> {
  const { data } = await api.delete<DeletedResponseDto>(
    `/v1/collections/${collectionId}/items/${itemId}`,
  );
  return data;
}
