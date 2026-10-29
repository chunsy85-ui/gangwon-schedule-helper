import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // exceljs는 Node.js 파일·스트림 기능을 쓰므로 번들에 넣지 않고 서버에서 그대로 불러온다
  serverExternalPackages: ["exceljs"],
  // 응답에 "X-Powered-By: Next.js"를 붙이지 않는다 (보안 점검 7번)
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            // 다른 사이트가 이 화면을 iframe으로 감싸지 못하게 하고, 기본 주소·양식 전송 대상·플러그인을 제한한다.
            // 스크립트 제한(script-src)은 넣지 않는다. Next.js가 화면에 넣는 스크립트가 막힐 수 있기 때문이다.
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
          },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
