// 질문 답변 API — POST /api/ask (DESIGN 3.2, 3.3)
// 지금은 AI 없이 고정 답을 돌려준다. AI 연결은 PLAN 12~17번에서 한다.
import { loadSchedule } from "@/lib/schedule/load";
import {
  MAX_HISTORY,
  MAX_QUESTION_LENGTH,
  type AskRequest,
  type AskResponse,
  type AskTurn,
} from "@/lib/ask/types";

export async function POST(request: Request) {
  const body = await parseBody(request);
  if ("error" in body) {
    return Response.json({ error: body.error }, { status: 400 });
  }

  // 임시: 일정표 앞쪽 3건을 고정 답으로 보여준다
  const schedule = await loadSchedule();
  const items =
    schedule.status === "ok"
      ? schedule.items
          .slice(0, 3)
          .map(({ date, title, time, target, place }) => ({ date, title, time, target, place }))
      : [];
  const response: AskResponse = {
    answer: `(고정 답변) "${body.question}" 질문을 받았습니다. 아직 AI가 연결되지 않았습니다.`,
    items,
    total: items.length,
  };
  return Response.json(response);
}

/** 요청 본문 검사: 질문이 비었거나 너무 길면 거절, history는 최근 것만 남긴다 */
async function parseBody(
  request: Request,
): Promise<Required<AskRequest> | { error: string }> {
  let data: unknown;
  try {
    data = await request.json();
  } catch {
    return { error: "요청 형식이 올바르지 않습니다." };
  }

  const { question, history } = (data ?? {}) as Partial<AskRequest>;
  if (typeof question !== "string" || !question.trim()) {
    return { error: "질문을 입력해 주세요." };
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    return { error: `질문은 ${MAX_QUESTION_LENGTH}자까지 입력할 수 있습니다.` };
  }

  const turns = Array.isArray(history)
    ? history.filter(
        (turn): turn is AskTurn =>
          typeof turn?.question === "string" && typeof turn?.answer === "string",
      )
    : [];

  return { question: question.trim(), history: turns.slice(-MAX_HISTORY) };
}
