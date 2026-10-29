// 테스트 질문 20개 실행 — 정답률(90% 이상)과 응답 시간(30초 이내) 확인 (PLAN 18번, DESIGN 7장)
// 서버를 "오늘" 고정으로 먼저 띄운 뒤 실행한다:
//   npm run build
//   TEST_TODAY=2026-10-28 npx next start -p 3002
//   TEST_URL=http://localhost:3002 npm run test:questions
// 결과는 data/test-results.md에 기록한다.
import { readFileSync, writeFileSync } from "node:fs";

const BASE_URL = process.env.TEST_URL ?? "http://localhost:3000";
const PASS_RATE = 0.9;
const TIME_LIMIT_MS = 30_000;

/** data/test-questions.md → 문항 목록 */
function readQuestions() {
  const blocks = readFileSync("data/test-questions.md", "utf8").split(/^### /m).slice(1);
  return blocks.map((block) => {
    const lines = block.split(/\r?\n/);
    const get = (key) =>
      lines.find((line) => line.startsWith(`- ${key}: `))?.slice(key.length + 4).trim();
    const items = get("정답(일정)");
    return {
      no: Number(lines[0]),
      question: get("질문"),
      previous: get("앞 질문"),
      expectedItems: items ? items.split("; ") : null,
      expectedCount: get("정답 건수") ? Number(get("정답 건수")) : null,
      expectedText: get("정답(문구)") ?? null,
    };
  });
}

// 서버의 요청 횟수 제한(같은 IP에서 1분에 20번)에 걸리지 않도록, 요청을 시작하는 간격을 띄운다.
// 그래서 20문항을 채점하는 데 1분 20초쯤 걸린다. (측정하는 응답 시간에는 이 기다림이 들어가지 않는다)
const MIN_GAP_MS = 3_500;
let lastStart = 0;
async function pace() {
  const wait = lastStart + MIN_GAP_MS - Date.now();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastStart = Date.now();
}

async function ask(question, history = []) {
  await pace();
  const started = Date.now();
  const res = await fetch(`${BASE_URL}/api/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, history }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return { ...(await res.json()), ms: Date.now() - started };
}

/** 화면(Chat.tsx)과 같은 방식으로 앞 대화를 history로 만든다 */
function toTurn(question, reply) {
  const lines = reply.items.map((item) => `- ${item.date} ${item.title}`);
  return { question, answer: [reply.answer, ...lines].join("\n") };
}

/** 채점 (DESIGN 7장 채점 기준). 틀리면 이유를 돌려준다. */
function grade(q, reply) {
  const got = reply.items.map((item) => `${item.date} ${item.title}`);
  if (q.expectedItems) {
    const same =
      got.length === q.expectedItems.length && q.expectedItems.every((e) => got.includes(e));
    if (!same) return `일정이 다름: ${got.join(", ") || "(없음)"}`;
    if (q.expectedCount !== null && reply.total !== q.expectedCount) {
      return `전체 건수가 다름: ${reply.total}`;
    }
    if (q.expectedText && !reply.answer.includes(q.expectedText)) {
      return `문구 없음: "${q.expectedText}"`;
    }
    return null;
  }
  if (reply.answer !== q.expectedText) return `문구가 다름: "${reply.answer}"`;
  return null;
}

const questions = readQuestions();
const rows = [];
for (const q of questions) {
  let reply;
  let reason;
  try {
    const history = q.previous ? [toTurn(q.previous, await ask(q.previous))] : [];
    reply = await ask(q.question, history);
    reason = grade(q, reply);
    if (!reason && reply.ms > TIME_LIMIT_MS) reason = `30초 초과`;
  } catch (error) {
    reason = `요청 실패: ${error.message}`;
  }
  rows.push({ q, reply, reason });
  console.log(
    `${String(q.no).padStart(2)} ${reason ? "X" : "O"} ${String(reply?.ms ?? "-").padStart(6)}ms  ${q.question}${reason ? `  ← ${reason}` : ""}`,
  );
}

const passed = rows.filter((r) => !r.reason).length;
const times = rows.map((r) => r.reply?.ms).filter((ms) => typeof ms === "number");
const maxMs = Math.max(...times);
const avgMs = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
const rate = passed / questions.length;
const ok = rate >= PASS_RATE && maxMs <= TIME_LIMIT_MS;

const summary = `정답 ${passed}/${questions.length} (${Math.round(rate * 100)}%) · 응답 시간 평균 ${(avgMs / 1000).toFixed(1)}초, 최대 ${(maxMs / 1000).toFixed(1)}초 · ${ok ? "성공 기준 통과" : "성공 기준 미달"}`;
console.log(`\n${summary}`);

const report = `# 테스트 결과

- 실행: ${new Date().toISOString()}
- 서버: ${BASE_URL}
- 성공 기준: 정답률 90% 이상, 모든 응답 30초 이내 (PLAN.md)
- **${summary}**

| # | 결과 | 응답 시간 | 질문 | 틀린 이유 |
|---|---|---|---|---|
${rows
  .map(
    ({ q, reply, reason }) =>
      `| ${q.no} | ${reason ? "X" : "O"} | ${reply ? `${(reply.ms / 1000).toFixed(1)}초` : "-"} | ${q.previous ? `${q.previous} → ` : ""}${q.question} | ${reason ?? ""} |`,
  )
  .join("\n")}
`;
writeFileSync("data/test-results.md", report);
process.exit(ok ? 0 : 1);
