// 질문 API(POST /api/ask)가 주고받는 모양 (DESIGN 3.3)
import type { ScheduleItem } from "../schedule/types";

/** 질문을 너무 길게 보내지 않도록 */
export const MAX_QUESTION_LENGTH = 500;

/** 이어지는 질문을 위해 함께 보내는 최근 대화 수 */
export const MAX_HISTORY = 3;

/** 앞 대화의 답변 글자 수 상한. 일정 10건 목록까지 넉넉히 들어가는 길이이며, 넘는 부분은 잘라서 쓴다. */
export const MAX_HISTORY_ANSWER_LENGTH = 2000;

/** 요청 본문 전체의 글자 수 상한. 질문 1개와 앞 대화 3개가 넉넉히 들어가는 크기이며, 넘으면 거절한다. */
export const MAX_BODY_LENGTH = 20_000;

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
  /** 기본으로 보여주는 일정. 최대 10건 (PRD must 2) */
  items: AnswerItem[];
  /** 조건에 맞는 전체 건수 */
  total: number;
  /**
   * 10건을 넘어 기본으로는 보여주지 않은 나머지 일정. 10건 이하면 없다.
   * 사용자가 "나머지 더 보기"를 눌렀을 때만 화면에 보인다.
   */
  moreItems?: AnswerItem[];
  /** 나머지까지 모두 보여줄 때 쓰는 답변 문장. moreItems가 있을 때만 있다. */
  expandedAnswer?: string;
};
