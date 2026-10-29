// 질문 횟수 제한 — 주소를 아는 누구나 질문할 수 있어서, AI 요금이 새지 않게 AI를 부르기 전에 막는다.
// 서버 한 대(인스턴스)의 메모리에서 세는 간이 방식이라, 서버가 여러 대로 늘면 대수만큼 허용 횟수가 늘어난다.
// 정확히 막으려면 Vercel 방화벽 규칙이나 공유 저장소가 필요하다.
import "server-only";

/** 횟수를 세는 시간 길이 */
const WINDOW_MS = 60_000;

/** 같은 사람(IP)이 1분에 질문할 수 있는 횟수. 사람이 손으로 묻기에는 넉넉한 값이다. */
export const PER_IP_LIMIT = 20;

/** 모든 사람을 합쳐 1분에 받는 질문 횟수. 여러 IP로 나눠 보내는 경우를 막는다. */
export const GLOBAL_LIMIT = 120;

/** 기억해 두는 IP 수의 상한 (메모리가 계속 늘지 않게) */
const MAX_TRACKED_IPS = 5_000;

const hitsByIp = new Map<string, number[]>();
let globalHits: number[] = [];

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number };

/** 질문 한 건을 받아도 되는지 확인하고, 받으면 횟수에 넣는다. 거절된 요청은 횟수에 넣지 않는다. */
export function checkRateLimit(ip: string, now: number = Date.now()): RateLimitResult {
  const since = now - WINDOW_MS;
  globalHits = globalHits.filter((time) => time > since);
  const ipHits = (hitsByIp.get(ip) ?? []).filter((time) => time > since);

  if (globalHits.length >= GLOBAL_LIMIT) return blocked(globalHits[0], now);
  if (ipHits.length >= PER_IP_LIMIT) return blocked(ipHits[0], now);

  globalHits.push(now);
  ipHits.push(now);
  hitsByIp.set(ip, ipHits);
  prune(since);
  return { ok: true };
}

/** 가장 오래된 요청이 시간 창에서 빠질 때까지 기다릴 초 */
function blocked(oldest: number, now: number): RateLimitResult {
  return {
    ok: false,
    retryAfterSeconds: Math.max(1, Math.ceil((oldest + WINDOW_MS - now) / 1000)),
  };
}

/** 오래된 IP 기록을 지워 메모리가 계속 늘지 않게 한다 */
function prune(since: number) {
  if (hitsByIp.size <= MAX_TRACKED_IPS) return;
  for (const [ip, hits] of hitsByIp) {
    if (hits[hits.length - 1] <= since) hitsByIp.delete(ip);
  }
  // 그래도 많으면 먼저 들어온 것부터 지운다
  for (const ip of hitsByIp.keys()) {
    if (hitsByIp.size <= MAX_TRACKED_IPS) break;
    hitsByIp.delete(ip);
  }
}

/** 요청을 보낸 사람의 IP. Vercel은 x-forwarded-for에 접속자 IP를 넣어 준다. 알 수 없으면 한 묶음으로 센다. */
export function clientIpOf(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}

/** 테스트에서 횟수를 처음 상태로 되돌린다 */
export function resetRateLimit() {
  hitsByIp.clear();
  globalHits = [];
}
