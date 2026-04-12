import { describe, it, expect } from "vitest";
import {
  parseCheckoutBody,
  areSlotsContiguous,
  countRanges,
} from "../checkout-validation";

describe("parseCheckoutBody", () => {
  const validBody = {
    date: "2026-04-10",
    startTime: "10:00",
    endTime: "15:00",
    optionIds: [],
    guestEmail: "test@example.com",
    guestName: "テスト太郎",
  };

  it("有効な入力を受け付ける", () => {
    const result = parseCheckoutBody(validBody);
    expect("data" in result).toBe(true);
    if ("data" in result) {
      expect(result.data.date).toBe("2026-04-10");
      expect(result.data.startTime).toBe("10:00");
      expect(result.data.endTime).toBe("15:00");
    }
  });

  it("optionIds 省略時は空配列になる", () => {
    const { optionIds, ...bodyWithout } = validBody;
    void optionIds;
    const result = parseCheckoutBody(bodyWithout);
    expect("data" in result).toBe(true);
    if ("data" in result) {
      expect(result.data.optionIds).toEqual([]);
    }
  });

  it("null を拒否", () => {
    const result = parseCheckoutBody(null);
    expect("error" in result).toBe(true);
  });

  it("空オブジェクトを拒否", () => {
    const result = parseCheckoutBody({});
    expect("error" in result).toBe(true);
  });

  it("不正な date 形式を拒否", () => {
    const result = parseCheckoutBody({ ...validBody, date: "2026/04/10" });
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toContain("YYYY-MM-DD");
    }
  });

  it("不正な startTime 形式を拒否", () => {
    const result = parseCheckoutBody({ ...validBody, startTime: "10時" });
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toContain("HH:MM");
    }
  });

  it("endTime が startTime 以前を拒否", () => {
    const result = parseCheckoutBody({
      ...validBody,
      startTime: "15:00",
      endTime: "10:00",
    });
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toContain("startTime より後");
    }
  });

  it("同じ startTime と endTime を拒否", () => {
    const result = parseCheckoutBody({
      ...validBody,
      startTime: "10:00",
      endTime: "10:00",
    });
    expect("error" in result).toBe(true);
  });

  it("guestEmail が空を拒否", () => {
    const result = parseCheckoutBody({ ...validBody, guestEmail: "" });
    expect("error" in result).toBe(true);
  });

  it("guestName が未定義を拒否", () => {
    const { guestName, ...bodyWithout } = validBody;
    void guestName;
    const result = parseCheckoutBody(bodyWithout);
    expect("error" in result).toBe(true);
  });

  it("optionIds が文字列（非配列）を拒否", () => {
    const result = parseCheckoutBody({
      ...validBody,
      optionIds: "invalid",
    });
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toContain("文字列配列");
    }
  });

  it("optionIds に数値が含まれると拒否", () => {
    const result = parseCheckoutBody({
      ...validBody,
      optionIds: ["valid-id", 123],
    });
    expect("error" in result).toBe(true);
  });

  it("billingType 省略時は individual になる", () => {
    const result = parseCheckoutBody(validBody);
    expect("data" in result).toBe(true);
    if ("data" in result) {
      expect(result.data.billingType).toBe("individual");
      expect(result.data.companyName).toBeNull();
      expect(result.data.companyDepartment).toBeNull();
      expect(result.data.contactPersonName).toBeNull();
      expect(result.data.usagePurpose).toBeNull();
    }
  });

  it("法人利用で会社名ありを受け付ける", () => {
    const result = parseCheckoutBody({
      ...validBody,
      billingType: "corporate",
      companyName: "株式会社テスト",
      companyDepartment: "開発部",
      contactPersonName: "山田太郎",
      usagePurpose: "撮影スタジオとして",
    });
    expect("data" in result).toBe(true);
    if ("data" in result) {
      expect(result.data.billingType).toBe("corporate");
      expect(result.data.companyName).toBe("株式会社テスト");
      expect(result.data.companyDepartment).toBe("開発部");
      expect(result.data.contactPersonName).toBe("山田太郎");
      expect(result.data.usagePurpose).toBe("撮影スタジオとして");
    }
  });

  it("法人利用で会社名なしを拒否", () => {
    const result = parseCheckoutBody({
      ...validBody,
      billingType: "corporate",
    });
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toContain("会社名");
    }
  });

  it("法人利用で会社名が空文字を拒否", () => {
    const result = parseCheckoutBody({
      ...validBody,
      billingType: "corporate",
      companyName: "",
    });
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error).toContain("会社名");
    }
  });

  it("個人利用時は法人フィールドが無視される", () => {
    const result = parseCheckoutBody({
      ...validBody,
      billingType: "individual",
      companyName: "株式会社テスト",
      companyDepartment: "開発部",
    });
    expect("data" in result).toBe(true);
    if ("data" in result) {
      expect(result.data.billingType).toBe("individual");
      expect(result.data.companyName).toBeNull();
      expect(result.data.companyDepartment).toBeNull();
    }
  });

  it("不明な billingType は individual として扱う", () => {
    const result = parseCheckoutBody({
      ...validBody,
      billingType: "unknown",
    });
    expect("data" in result).toBe(true);
    if ("data" in result) {
      expect(result.data.billingType).toBe("individual");
    }
  });

  it("個人利用でも usagePurpose を設定できる", () => {
    const result = parseCheckoutBody({
      ...validBody,
      usagePurpose: "料理教室として",
    });
    expect("data" in result).toBe(true);
    if ("data" in result) {
      expect(result.data.usagePurpose).toBe("料理教室として");
    }
  });
});

describe("areSlotsContiguous", () => {
  it("空配列は連続と判定", () => {
    expect(areSlotsContiguous([])).toBe(true);
  });

  it("1枠は連続と判定", () => {
    expect(
      areSlotsContiguous([{ startTime: "10:00", endTime: "11:00" }])
    ).toBe(true);
  });

  it("連続する2枠は連続と判定", () => {
    expect(
      areSlotsContiguous([
        { startTime: "10:00", endTime: "11:00" },
        { startTime: "11:00", endTime: "12:00" },
      ])
    ).toBe(true);
  });

  it("非連続な2枠は非連続と判定", () => {
    expect(
      areSlotsContiguous([
        { startTime: "10:00", endTime: "11:00" },
        { startTime: "13:00", endTime: "14:00" },
      ])
    ).toBe(false);
  });

  it("順番がバラバラでも連続を正しく判定", () => {
    expect(
      areSlotsContiguous([
        { startTime: "12:00", endTime: "13:00" },
        { startTime: "10:00", endTime: "11:00" },
        { startTime: "11:00", endTime: "12:00" },
      ])
    ).toBe(true);
  });
});

describe("countRanges", () => {
  it("空配列は0", () => {
    expect(countRanges([])).toBe(0);
  });

  it("連続する3枠は1範囲", () => {
    expect(
      countRanges([
        { startTime: "10:00", endTime: "11:00" },
        { startTime: "11:00", endTime: "12:00" },
        { startTime: "12:00", endTime: "13:00" },
      ])
    ).toBe(1);
  });

  it("途切れた2グループは2範囲", () => {
    expect(
      countRanges([
        { startTime: "10:00", endTime: "11:00" },
        { startTime: "11:00", endTime: "12:00" },
        { startTime: "14:00", endTime: "15:00" },
        { startTime: "15:00", endTime: "16:00" },
      ])
    ).toBe(2);
  });

  it("全て離れた3枠は3範囲", () => {
    expect(
      countRanges([
        { startTime: "10:00", endTime: "11:00" },
        { startTime: "13:00", endTime: "14:00" },
        { startTime: "16:00", endTime: "17:00" },
      ])
    ).toBe(3);
  });
});
