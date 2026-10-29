// 요청 출처 검사 (보안 점검 3번)
// 다른 사이트의 페이지가 방문자의 브라우저를 통해 몰래 질문을 보내, 우리 AI 요금을 쓰게 하는 것을 막는다.

/**
 * 요청 종류가 JSON인지.
 * 다른 사이트는 `application/json`을 사전 확인(preflight) 없이 보낼 수 없고, 우리는 다른 사이트를 허용하지 않으므로
 * 이것만으로도 브라우저를 통한 몰래 요청은 대부분 막힌다.
 */
export function isJsonRequest(headers: Headers): boolean {
  return (headers.get("content-type") ?? "").toLowerCase().startsWith("application/json");
}

/**
 * 우리 사이트가 아닌 곳의 페이지에서 보낸 브라우저 요청인지.
 * 브라우저가 보내 주는 Sec-Fetch-Site를 먼저 보고, 없는 오래된 브라우저는 Origin 주소로 확인한다.
 * 브라우저가 아닌 곳(서버, curl, 테스트 스크립트)에서 보낸 요청에는 두 헤더가 없어 막지 않는다.
 */
export function isCrossSite(headers: Headers): boolean {
  const site = headers.get("sec-fetch-site");
  if (site) return site !== "same-origin" && site !== "none";

  const origin = headers.get("origin");
  if (!origin) return false;

  const host = (headers.get("x-forwarded-host") ?? headers.get("host"))?.split(",")[0]?.trim();
  try {
    return new URL(origin).host !== host;
  } catch {
    return true; // Origin이 "null" 등 알아볼 수 없는 값이면 믿지 않는다
  }
}
