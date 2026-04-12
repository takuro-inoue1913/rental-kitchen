import { describe, it, expect } from "vitest";
import { buildCalendarLinks } from "../calendar-links";

const baseParams = {
  date: "2026-04-15",
  startTime: "10:00",
  endTime: "14:00",
  title: "リノスペキッチン神田TYD ご予約",
  location: "〒101-0047 東京都千代田区内神田1丁目9 TYDビル 301",
  description: "予約番号: abc12345",
};

describe("buildCalendarLinks", () => {
  describe("Google Calendar URL", () => {
    it("dates パラメータが YYYYMMDDTHHMMSS 形式", () => {
      const { google } = buildCalendarLinks(baseParams);
      const url = new URL(google);
      expect(url.searchParams.get("dates")).toBe(
        "20260415T100000/20260415T140000"
      );
    });

    it("ctz が Asia/Tokyo", () => {
      const { google } = buildCalendarLinks(baseParams);
      const url = new URL(google);
      expect(url.searchParams.get("ctz")).toBe("Asia/Tokyo");
    });

    it("title と location がセットされる", () => {
      const { google } = buildCalendarLinks(baseParams);
      const url = new URL(google);
      expect(url.searchParams.get("text")).toBe(baseParams.title);
      expect(url.searchParams.get("location")).toBe(baseParams.location);
    });

    it("description がセットされる", () => {
      const { google } = buildCalendarLinks(baseParams);
      const url = new URL(google);
      expect(url.searchParams.get("details")).toBe(baseParams.description);
    });

    it("description 省略時は details パラメータなし", () => {
      const { google } = buildCalendarLinks({
        ...baseParams,
        description: undefined,
      });
      const url = new URL(google);
      expect(url.searchParams.has("details")).toBe(false);
    });
  });

  describe("Outlook URL", () => {
    it("startdt / enddt が ISO 8601 +09:00 形式", () => {
      const { outlook } = buildCalendarLinks(baseParams);
      const url = new URL(outlook);
      expect(url.searchParams.get("startdt")).toBe(
        "2026-04-15T10:00:00+09:00"
      );
      expect(url.searchParams.get("enddt")).toBe(
        "2026-04-15T14:00:00+09:00"
      );
    });

    it("subject と location がセットされる", () => {
      const { outlook } = buildCalendarLinks(baseParams);
      const url = new URL(outlook);
      expect(url.searchParams.get("subject")).toBe(baseParams.title);
      expect(url.searchParams.get("location")).toBe(baseParams.location);
    });

    it("description 省略時は body パラメータなし", () => {
      const { outlook } = buildCalendarLinks({
        ...baseParams,
        description: undefined,
      });
      const url = new URL(outlook);
      expect(url.searchParams.has("body")).toBe(false);
    });
  });

  describe("HH:MM:SS 形式の入力", () => {
    it("秒付き時刻でも正しく処理される", () => {
      const { google, outlook } = buildCalendarLinks({
        ...baseParams,
        startTime: "10:00:00",
        endTime: "14:00:00",
      });
      const gUrl = new URL(google);
      expect(gUrl.searchParams.get("dates")).toBe(
        "20260415T100000/20260415T140000"
      );
      const oUrl = new URL(outlook);
      expect(oUrl.searchParams.get("startdt")).toBe(
        "2026-04-15T10:00:00+09:00"
      );
    });
  });
});
