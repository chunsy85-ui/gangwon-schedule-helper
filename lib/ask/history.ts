// 앞 대화(history) 정리 — AI에 보내는 양을 제한한다 (DESIGN 3.3)
import {
  MAX_HISTORY,
  MAX_HISTORY_ANSWER_LENGTH,
  MAX_QUESTION_LENGTH,
  type AskTurn,
} from "./types";

/**
 * 요청에서 받은 history를 안전한 모양으로 정리한다.
 * 모양이 틀린 항목은 버리고, 최근 MAX_HISTORY개만 남기고, 항목마다 글자 수를 잘라 쓴다.
 */
export function cleanHistory(history: unknown): AskTurn[] {
  if (!Array.isArray(history)) return [];

  return history
    .filter(
      (turn): turn is AskTurn =>
        typeof turn?.question === "string" && typeof turn?.answer === "string",
    )
    .slice(-MAX_HISTORY)
    .map((turn) => ({
      question: turn.question.slice(0, MAX_QUESTION_LENGTH),
      answer: turn.answer.slice(0, MAX_HISTORY_ANSWER_LENGTH),
    }));
}
