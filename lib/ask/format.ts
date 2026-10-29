// AI가 고른 결과로 최종 답 만들기 (DESIGN 3.2의 5·6번)
// 답변 문장과 일정 글자는 모두 코드가 만든다. AI 응답은 믿기 전에 검사한다.
import { isInRange, isValidDate, type DateRange, type Periods } from "../date";
import { NOT_FOUND_TEXT, OFF_TOPIC_TEXT, RETRY_TEXT } from "../messages";
import { compareItems } from "../schedule/sort";
import type { ScheduleItem } from "../schedule/types";
import type { Selection } from "./prompt";
import type { AskResponse } from "./types";

/** 한 번에 보여주는 최대 건수 (PRD must 2) */
export const MAX_ITEMS = 10;

export function buildAnswer(
  selection: Selection,
  schedule: ScheduleItem[],
  periods: Periods,
): AskResponse {
  if (selection.kind === "off_topic") {
    return { answer: OFF_TOPIC_TEXT, items: [], total: 0 };
  }
  if (selection.kind === "not_found") {
    return { answer: NOT_FOUND_TEXT, items: [], total: 0 };
  }

  // AI가 기간을 말했는데 알아볼 수 없으면 기간 밖 일정이 섞일 수 있으므로 AI 실패와 같게 처리한다 (DESIGN 3.2 5번)
  const range = resolveRange(selection, periods);
  if (range === "invalid") {
    return { answer: RETRY_TEXT, items: [], total: 0 };
  }

  // 없는 번호, 기간 밖 날짜의 번호는 버린다
  const ids = new Set(selection.ids);
  const matched = schedule
    .filter((item) => ids.has(item.row))
    .filter((item) => !range || isInRange(item.date, range))
    .sort(compareItems);

  if (matched.length === 0) {
    return { answer: NOT_FOUND_TEXT, items: [], total: 0 };
  }

  const total = matched.length;
  const summary = `${periodLabel(selection, range)} 일정은 총 ${total}건입니다.`;
  const sentences = [summary];
  if (total > MAX_ITEMS) {
    sentences.push(`총 ${total}건 중 ${MAX_ITEMS}건을 보여드립니다.`);
  }

  const all = matched.map(({ date, title, time, target, place }) => ({
    date,
    title,
    time,
    target,
    place,
  }));
  const rest = all.slice(MAX_ITEMS);

  return {
    answer: sentences.join(" "),
    // 기본은 최대 10건만 보여준다. 나머지는 사용자가 원할 때만 보이도록 따로 담아 보낸다.
    items: all.slice(0, MAX_ITEMS),
    total,
    ...(rest.length > 0
      ? { moreItems: rest, expandedAnswer: `${summary} 전체 ${total}건을 모두 보여드립니다.` }
      : {}),
  };
}

/**
 * AI가 말한 기간 → 실제 날짜 범위.
 * 기간을 말하지 않았으면 null(거르지 않음), 지정 기간인데 날짜를 알아볼 수 없으면 "invalid".
 */
function resolveRange(
  selection: Selection,
  periods: Periods,
): DateRange | null | "invalid" {
  switch (selection.period) {
    case "today":
      return periods.today;
    case "this_week":
      return periods.thisWeek;
    case "next_week":
      return periods.nextWeek;
    case "custom": {
      const { start, end } = selection;
      // 날짜 모양과 달력(2026-02-30 같은 날짜), 시작이 끝보다 늦지 않은지 확인한다
      if (!start || !end || !isValidDate(start) || !isValidDate(end) || start > end) {
        return "invalid";
      }
      return { start, end };
    }
    default:
      return null;
  }
}

function periodLabel(selection: Selection, range: DateRange | null): string {
  if (!range) return "질문하신";
  switch (selection.period) {
    case "today":
      return "오늘";
    case "this_week":
      return "이번 주";
    case "next_week":
      return "다음 주";
    default:
      return range.start === range.end ? range.start : `${range.start} ~ ${range.end}`;
  }
}
