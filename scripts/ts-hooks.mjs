// Node로 lib/*.ts를 직접 실행해 확인할 때 쓰는 보조 파일 (앱에는 쓰이지 않음)
// 확장자 없는 상대 경로("./types")를 ".ts" 파일로 찾아 준다.
// 사용: node --conditions=react-server --import ./scripts/ts-hooks.mjs <스크립트>
import { register } from "node:module";

register(
  "data:text/javascript," +
    encodeURIComponent(`
export async function resolve(specifier, context, next) {
  try {
    return await next(specifier, context);
  } catch (error) {
    if (specifier.startsWith(".") && !/\\.[cm]?[jt]s$/.test(specifier)) {
      return next(specifier + ".ts", context);
    }
    throw error;
  }
}`),
);
