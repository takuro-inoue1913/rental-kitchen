import { describe, it, expect } from "vitest";
import {
  generateAvailability,
  emptyAvailability,
} from "../availability";
import type { Database } from "../database.types";

type AvailabilityRule =
  Database["public"]["Tables"]["availability_rules"]["Row"];

// テスト用の基本ルール（hourly: 10:00〜14:00, 1時間枠, ¥2500）
const hourlyRule: AvailabilityRule = {
  id: "rule-1",
  day_of_week: 0,
  start_time: "10:00",
  end_time: "14:00",
  slot_duration_minutes: 60,
  price_per_slot: 2500,
  pricing_type: "hourly",
  is_active: true,
  created_at: "",
};

// テスト用の基本ルール（daily: 09:00〜21:00, 3時間枠, ¥11000）
const dailyRule: AvailabilityRule = {
  id: "rule-2",
  day_of_week: 1,
  start_time: "09:00",
  end_time: "21:00",
  slot_duration_minutes: 180,
  price_per_slot: 11000,
  pricing_type: "daily",
  is_active: true,
  created_at: "",
};

describe("generateAvailability", () => {
  describe("hourly pricing", () => {
    it("予約なしの場合すべてのスロットが available", () => {
      const result = generateAvailability("2026-04-12", hourlyRule, []);
      expect(result.pricingType).toBe("hourly");
      expect(result.dailyPrice).toBeNull();
      expect(result.slots).toHaveLength(4); // 10-11, 11-12, 12-13, 13-14
      expect(result.slots.every((s) => s.available)).toBe(true);
      expect(result.slots.every((s) => s.price === 2500)).toBe(true);
    });

    it("時間指定イベントと重なるスロットは unavailable", () => {
      const result = generateAvailability("2026-04-12", hourlyRule, [
        {
          summary: "予約",
          startTime: "11:00",
          endTime: "12:00",
          isAllDay: false,
        },
      ]);
      expect(result.slots[0].available).toBe(true); // 10:00-11:00
      expect(result.slots[1].available).toBe(false); // 11:00-12:00
      expect(result.slots[2].available).toBe(true); // 12:00-13:00
      expect(result.slots[3].available).toBe(true); // 13:00-14:00
    });

    it("スロット境界をまたぐイベントは両方のスロットを unavailable にする", () => {
      const result = generateAvailability("2026-04-12", hourlyRule, [
        {
          summary: "長い予約",
          startTime: "10:30",
          endTime: "12:30",
          isAllDay: false,
        },
      ]);
      expect(result.slots[0].available).toBe(false); // 10:00-11:00
      expect(result.slots[1].available).toBe(false); // 11:00-12:00
      expect(result.slots[2].available).toBe(false); // 12:00-13:00
      expect(result.slots[3].available).toBe(true); // 13:00-14:00
    });

    it("終日イベントがあるとすべてのスロットが unavailable", () => {
      const result = generateAvailability("2026-04-12", hourlyRule, [
        {
          summary: "終日ブロック",
          startTime: "00:00",
          endTime: "00:00",
          isAllDay: true,
        },
      ]);
      expect(result.slots.every((s) => !s.available)).toBe(true);
    });

    it("blocks は空（hourly では不要）", () => {
      const result = generateAvailability("2026-04-12", hourlyRule, []);
      expect(result.blocks).toHaveLength(0);
    });
  });

  describe("daily pricing", () => {
    it("予約なしの場合スロットの price は 0 で dailyPrice にルール価格が入る", () => {
      const result = generateAvailability("2026-04-14", dailyRule, []);
      expect(result.pricingType).toBe("daily");
      expect(result.dailyPrice).toBe(11000);
      expect(result.slots.every((s) => s.price === 0)).toBe(true);
    });

    it("予約なしの場合、全スロットが1つのブロックにまとまる", () => {
      const result = generateAvailability("2026-04-14", dailyRule, []);
      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0].startTime).toBe("09:00");
      expect(result.blocks[0].endTime).toBe("21:00");
    });

    it("中間にイベントがあると2つのブロックに分かれる", () => {
      const result = generateAvailability("2026-04-14", dailyRule, [
        {
          summary: "予約",
          startTime: "12:00",
          endTime: "15:00",
          isAllDay: false,
        },
      ]);
      expect(result.blocks).toHaveLength(2);
      expect(result.blocks[0].startTime).toBe("09:00");
      expect(result.blocks[0].endTime).toBe("12:00");
      expect(result.blocks[1].startTime).toBe("15:00");
      expect(result.blocks[1].endTime).toBe("21:00");
    });
  });

  it("date フィールドが正しくセットされる", () => {
    const result = generateAvailability("2026-04-12", hourlyRule, []);
    expect(result.date).toBe("2026-04-12");
  });

  it("スロットは startTime 順にソートされる", () => {
    const result = generateAvailability("2026-04-12", hourlyRule, []);
    for (let i = 1; i < result.slots.length; i++) {
      expect(
        result.slots[i].startTime >= result.slots[i - 1].startTime,
      ).toBe(true);
    }
  });
});

describe("emptyAvailability", () => {
  it("指定日の空レスポンスを返す", () => {
    const result = emptyAvailability("2026-04-12");
    expect(result.date).toBe("2026-04-12");
    expect(result.pricingType).toBe("hourly");
    expect(result.dailyPrice).toBeNull();
    expect(result.slots).toEqual([]);
    expect(result.blocks).toEqual([]);
  });
});
