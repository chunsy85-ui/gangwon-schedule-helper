// 질문 답변 API — POST /api/ask (DESIGN 3.2, 3.3)
import { answerQuestion } from "@/lib/ask/answer";
import {
  MAX_HISTORY,
  MAX_QUESTION_LENGTH,
  type AskRequest,
  type AskTurn,
} from "@/lib/ask/types";
import { loadSchedule } from "@/lib/schedule/load";

export async function POST(request: Request) {
  const body = await parseBody(request);
  if ("error" in body) {
    return Response.json({ error: body.error }, { status: 400 });
  }

  const schedule = await loadSchedule();
  return Response.json(await answerQuestion(body, schedule));
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
