// OpenAI 연결 (DESIGN 4.2) — 서버에서만 실행. API 키는 브라우저로 보내지 않는다. (CLAUDE.md 6장)
import "server-only";
import OpenAI from "openai";

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
