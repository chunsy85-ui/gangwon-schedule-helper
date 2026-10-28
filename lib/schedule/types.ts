// 일정표 데이터의 모양 (DESIGN 3.1)

/** 엑셀 열 이름. 1행(머리글)에 이 글자 그대로 있어야 한다. */
export const REQUIRED_COLUMNS = ["날짜", "일정명"] as const;
export const OPTIONAL_COLUMNS = ["시간", "대상자", "장소"] as const;

export type RequiredColumn = (typeof REQUIRED_COLUMNS)[number];

/** 데이터는 최대 500행(엑셀 2~501행)까지만 읽는다. (PRD must 1) */
export const MAX_DATA_ROWS = 500;

/** 선택 열이 비어 있을 때 보여주는 글자 (PRD must 2) */
export const MISSING_TEXT = "미기재";

/** 일정 한 건. 선택 열이 비어 있으면 MISSING_TEXT가 들어 있다. */
export type ScheduleItem = {
  /** 엑셀 화면의 행 번호 (머리글이 1행) */
  row: number;
  /** YYYY-MM-DD */
  date: string;
  title: string;
  /** HH:mm, 알아볼 수 없는 시간은 원래 글자 그대로, 비었으면 MISSING_TEXT */
  time: string;
  target: string;
  place: string;
};

/** 일정표를 쓸 수 없는 이유 */
export type ScheduleUnavailableReason =
  | "file-missing" // 파일이 없음
  | "unreadable" // 파일을 열 수 없음
  | "no-valid-rows"; // 검사를 통과한 행이 0건

/** 일정표 불러오기 결과 */
export type ScheduleLoadResult =
  | {
      status: "ok";
      items: ScheduleItem[];
      /** 제외된 행의 엑셀 행 번호 */
      excludedRows: number[];
      /** 500행을 넘어 뒷부분을 읽지 않았는지 */
      truncated: boolean;
    }
  | {
      status: "missing-columns";
      missingColumns: RequiredColumn[];
    }
  | {
      status: "none";
      reason: ScheduleUnavailableReason;
      excludedRows: number[];
      truncated: boolean;
    };
