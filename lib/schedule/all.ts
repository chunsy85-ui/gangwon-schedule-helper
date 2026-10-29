// 등록된 전체 일정 보기 (10건 제한 없음) — AI 없이 일정표를 그대로 날짜순으로 정리한다
import { compareItems } from "./sort";
import type { ScheduleItem } from "./types";

export type MonthGroup = {
  /** YYYY-MM */
  month: string;
  /** 2026년 10월 */
  label: string;
  /** 그 달의 일정 (날짜·시간순) */
  items: ScheduleItem[];
};

/** 모든 일정을 날짜·시간순으로 정렬해 달별로 묶는다. 일정이 없는 달은 만들지 않는다. */
export function groupByMonth(items: ScheduleItem[]): MonthGroup[] {
  const groups = new Map<string, ScheduleItem[]>();
  for (const item of [...items].sort(compareItems)) {
    const month = item.date.slice(0, 7);
    const list = groups.get(month);
    if (list) list.push(item);
    else groups.set(month, [item]);
  }

  return [...groups].map(([month, list]) => ({
    month,
    label: `${month.slice(0, 4)}년 ${Number(month.slice(5, 7))}월`,
    items: list,
  }));
}
