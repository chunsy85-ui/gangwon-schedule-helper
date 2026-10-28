// 일정표 로더 종합 확인 (PLAN 8번, DESIGN 7장)
// 일부러 망가뜨린 엑셀을 data/test-files/에 만들고, 로더 결과가 기대와 같은지 확인한다.
// 실행: npm run check:loader
import ExcelJS from "exceljs";
import { mkdirSync, writeFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { readScheduleFile, SCHEDULE_PATH } from "../lib/schedule/load.ts";

const DIR = "data/test-files";
mkdirSync(DIR, { recursive: true });

async function makeXlsx(name, rows) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("일정표");
  for (const row of rows) sheet.addRow(row);
  const filePath = `${DIR}/${name}.xlsx`;
  await workbook.xlsx.writeFile(filePath);
  return filePath;
}

const HEADER = ["날짜", "일정명", "시간", "대상자", "장소"];

// 기대 결과는 로더가 돌려주는 값 중 확인할 부분만 적는다
const cases = [
  {
    label: "정상 파일 (가상 일정표)",
    file: async () => SCHEDULE_PATH,
    expect: { status: "ok", count: 41, excludedRows: [], truncated: false },
  },
  {
    label: "필수 열 없음 (일정명)",
    file: () =>
      makeXlsx("missing-column", [
        ["날짜", "시간", "대상자", "장소"],
        ["2026-11-02", "09:00", "본부장", "본부장실"],
      ]),
    expect: { status: "missing-columns", missingColumns: ["일정명"] },
  },
  {
    label: "잘못된 행 섞임",
    file: () =>
      makeXlsx("bad-rows", [
        HEADER,
        ["2026-11-02", "주간 업무회의", "09:00", "기획관리팀", "3층 대회의실"], // 2
        ["", "날짜 빈칸", "10:00", "", ""], // 3 제외
        ["2026-11-03", "", "10:00", "", ""], // 4 제외
        ["11/04", "연도 없는 날짜", "", "", ""], // 5 제외
        ["2026-02-30", "달력에 없는 날짜", "", "", ""], // 6 제외
        ["2026.11.05", "점 구분 날짜", "9:30", "", ""], // 7
      ]),
    expect: { status: "ok", count: 2, excludedRows: [3, 4, 5, 6], truncated: false },
  },
  {
    label: "정상 행 0건",
    file: () =>
      makeXlsx("no-valid-rows", [
        HEADER,
        ["미정", "날짜 모름", "", "", ""],
        ["2026-11-02", "", "", "", ""],
      ]),
    expect: { status: "none", reason: "no-valid-rows", excludedRows: [2, 3], truncated: false },
  },
  {
    label: "500행 초과 (600행)",
    file: () =>
      makeXlsx("over-500-rows", [
        HEADER,
        ...Array.from({ length: 600 }, (_, i) => ["2026-11-02", `일정 ${i + 1}`]),
      ]),
    expect: { status: "ok", count: 500, excludedRows: [], truncated: true },
  },
  {
    label: "파일 없음",
    file: async () => `${DIR}/not-exists.xlsx`,
    expect: { status: "none", reason: "file-missing", excludedRows: [], truncated: false },
  },
  {
    label: "엑셀이 아닌 파일",
    file: async () => {
      const filePath = `${DIR}/not-excel.xlsx`;
      writeFileSync(filePath, "엑셀 파일이 아닙니다");
      return filePath;
    },
    expect: { status: "none", reason: "unreadable", excludedRows: [], truncated: false },
  },
];

let failed = 0;
for (const { label, file, expect } of cases) {
  const result = await readScheduleFile(await file());
  const actual = { ...result, count: result.items?.length };
  delete actual.items;
  const picked = Object.fromEntries(Object.keys(expect).map((key) => [key, actual[key]]));
  const ok = isDeepStrictEqual(picked, expect);
  if (!ok) failed++;
  console.log(`${ok ? "통과" : "실패"} | ${label}`);
  if (!ok) console.log("  기대:", expect, "\n  실제:", picked);
}

console.log(`\n${cases.length}개 중 ${cases.length - failed}개 통과`);
process.exit(failed ? 1 : 0);
