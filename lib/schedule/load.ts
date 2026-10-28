// 엑셀 일정표 불러오기 (DESIGN 3.1) — 서버에서만 실행
import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";
import {
  MAX_DATA_ROWS,
  MISSING_TEXT,
  type ScheduleItem,
  type ScheduleLoadResult,
} from "./types";

/** 일정표의 정해진 위치. 일정 담당자는 이 파일만 교체하고 다시 배포한다. */
export const SCHEDULE_PATH = path.join(process.cwd(), "data", "schedule.xlsx");

/**
 * 일정표를 읽는다. 일정표는 재배포할 때만 바뀌므로 결과를 캐시해 다시 쓴다.
 * 오늘 날짜처럼 매번 달라지는 값은 여기서 다루지 않는다. (DESIGN 3.3)
 */
export async function loadSchedule(): Promise<ScheduleLoadResult> {
  "use cache";
  return readScheduleFile(SCHEDULE_PATH);
}

/** 파일 하나를 읽어 일정표 결과로 바꾼다. 테스트에서는 다른 파일 경로를 넣어 쓴다. */
export async function readScheduleFile(
  filePath: string,
): Promise<ScheduleLoadResult> {
  let buffer: Buffer;
  try {
    buffer = await readFile(filePath);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    return unavailable(code === "ENOENT" ? "file-missing" : "unreadable");
  }

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  } catch {
    return unavailable("unreadable");
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) return unavailable("unreadable");

  // 1행 머리글에서 열 이름 → 열 번호
  const columns = new Map<string, number>();
  sheet.getRow(1).eachCell((cell, col) => {
    const name = cellText(cell);
    if (name && !columns.has(name)) columns.set(name, col);
  });

  // 데이터는 엑셀 2~501행까지만 읽는다
  const lastRow = Math.min(sheet.rowCount, MAX_DATA_ROWS + 1);
  const truncated = hasDataAfter(sheet, lastRow);

  const read = (row: ExcelJS.Row, name: string) => {
    const col = columns.get(name);
    return col ? row.getCell(col) : undefined;
  };

  const items: ScheduleItem[] = [];
  const excludedRows: number[] = [];
  for (let n = 2; n <= lastRow; n++) {
    const row = sheet.getRow(n);
    if (!row.hasValues) continue; // 완전히 빈 줄은 일정도, 제외 대상도 아님

    const date = read(row, "날짜");
    const title = read(row, "일정명");
    items.push({
      row: n,
      date: date ? cellText(date) : "",
      title: title ? cellText(title) : "",
      time: optionalText(read(row, "시간")),
      target: optionalText(read(row, "대상자")),
      place: optionalText(read(row, "장소")),
    });
  }

  if (items.length === 0) {
    return { status: "none", reason: "no-valid-rows", excludedRows, truncated };
  }
  return { status: "ok", items, excludedRows, truncated };
}

function unavailable(
  reason: "file-missing" | "unreadable",
): ScheduleLoadResult {
  return { status: "none", reason, excludedRows: [], truncated: false };
}

/** 501행 뒤에 값이 있는 행이 하나라도 있으면 true */
function hasDataAfter(sheet: ExcelJS.Worksheet, lastRow: number): boolean {
  for (let n = lastRow + 1; n <= sheet.rowCount; n++) {
    if (sheet.getRow(n).hasValues) return true;
  }
  return false;
}

/** 셀에 보이는 글자 (앞뒤 공백 제거) */
function cellText(cell: ExcelJS.Cell): string {
  const value = cell.value;
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return cell.text.trim();
}

function optionalText(cell: ExcelJS.Cell | undefined): string {
  const text = cell ? cellText(cell) : "";
  return text || MISSING_TEXT;
}
