import { api } from "@/api/client";
import type {
  AnswerResultDto,
  AnswerSessionDto,
  CreateSessionDto,
  SessionDetailDto,
  SessionDto,
  SessionItemDto,
} from "@/types/api";

export async function createSession(dto: CreateSessionDto): Promise<SessionDetailDto> {
  const { data } = await api.post<SessionDetailDto>("/v1/sessions", dto);
  return data;
}

export async function fetchSession(id: string): Promise<SessionDetailDto> {
  const { data } = await api.get<SessionDetailDto>(`/v1/sessions/${id}`);
  return data;
}

export async function fetchSessionItems(
  id: string,
  params: { is_correct?: boolean } = {},
): Promise<SessionItemDto[]> {
  const { data } = await api.get<SessionItemDto[]>(`/v1/sessions/${id}/items`, {
    params: { is_correct: params.is_correct ?? undefined },
  });
  return data;
}

export async function answerSession(id: string, dto: AnswerSessionDto): Promise<AnswerResultDto> {
  const { data } = await api.post<AnswerResultDto>(`/v1/sessions/${id}/answers`, dto);
  return data;
}

export async function finishSession(id: string): Promise<SessionDto> {
  const { data } = await api.post<SessionDto>(`/v1/sessions/${id}/finish`);
  return data;
}
