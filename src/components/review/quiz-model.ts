import type { QuizContextDto, SessionItemDto, SessionQuizPromptDto } from "@/types/api";

/** Thời gian trả lời tối đa gửi lên API (Swagger: elapsed_ms ≤ 3.600.000). */
export const MAX_ELAPSED_MS = 3_600_000;

/** View-model gọn cho màn hình — chuẩn hoá từ SessionItemDto (word prompt / quiz prompt). */
export interface QuizItem {
  id: string;
  ordinal: number;
  kind: string;
  promptText: string;
  options: { text: string; index: number }[];
  left: { text: string; index: number }[];
  right: { text: string; index: number }[];
  /** M11.1: câu ngữ cảnh kèm vị trí từ khoá (v2: `target`, cũ: phẳng `start/end`) */
  context: QuizContextDto | null;
  answered: boolean;
  correctAnswer: string;
}

/** Nội dung trả lời một câu — khớp các trường của `AnswerSessionDto`. */
export interface QuestionPayload {
  option_index?: number;
  answer_text?: string;
  pairs?: { left_index: number; right_index: number }[];
}

export function toQuizItem(item: SessionItemDto): QuizItem {
  const prompt = item.prompt;
  // Word prompt có `question`, quiz prompt có `text` — phân biệt bằng `in`
  const wordPrompt = "question" in prompt ? prompt : null;
  const quizPrompt = wordPrompt ? null : (prompt as SessionQuizPromptDto);
  const options = (wordPrompt ? wordPrompt.options : quizPrompt?.options) ?? [];
  // Ghép cặp: BE cũ trả `left/right`, v2 có thể chỉ trả `options[].side`
  const quizOptions = quizPrompt?.options ?? [];
  const left = quizPrompt?.left ?? quizOptions.filter(option => option.side === "left");
  const right = quizPrompt?.right ?? quizOptions.filter(option => option.side === "right");
  const answer = item.correct_answer;

  return {
    id: item.id,
    ordinal: item.ordinal,
    kind: wordPrompt ? wordPrompt.kind : (quizPrompt?.kind ?? "multiple_choice"),
    promptText: wordPrompt ? wordPrompt.question.text : (quizPrompt?.text ?? ""),
    options,
    left,
    right,
    context: quizPrompt?.context ?? null,
    answered: Boolean(item.answered_at),
    correctAnswer: answer?.text ?? answer?.accepted?.join(" / ") ?? "",
  };
}
