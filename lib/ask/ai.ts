// OpenAI 연결 (DESIGN 4.2) — 서버에서만 실행. API 키는 브라우저로 보내지 않는다. (CLAUDE.md 6장)
import "server-only";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { SelectionSchema, type Selection, type buildInput } from "./prompt";

/**
 * OPENAI_MODEL이 비어 있을 때 쓰는 모델. 18번 테스트 결과를 보고 바꿀 수 있다.
 * 2026-10-28 확인: 짧은 질문 응답 약 1.2초 (gpt-4.1-mini와 비슷한 속도, 더 최신)
 */
export const DEFAULT_MODEL = "gpt-5.4-mini";

/** 성공 기준 30초 안에 끝내기 위해, AI가 25초 안에 답하지 않으면 포기한다 (DESIGN 3.2) */
export const AI_TIMEOUT_MS = 25_000;

let client: OpenAI | undefined;

/** OpenAI 클라이언트. 키는 .env(배포 시 Vercel 환경변수)의 OPENAI_API_KEY에서 읽는다. */
export function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY가 설정되지 않았습니다.");
  // 다시 시도하면 30초를 넘길 수 있어 재시도는 하지 않는다
  client ??= new OpenAI({ apiKey, timeout: AI_TIMEOUT_MS, maxRetries: 0 });
  return client;
}

export function getModel(): string {
  return process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;
}

/**
 * AI에게 질문에 맞는 일정을 고르게 한다. (DESIGN 3.2의 4번)
 * 응답이 정해진 모양이 아니면 오류를 낸다. 실패·시간 초과도 오류로 올라온다.
 */
export async function selectSchedule(
  instructions: string,
  input: ReturnType<typeof buildInput>,
): Promise<Selection> {
  const model = getModel();
  const response = await getOpenAI().responses.parse({
    model,
    instructions,
    input,
    text: { format: zodTextFormat(SelectionSchema, "schedule_selection") },
    // gpt-5 계열은 생각하는 단계가 있어, 속도를 위해 짧게 생각하게 한다
    ...(model.startsWith("gpt-5") ? { reasoning: { effort: "low" as const } } : {}),
  });
  if (!response.output_parsed) throw new Error("AI 응답을 읽을 수 없습니다.");
  return response.output_parsed;
}
