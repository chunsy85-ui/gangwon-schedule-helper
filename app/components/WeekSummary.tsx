// 이번 주 일정 한 장 요약 (PLAN 21번) — 일정표를 보고 코드가 만들며 AI를 쓰지 않는다
import { connection } from "next/server";
import { getPeriods, getToday } from "@/lib/date";
import type { ScheduleLoadResult } from "@/lib/schedule/types";
import { buildWeekSummary, formatMonthDay } from "@/lib/schedule/week";

export default async function WeekSummary({
  schedule,
}: {
  schedule: ScheduleLoadResult;
}) {
  // 일정표를 쓸 수 없으면 일정표 상태 상자가 이유를 알려주므로 요약은 보이지 않는다
  if (schedule.status !== "ok") return null;

  // 오늘 날짜는 요청이 올 때마다 새로 계산한다 (DESIGN 3.3). 미리 만들어 둔 화면에 굳지 않게 한다.
  await connection();
  const today = getToday();
  const week = getPeriods(today).thisWeek;
  const days = buildWeekSummary(schedule.items, week);
  const total = days.reduce((sum, day) => sum + day.items.length, 0);

  return (
    <details
      open
      className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
    >
      <summary className="cursor-pointer select-none px-4 py-3 font-medium">
        이번 주 일정{" "}
        <span className="text-sm font-normal text-zinc-500">
          {formatMonthDay(week.start)} ~ {formatMonthDay(week.end)} · 총 {total}건
        </span>
      </summary>
      <ol className="flex flex-col divide-y divide-zinc-100 border-t border-zinc-100 text-sm dark:divide-zinc-900 dark:border-zinc-900">
        {days.map((day) => (
          <li key={day.date} className="flex flex-col gap-1 px-4 py-2 sm:flex-row sm:gap-4">
            <div className="flex w-36 shrink-0 items-center gap-1 whitespace-nowrap font-medium">
              <span className={day.items.length === 0 ? "text-zinc-400" : undefined}>
                {formatMonthDay(day.date)}({day.weekday})
              </span>
              {day.date === today && (
                <span className="rounded bg-zinc-900 px-1.5 py-0.5 text-xs text-white dark:bg-zinc-100 dark:text-zinc-900">
                  오늘
                </span>
              )}
            </div>
            {day.items.length === 0 ? (
              <span className="text-zinc-400">일정 없음</span>
            ) : (
              <ul className="flex flex-1 flex-col gap-1">
                {day.items.map((item) => (
                  <li key={item.row} className="flex flex-wrap gap-x-2">
                    <span className="font-medium tabular-nums">{item.time}</span>
                    <span className="font-medium">{item.title}</span>
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {item.target} · {item.place}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </details>
  );
}

/** 요약을 만드는 동안 보여주는 자리 */
export function WeekSummaryFallback() {
  return (
    <div className="rounded-lg border border-zinc-200 px-4 py-3 text-sm text-zinc-500 dark:border-zinc-800">
      이번 주 일정을 불러오는 중…
    </div>
  );
}
