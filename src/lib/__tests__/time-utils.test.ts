import { describe, it, expect } from "vitest";
import { timeToMinutes, minutesToTime } from "../time-utils";

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
