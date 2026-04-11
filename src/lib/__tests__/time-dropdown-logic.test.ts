import { describe, it, expect } from "vitest";
import {
  parseTime,
  formatTime,
  getRanges,
  getStartOptions,
  getEndOptions,
  calcTotalHours,
} from "../time-dropdown-logic";
import type { TimeSlot } from "@/lib/availability";

// テスト用ヘルパー: スロット生成
function slot(
  startTime: string,
  endTime: string,
  available = true,
  price = 2500,
): TimeSlot {
  return { startTime, endTime, available, price };
}

// 0:00-23:00 の 24 時間分スロット（1時間単位）
function allSlots(unavailable: string[] = []): TimeSlot[] {
  const slots: TimeSlot[] = [];
  for (let h = 0; h < 23; h++) {
    const start = `${String(h).padStart(2, "0")}:00`;
    const end = `${String(h + 1).padStart(2, "0")}:00`;
    slots.push(slot(start, end, !unavailable.includes(start)));
  }
  return slots;
}

describe("parseTime", () => {
  it("HH:MM を hour と minute に分割する", () => {
    expect(parseTime("09:30")).toEqual({ hour: "09", minute: "30" });
  });

  it("分がない場合は 00 をデフォルトにする", () => {
    expect(parseTime("12")).toEqual({ hour: "12", minute: "00" });
  });
});

describe("formatTime", () => {
  it("hour と minute を HH:MM に結合する", () => {
    expect(formatTime("9", "0")).toBe("09:00");
  });

  it("2桁の場合はそのまま", () => {
    expect(formatTime("12", "30")).toBe("12:30");
  });
});

describe("getRanges", () => {
  it("空配列 → 空配列", () => {
    expect(getRanges([])).toEqual([]);
  });

  it("1スロット → 1範囲", () => {
    const result = getRanges([slot("10:00", "11:00")]);
    expect(result).toEqual([{ start: "10:00", end: "11:00", hours: 1 }]);
  });

  it("連続スロット → 1範囲にまとめる", () => {
    const result = getRanges([
      slot("10:00", "11:00"),
      slot("11:00", "12:00"),
      slot("12:00", "13:00"),
    ]);
    expect(result).toEqual([{ start: "10:00", end: "13:00", hours: 3 }]);
  });

  it("非連続スロット → 複数範囲に分割する", () => {
    const result = getRanges([
      slot("10:00", "11:00"),
      slot("11:00", "12:00"),
      slot("15:00", "16:00"),
    ]);
    expect(result).toEqual([
      { start: "10:00", end: "12:00", hours: 2 },
      { start: "15:00", end: "16:00", hours: 1 },
    ]);
  });

  it("順序がバラバラでも正しくグループ化する", () => {
    const result = getRanges([
      slot("15:00", "16:00"),
      slot("10:00", "11:00"),
      slot("11:00", "12:00"),
    ]);
    expect(result).toEqual([
      { start: "10:00", end: "12:00", hours: 2 },
      { start: "15:00", end: "16:00", hours: 1 },
    ]);
  });
});

describe("getStartOptions", () => {
  it("空き枠の startTime を返す", () => {
    const slots = allSlots(["05:00", "06:00"]);
    const result = getStartOptions(slots, new Set());
    expect(result).not.toContain("05:00");
    expect(result).not.toContain("06:00");
    expect(result).toContain("00:00");
    expect(result).toContain("07:00");
  });

  it("occupiedSet に含まれる枠を除外する", () => {
    const slots = allSlots();
    const occupied = new Set(["10:00", "11:00"]);
    const result = getStartOptions(slots, occupied);
    expect(result).not.toContain("10:00");
    expect(result).not.toContain("11:00");
    expect(result).toContain("09:00");
    expect(result).toContain("12:00");
  });

  it("全枠が占有済みなら空配列", () => {
    const slots = [slot("10:00", "11:00"), slot("11:00", "12:00")];
    const occupied = new Set(["10:00", "11:00"]);
    expect(getStartOptions(slots, occupied)).toEqual([]);
  });
});

describe("getEndOptions", () => {
  it("開始時間から連続する空き枠の endTime を返す", () => {
    const slots = allSlots();
    const result = getEndOptions(slots, "10:00", new Set());
    // 10:00 から 22:00 まで全て空きなので 13 枠分の endTime
    expect(result[0]).toBe("11:00");
    expect(result[result.length - 1]).toBe("23:00");
    expect(result.length).toBe(13);
  });

  it("途中に予約済み枠があるとそこで止まる", () => {
    const slots = allSlots(["12:00"]);
    const result = getEndOptions(slots, "10:00", new Set());
    expect(result).toEqual(["11:00", "12:00"]);
  });

  it("途中に occupiedSet の枠があるとそこで止まる", () => {
    const slots = allSlots();
    const occupied = new Set(["13:00"]);
    const result = getEndOptions(slots, "10:00", occupied);
    expect(result).toEqual(["11:00", "12:00", "13:00"]);
  });

  it("開始時間が空なら空配列", () => {
    expect(getEndOptions(allSlots(), "", new Set())).toEqual([]);
  });

  it("開始時間が見つからなければ空配列", () => {
    expect(getEndOptions(allSlots(), "99:00", new Set())).toEqual([]);
  });
});

describe("calcTotalHours", () => {
  it("1範囲の合計時間を算出する", () => {
    expect(calcTotalHours([{ start: "10:00", end: "13:00", hours: 3 }])).toBe(
      3,
    );
  });

  it("複数範囲の合計時間を算出する", () => {
    expect(
      calcTotalHours([
        { start: "00:00", end: "13:00", hours: 13 },
        { start: "17:00", end: "23:00", hours: 6 },
      ]),
    ).toBe(19);
  });

  it("空の範囲は 0", () => {
    expect(calcTotalHours([])).toBe(0);
  });

  it("30分枠のように端数がある場合", () => {
    expect(
      calcTotalHours([{ start: "10:00", end: "11:30", hours: 1 }]),
    ).toBe(1.5);
  });
});
