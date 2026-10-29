// 일정 정렬 기준 — 답변 목록과 이번 주 요약이 같은 순서를 쓰도록 한곳에 둔다
import type { ScheduleItem } from "./types";

const HH_MM = /^\d{2}:\d{2}$/;

/** 날짜순, 같은 날은 시간순. 시간이 비었거나 알아볼 수 없으면 그날의 맨 뒤 */
export function compareItems(a: ScheduleItem, b: ScheduleItem): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  const ta = HH_MM.test(a.time) ? a.time : "99:99";
  const tb = HH_MM.test(b.time) ? b.time : "99:99";
  if (ta !== tb) return ta < tb ? -1 : 1;
  return a.row - b.row;
}
