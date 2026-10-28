// AI에게 줄 지시문과 입력 만들기 (DESIGN 3.2의 4번)
// AI는 문장을 쓰지 않고, 종류·기간·일정 번호만 정해진 모양으로 돌려준다.
import { z } from "zod";
import { weekdayOf, type Periods } from "../date";
import type { ScheduleItem } from "../schedule/types";
import type { AskTurn } from "./types";

/** AI 응답 모양. 모든 칸을 항상 채우게 하고, 해당 없으면 null을 넣게 한다. */
export const SelectionSchema = z.object({
  kind: z.enum(["schedule", "not_found", "off_topic"]),
  period: z.enum(["today", "this_week", "next_week", "custom", "none"]),
  /** period가 custom일 때만 YYYY-MM-DD, 아니면 null */
  start: z.string().nullable(),
  end: z.string().nullable(),
  /** 고른 일정의 번호 (일정표 목록의 [번호]) */
  ids: z.array(z.number().int()),
});

export type Selection = z.infer<typeof SelectionSchema>;

export function buildInstructions(
  items: ScheduleItem[],
  today: string,
  periods: Periods,
): string {
  const range = (r: { start: string; end: string }) =>
    `${r.start}(${weekdayOf(r.start)}) ~ ${r.end}(${weekdayOf(r.end)})`;
  const lines = items.map(
    (item) =>
      `[${item.row}] ${item.date}(${weekdayOf(item.date)}) | ${item.title} | 시간: ${item.time} | 대상자: ${item.target} | 장소: ${item.place}`,
  );

  return `너는 강원지역본부 일정표에서 팀원의 질문에 맞는 일정을 골라 주는 역할이다.
답변 문장은 쓰지 않는다. 정해진 모양(kind, period, start, end, ids)으로만 답한다.

## 날짜 기준 (한국 시간)
- 오늘: ${today}(${weekdayOf(today)})
- 이번 주(this_week): ${range(periods.thisWeek)}
- 다음 주(next_week): ${range(periods.nextWeek)}
- 한 주는 월요일부터 일요일까지다.

## 고르는 규칙
1. kind
   - 일정과 상관없는 질문(잡담, 메뉴 추천, 사용법 질문 등) → "off_topic", ids는 []
   - 일정 질문이지만 일정표에 맞는 일정이 하나도 없음 → "not_found", ids는 []
   - 맞는 일정이 있음 → "schedule"
2. period: 질문이 가리키는 기간
   - 오늘 → "today", 이번 주 → "this_week", 다음 주 → "next_week"
   - 그 밖의 특정 날짜·요일·달·주(예: 내일, 11월 12일, 다음 주 수요일, 11월, 그 다음 주) → "custom"이고 start·end에 YYYY-MM-DD를 넣는다
   - 기간이 없는 질문(예: "청렴 교육 언제야?", "원주 사업소 관련 일정") → "none"
   - custom이 아니면 start·end는 null
3. ids: 질문의 조건(기간, 대상자, 일정 이름, 장소 등)에 맞는 일정의 [번호]를 **빠짐없이 모두** 넣는다. 개수 제한은 없다.
   - "본부장 일정"처럼 대상자를 말하면 대상자 칸이 그 값인 일정만 고른다.
   - 일정표에 없는 일정을 만들어 내지 않는다. 목록에 있는 [번호]만 쓴다.
4. "그중", "그 다음 주는?"처럼 앞 대화에 이어지는 질문은 앞 대화의 질문과 답을 보고 조건을 이어받는다.

## 일정표 ([번호] 날짜(요일) | 일정명 | 시간 | 대상자 | 장소)
${lines.join("\n")}`;
}

/** 최근 대화와 이번 질문을 AI 입력 메시지로 */
export function buildInput(question: string, history: AskTurn[]) {
  return [
    ...history.flatMap((turn) => [
      { role: "user" as const, content: turn.question },
      { role: "assistant" as const, content: turn.answer },
    ]),
    { role: "user" as const, content: question },
  ];
}
