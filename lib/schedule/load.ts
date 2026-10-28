// 엑셀 일정표 불러오기 (DESIGN 3.1) — 서버에서만 실행
import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";
import {
  MAX_DATA_ROWS,
  MISSING_TEXT,
  REQUIRED_COLUMNS,
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

  // 필수 열(날짜, 일정명)이 하나라도 없으면 일정표를 쓰지 않는다 (PRD must 1)
  const missingColumns = REQUIRED_COLUMNS.filter((name) => !columns.has(name));
  if (missingColumns.length > 0) {
    return { status: "missing-columns", missingColumns };
  }

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

    // 날짜·일정명이 비었거나 날짜가 잘못된 행은 행 번호와 함께 제외한다 (PRD must 1)
    const date = parseDate(read(row, "날짜")!);
    const title = cellText(read(row, "일정명")!);
    if (!date || !title) {
      excludedRows.push(n);
      continue;
    }

    items.push({
      row: n,
      date,
      title,
      time: parseTime(read(row, "시간")),
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

/** 셀 값. 수식 칸이면 계산 결과를 쓴다. */
function cellValue(cell: ExcelJS.Cell): unknown {
  const value = cell.value;
  if (value && typeof value === "object" && "result" in value) {
    return value.result;
  }
  return value;
}

/** 셀에 보이는 글자 (앞뒤 공백 제거) */
function cellText(cell: ExcelJS.Cell): string {
  const value = cellValue(cell);
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return cell.text.trim();
}

function optionalText(cell: ExcelJS.Cell | undefined): string {
  const text = cell ? cellText(cell) : "";
  return text || MISSING_TEXT;
}

/** 2026-10-28, 2026.10.28, 2026/10/28, 2026. 10. 28. */
const DATE_TEXT = /^(\d{4})\s*[-./]\s*(\d{1,2})\s*[-./]\s*(\d{1,2})\s*\.?$/;

/** 날짜 칸 → YYYY-MM-DD. 연도가 없거나 달력에 없는 날짜면 null (DESIGN 3.1 받는 날짜 형식) */
function parseDate(cell: ExcelJS.Cell): string | null {
  const value = cellValue(cell);
  // 엑셀 날짜 형식 칸은 그날 0시(UTC)로 읽힌다
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  }

  const match = DATE_TEXT.exec(cellText(cell));
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null; // 2026-02-30처럼 달력에 없는 날짜
  }
  return date.toISOString().slice(0, 10);
}

/** 9:00, 09:00, 9 : 00 */
const TIME_TEXT = /^(\d{1,2})\s*:\s*(\d{2})$/;

/** 시간 칸 → HH:mm. 알아볼 수 없으면 글자 그대로, 비었으면 "미기재" */
function parseTime(cell: ExcelJS.Cell | undefined): string {
  if (!cell) return MISSING_TEXT;
  const value = cellValue(cell);

  let minutes: number | null = null;
  if (value instanceof Date) {
    // 엑셀 시간 형식 칸은 1899-12-30 그 시각(UTC)으로 읽힌다
    minutes = value.getUTCHours() * 60 + value.getUTCMinutes();
  } else if (typeof value === "number" && value >= 0 && value < 1) {
    // 서식 없는 시간 칸은 하루를 1로 본 소수 (0.375 = 09:00)
    minutes = Math.round(value * 24 * 60);
  } else {
    const match = TIME_TEXT.exec(cellText(cell));
    if (match) {
      const [hour, minute] = match.slice(1).map(Number);
      if (hour < 24 && minute < 60) minutes = hour * 60 + minute;
    }
  }

  if (minutes === null) return optionalText(cell);
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}
