// AI가 고른 결과로 최종 답 만들기 (DESIGN 3.2의 5·6번)
// 답변 문장과 일정 글자는 모두 코드가 만든다. AI 응답은 믿기 전에 검사한다.
import { isInRange, type DateRange, type Periods } from "../date";
import { NOT_FOUND_TEXT, OFF_TOPIC_TEXT } from "../messages";
import type { ScheduleItem } from "../schedule/types";
import type { Selection } from "./prompt";
import type { AskResponse } from "./types";

/** 한 번에 보여주는 최대 건수 (PRD must 2) */
export const MAX_ITEMS = 10;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const HH_MM = /^\d{2}:\d{2}$/;

export function buildAnswer(
  selection: Selection,
  schedule: ScheduleItem[],
  periods: Periods,
): AskResponse {
  if (selection.kind === "off_topic") {
    return { answer: OFF_TOPIC_TEXT, items: [], total: 0 };
  }

  // 없는 번호, 기간 밖 날짜의 번호는 버린다
  const range = resolveRange(selection, periods);
  const ids = new Set(selection.ids);
  const matched = schedule
    .filter((item) => ids.has(item.row))
    .filter((item) => !range || isInRange(item.date, range))
    .sort(compareItems);

  if (selection.kind === "not_found" || matched.length === 0) {
    return { answer: NOT_FOUND_TEXT, items: [], total: 0 };
  }

  const total = matched.length;
  const sentences = [`${periodLabel(selection, range)} 일정은 총 ${total}건입니다.`];
  if (total > MAX_ITEMS) {
    sentences.push(`총 ${total}건 중 ${MAX_ITEMS}건을 보여드립니다.`);
  }

  return {
    answer: sentences.join(" "),
    items: matched
      .slice(0, MAX_ITEMS)
      .map(({ date, title, time, target, place }) => ({ date, title, time, target, place })),
    total,
  };
}

/** AI가 말한 기간 → 실제 날짜 범위. 기간이 없거나 잘못되면 null(거르지 않음) */
function resolveRange(selection: Selection, periods: Periods): DateRange | null {
  switch (selection.period) {
    case "today":
      return periods.today;
    case "this_week":
      return periods.thisWeek;
    case "next_week":
      return periods.nextWeek;
    case "custom": {
      const { start, end } = selection;
      if (!start || !end || !ISO_DATE.test(start) || !ISO_DATE.test(end) || start > end) {
        return null;
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

/** 날짜순, 같은 날은 시간순. 시간이 비었거나 알아볼 수 없으면 그날의 맨 뒤 */
function compareItems(a: ScheduleItem, b: ScheduleItem): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  const ta = HH_MM.test(a.time) ? a.time : "99:99";
  const tb = HH_MM.test(b.time) ? b.time : "99:99";
  if (ta !== tb) return ta < tb ? -1 : 1;
  return a.row - b.row;
}
