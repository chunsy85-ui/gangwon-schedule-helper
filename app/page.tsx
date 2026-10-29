// 메인 화면 (DESIGN 2장) — ① 머리글, ② 일정표 상태, 이번 주 요약, ③④ 대화와 질문 입력
// 기본 화면에는 이번 주 일정만 보이고, 전체 일정은 질문했을 때만 보여준다.
import { Suspense } from "react";
import { loadSchedule } from "@/lib/schedule/load";
import Chat from "./components/Chat";
import ScheduleStatus from "./components/ScheduleStatus";
import WeekSummary, { WeekSummaryFallback } from "./components/WeekSummary";

export default async function Home() {
  const schedule = await loadSchedule();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 pt-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          강원지역본부 일정 도우미
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          ⓘ 일정표와 질문 내용이 외부 AI 서비스로 전송됩니다(OpenAI). 이름·연락처 등
          개인정보는 입력하지 마세요.
        </p>
      </header>
      <ScheduleStatus result={schedule} />
      <Suspense fallback={<WeekSummaryFallback />}>
        <WeekSummary schedule={schedule} />
      </Suspense>
      <Chat />
    </main>
  );
}
