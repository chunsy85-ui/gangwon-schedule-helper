// 이번 주 일정 요약 (PLAN 21번, nice 기능) — AI 없이 코드만으로 만든다
import { addDays, isInRange, weekdayOf, type DateRange } from "../date";
import { compareItems } from "./sort";
import type { ScheduleItem } from "./types";

export type WeekDay = {
  /** YYYY-MM-DD */
  date: string;
  /** 월, 화 … */
  weekday: string;
  /** 그날의 일정 (시간순) */
  items: ScheduleItem[];
};

/** 한 주(월~일) 7일을 만들고, 날짜마다 그날의 일정을 시간순으로 담는다. 일정이 없는 날도 포함한다. */
export function buildWeekSummary(items: ScheduleItem[], week: DateRange): WeekDay[] {
  const inWeek = items.filter((item) => isInRange(item.date, week)).sort(compareItems);
  return Array.from({ length: 7 }, (_, n) => {
    const date = addDays(week.start, n);
    return {
      date,
      weekday: weekdayOf(date),
      items: inWeek.filter((item) => item.date === date),
    };
  });
}

/** 2026-10-26 → 10월 26일 */
export function formatMonthDay(date: string): string {
  const [, month, day] = date.split("-").map(Number);
  return `${month}월 ${day}일`;
}
