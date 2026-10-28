// 질문 하나에 대한 최종 답 만들기 (DESIGN 3.2)
import { NO_SCHEDULE_TEXT } from "../messages";
import type { ScheduleLoadResult } from "../schedule/types";
import type { AskRequest, AskResponse } from "./types";

export async function answerQuestion(
  request: Required<AskRequest>,
  schedule: ScheduleLoadResult,
): Promise<AskResponse> {
  // 일정표가 없거나 쓸 수 없으면 AI를 부르지 않고 바로 안내한다 (PRD must 2)
  if (schedule.status !== "ok") {
    return { answer: NO_SCHEDULE_TEXT, items: [], total: 0 };
  }

  // 임시: 일정표 앞쪽 3건을 고정 답으로 보여준다. AI 연결은 PLAN 14~17번에서 한다.
  const items = schedule.items
    .slice(0, 3)
    .map(({ date, title, time, target, place }) => ({ date, title, time, target, place }));
  return {
    answer: `(고정 답변) "${request.question}" 질문을 받았습니다. 아직 AI가 연결되지 않았습니다.`,
    items,
    total: items.length,
  };
}
