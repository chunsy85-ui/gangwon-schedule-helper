// 전체 일정 보기 — 등록된 일정을 10건 제한 없이 모두 보여준다. 접어 둔 채로 시작하고 원할 때 펼친다.
import { weekdayOf } from "@/lib/date";
import { groupByMonth } from "@/lib/schedule/all";
import type { ScheduleLoadResult } from "@/lib/schedule/types";
import { formatMonthDay } from "@/lib/schedule/week";

export default function AllSchedule({ schedule }: { schedule: ScheduleLoadResult }) {
  // 일정표를 쓸 수 없으면 일정표 상태 상자가 이유를 알려주므로 보이지 않는다
  if (schedule.status !== "ok") return null;

  const months = groupByMonth(schedule.items);

  return (
    <details className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <summary className="cursor-pointer select-none px-4 py-3 font-medium">
        전체 일정 보기{" "}
        <span className="text-sm font-normal text-zinc-500">
          등록된 일정 총 {schedule.items.length}건
        </span>
      </summary>
      <div className="max-h-[28rem] overflow-y-auto border-t border-zinc-100 text-sm dark:border-zinc-900">
        {months.map((group) => (
          <section key={group.month} aria-label={group.label}>
            <h2 className="sticky top-0 bg-zinc-50 px-4 py-1.5 font-medium dark:bg-zinc-900">
              {group.label}{" "}
              <span className="font-normal text-zinc-500">{group.items.length}건</span>
            </h2>
            <ol className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-900">
              {group.items.map((item) => (
                <li
                  key={item.row}
                  className="flex flex-col gap-1 px-4 py-2 sm:flex-row sm:gap-4"
                >
                  <span className="w-36 shrink-0 whitespace-nowrap font-medium">
                    {formatMonthDay(item.date)}({weekdayOf(item.date)})
                  </span>
                  <span className="flex flex-1 flex-wrap gap-x-2">
                    <span className="font-medium tabular-nums">{item.time}</span>
                    <span className="font-medium">{item.title}</span>
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {item.target} · {item.place}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </details>
  );
}
