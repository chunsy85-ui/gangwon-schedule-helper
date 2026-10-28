// 날짜 계산 (DESIGN 3.2) — 모든 날짜는 한국 시간 기준 YYYY-MM-DD 글자로 다룬다
// Vercel 서버는 한국 시간이 아니므로, 서버 시계 대신 Asia/Seoul로 바꿔 계산한다.

export type DateRange = { start: string; end: string };

export type Periods = {
  today: DateRange;
  /** 오늘이 속한 월요일 ~ 일요일 */
  thisWeek: DateRange;
  /** 그다음 월요일 ~ 일요일 */
  nextWeek: DateRange;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/**
 * 오늘 날짜 (한국 시간).
 * 테스트할 때는 TEST_TODAY=2026-10-28처럼 오늘을 고정할 수 있다. (DESIGN 4.2)
 */
export function getToday(now: Date = new Date()): string {
  const fixed = process.env.TEST_TODAY;
  if (fixed && ISO_DATE.test(fixed)) return fixed;

  // en-CA 형식은 YYYY-MM-DD로 나온다
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** 오늘·이번 주·다음 주 범위 */
export function getPeriods(today: string): Periods {
  // 월요일=0 … 일요일=6
  const offsetFromMonday = (toUtcDate(today).getUTCDay() + 6) % 7;
  const monday = addDays(today, -offsetFromMonday);
  return {
    today: { start: today, end: today },
    thisWeek: { start: monday, end: addDays(monday, 6) },
    nextWeek: { start: addDays(monday, 7), end: addDays(monday, 13) },
  };
}

/** 날짜에 며칠을 더한다 (빼려면 음수) */
export function addDays(date: string, days: number): string {
  const d = toUtcDate(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 요일 한 글자 (월, 화 …) */
export function weekdayOf(date: string): string {
  return WEEKDAYS[toUtcDate(date).getUTCDay()];
}

/** 날짜가 범위 안(양 끝 포함)에 있는지. YYYY-MM-DD 글자는 그대로 크기 비교가 된다. */
export function isInRange(date: string, range: DateRange): boolean {
  return date >= range.start && date <= range.end;
}

function toUtcDate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}
