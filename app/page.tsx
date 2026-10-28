// 메인 화면 (DESIGN 2장) — ① 머리글, ② 일정표 상태
import { loadSchedule } from "@/lib/schedule/load";
import ScheduleStatus from "./components/ScheduleStatus";

export default async function Home() {
  const schedule = await loadSchedule();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          강원지역본부 일정 도우미
        </h1>
      </header>
      <ScheduleStatus result={schedule} />
    </main>
  );
}
