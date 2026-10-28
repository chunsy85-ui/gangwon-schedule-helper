// 화면 ② 일정표 상태 상자 (DESIGN 2장)
import type { ReactNode } from "react";
import { NO_SCHEDULE_TEXT } from "@/lib/messages";
import type { ScheduleLoadResult } from "@/lib/schedule/types";

export default function ScheduleStatus({
  result,
}: {
  result: ScheduleLoadResult;
}) {
  if (result.status === "missing-columns") {
    return (
      <StatusBox tone="error">
        <p>❌ 일정표에 필수 열이 없습니다: {result.missingColumns.join(", ")}</p>
        <p className="text-sm opacity-80">
          엑셀 1행에 &lsquo;날짜&rsquo;, &lsquo;일정명&rsquo; 열이 있어야 합니다.
        </p>
      </StatusBox>
    );
  }

  const notes = (
    <>
      {result.excludedRows.length > 0 && (
        <p>
          ⚠ {result.excludedRows.length}행 제외됨:{" "}
          {result.excludedRows.map((row) => `${row}행`).join(", ")} (엑셀 화면의
          행 번호)
        </p>
      )}
      {result.truncated && (
        <p>⚠ 500행을 넘어 앞의 500행만 읽었습니다.</p>
      )}
    </>
  );

  if (result.status === "none") {
    return (
      <StatusBox tone="error">
        <p>❌ {NO_SCHEDULE_TEXT}</p>
        {result.reason === "unreadable" && (
          <p className="text-sm opacity-80">일정표 파일을 열 수 없습니다.</p>
        )}
        {notes}
      </StatusBox>
    );
  }

  const hasWarning = result.excludedRows.length > 0 || result.truncated;
  return (
    <StatusBox tone={hasWarning ? "warning" : "ok"}>
      <p>✅ 일정표 {result.items.length}건을 불러왔습니다.</p>
      {notes}
    </StatusBox>
  );
}

const TONE_CLASS = {
  ok: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100",
  warning:
    "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100",
  error:
    "border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100",
};

function StatusBox({
  tone,
  children,
}: {
  tone: keyof typeof TONE_CLASS;
  children: ReactNode;
}) {
  return (
    <section
      aria-label="일정표 상태"
      className={`flex flex-col gap-1 rounded-lg border px-4 py-3 ${TONE_CLASS[tone]}`}
    >
      {children}
    </section>
  );
}
