import { describe, it, expect } from "vitest";
import {
  timeToMinutes,
  minutesToTime,
  extractTime,
  resolveEndTime,
} from "../time-utils";

describe("timeToMinutes", () => {
  it("00:00 → 0", () => {
    expect(timeToMinutes("00:00")).toBe(0);
  });

  it("01:30 → 90", () => {
    expect(timeToMinutes("01:30")).toBe(90);
  });

  it("12:00 → 720", () => {
    expect(timeToMinutes("12:00")).toBe(720);
  });

  it("23:59 → 1439", () => {
    expect(timeToMinutes("23:59")).toBe(1439);
  });
});

describe("minutesToTime", () => {
  it("0 → 00:00", () => {
    expect(minutesToTime(0)).toBe("00:00");
  });

  it("90 → 01:30", () => {
    expect(minutesToTime(90)).toBe("01:30");
  });

  it("720 → 12:00", () => {
    expect(minutesToTime(720)).toBe("12:00");
  });

  it("1439 → 23:59", () => {
    expect(minutesToTime(1439)).toBe("23:59");
  });
});

describe("extractTime", () => {
  it("ISO 日時文字列から HH:MM を抽出", () => {
    expect(extractTime("2026-04-12T14:00:00+09:00")).toBe("14:00");
  });

  it("日付のみ（終日イベント）の場合 00:00 を返す", () => {
    expect(extractTime("2026-04-12")).toBe("00:00");
  });

  it("空文字の場合 00:00 を返す", () => {
    expect(extractTime("")).toBe("00:00");
  });
});

describe("resolveEndTime", () => {
  it("同日内の終了時刻はそのまま返す", () => {
    expect(
      resolveEndTime("2026-04-12T14:00:00+09:00", "2026-04-12T18:00:00+09:00")
    ).toBe("18:00");
  });

  it("翌日 00:00 の場合 24:00 を返す", () => {
    expect(
      resolveEndTime("2026-04-12T14:00:00+09:00", "2026-04-13T00:00:00+09:00")
    ).toBe("24:00");
  });

  it("翌日以降にまたがる場合 24:00 を返す", () => {
    expect(
      resolveEndTime("2026-04-12T10:00:00+09:00", "2026-04-14T10:00:00+09:00")
    ).toBe("24:00");
  });

  it("終日イベント（日付のみ）の場合 00:00 を返す", () => {
    expect(resolveEndTime("2026-04-12", "2026-04-13")).toBe("00:00");
  });
});
