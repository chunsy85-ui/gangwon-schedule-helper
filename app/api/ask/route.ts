// 질문 답변 API — POST /api/ask (DESIGN 3.2, 3.3)
import { answerQuestion } from "@/lib/ask/answer";
import { cleanHistory } from "@/lib/ask/history";
import { checkRateLimit, clientIpOf } from "@/lib/ask/rate-limit";
import {
  MAX_BODY_LENGTH,
  MAX_QUESTION_LENGTH,
  type AskRequest,
} from "@/lib/ask/types";
import { loadSchedule } from "@/lib/schedule/load";

export async function POST(request: Request) {
  // 요청 횟수 제한: AI를 부르기 전에 막아, 계속 질문을 보내 요금이 쌓이는 것을 줄인다
  const limit = checkRateLimit(clientIpOf(request.headers));
  if (!limit.ok) {
    return Response.json(
      { error: "질문이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const body = await parseBody(request);
  if ("error" in body) {
    return Response.json({ error: body.error }, { status: body.status });
  }

  const schedule = await loadSchedule();
  return Response.json(await answerQuestion(body, schedule));
}

type ParseFailure = { error: string; status: 400 | 413 };

/**
 * 요청 본문 검사: 너무 크거나, 질문이 비었거나 너무 길면 거절한다.
 * 앞 대화(history)는 최근 것만 남기고, 항목마다 글자 수를 잘라 AI에 보내는 양을 제한한다.
 */
async function parseBody(
  request: Request,
): Promise<Required<AskRequest> | ParseFailure> {
  const text = await request.text();
  if (text.length > MAX_BODY_LENGTH) {
    return { error: "요청이 너무 큽니다.", status: 413 };
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { error: "요청 형식이 올바르지 않습니다.", status: 400 };
  }

  const { question, history } = (data ?? {}) as Partial<AskRequest>;
  if (typeof question !== "string" || !question.trim()) {
    return { error: "질문을 입력해 주세요.", status: 400 };
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    return {
      error: `질문은 ${MAX_QUESTION_LENGTH}자까지 입력할 수 있습니다.`,
      status: 400,
    };
  }

  return { question: question.trim(), history: cleanHistory(history) };
}
