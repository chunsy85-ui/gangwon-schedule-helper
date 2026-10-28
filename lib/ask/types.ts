// 질문 API(POST /api/ask)가 주고받는 모양 (DESIGN 3.3)
import type { ScheduleItem } from "../schedule/types";

/** 질문을 너무 길게 보내지 않도록 */
export const MAX_QUESTION_LENGTH = 500;

/** 이어지는 질문을 위해 함께 보내는 최근 대화 수 */
export const MAX_HISTORY = 3;

export type AskTurn = { question: string; answer: string };

export type AskRequest = {
  question: string;
  /** 최근 대화 (오래된 것부터, 최대 MAX_HISTORY개) */
  history?: AskTurn[];
};

/** 답변에 보여줄 일정 한 건. 빈 칸은 서버가 "미기재"로 채워 보낸다. */
export type AnswerItem = Omit<ScheduleItem, "row">;

export type AskResponse = {
  answer: string;
  /** 최대 10건 */
  items: AnswerItem[];
  /** 조건에 맞는 전체 건수 */
  total: number;
};
