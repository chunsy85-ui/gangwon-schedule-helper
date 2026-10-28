// 질문 하나에 대한 최종 답 만들기 (DESIGN 3.2)
import { getPeriods, getToday } from "../date";
import { NO_SCHEDULE_TEXT, OFF_TOPIC_TEXT, RETRY_TEXT } from "../messages";
import type { ScheduleLoadResult } from "../schedule/types";
import { selectSchedule } from "./ai";
import { buildInput, buildInstructions } from "./prompt";
import type { AskRequest, AskResponse } from "./types";

export async function answerQuestion(
  request: Required<AskRequest>,
  schedule: ScheduleLoadResult,
): Promise<AskResponse> {
  // 일정표가 없거나 쓸 수 없으면 AI를 부르지 않고 바로 안내한다 (PRD must 2)
  if (schedule.status !== "ok") {
    return { answer: NO_SCHEDULE_TEXT, items: [], total: 0 };
  }

  // 오늘 날짜는 질문이 올 때마다 새로 계산한다 (DESIGN 3.3)
  const today = getToday();
  const instructions = buildInstructions(schedule.items, today, getPeriods(today));

  let selection;
  try {
    selection = await selectSchedule(
      instructions,
      buildInput(request.question, request.history),
    );
  } catch (error) {
    console.error("AI 호출 실패:", error);
    return { answer: RETRY_TEXT, items: [], total: 0 };
  }

  if (selection.kind === "off_topic") {
    return { answer: OFF_TOPIC_TEXT, items: [], total: 0 };
  }

  // 임시: AI가 고른 일정을 그대로 보여준다. 기간 검사·정렬·10건 제한·답변 문장은 PLAN 16번에서 한다.
  const items = schedule.items
    .filter((item) => selection.ids.includes(item.row))
    .map(({ date, title, time, target, place }) => ({ date, title, time, target, place }));
  return {
    answer: `(임시) AI가 고른 일정 ${items.length}건입니다. [${selection.kind} / ${selection.period}]`,
    items,
    total: items.length,
  };
}
