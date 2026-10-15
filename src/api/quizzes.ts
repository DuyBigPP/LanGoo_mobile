import { api } from "@/api/client";
import type {
  CreateQuizDto,
  QuizDetailDto,
  QuizDto,
  QuizListDto,
  QuizStartDto,
} from "@/types/api";

export async function createQuiz(dto: CreateQuizDto): Promise<QuizDto> {
  const { data } = await api.post<QuizDto>("/v1/quizzes", dto);
  return data;
}

export async function fetchQuizzes(
  params: { limit?: number; cursor?: string | null } = {},
): Promise<QuizListDto> {
  const { data } = await api.get<QuizListDto>("/v1/quizzes", {
    params: { limit: params.limit ?? 20, cursor: params.cursor ?? undefined },
  });
  return data;
}

export async function fetchQuiz(id: string): Promise<QuizDetailDto> {
  const { data } = await api.get<QuizDetailDto>(`/v1/quizzes/${id}`);
  return data;
}

export async function startQuiz(id: string): Promise<QuizStartDto> {
  const { data } = await api.post<QuizStartDto>(`/v1/quizzes/${id}/start`);
  return data;
}
