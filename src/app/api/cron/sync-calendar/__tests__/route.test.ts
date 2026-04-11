import { describe, it, expect, vi, beforeEach } from "vitest";

// --- モジュールモック ---
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/google-calendar", () => ({
  getCalendarEventsRaw: vi.fn(),
}));

import { GET } from "../route";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCalendarEventsRaw } from "@/lib/google-calendar";

const mockedCreateAdminClient = vi.mocked(createAdminClient);
const mockedGetCalendarEventsRaw = vi.mocked(getCalendarEventsRaw);

function makeRequest(cronSecret?: string) {
  const headers = new Headers();
  if (cronSecret) {
    headers.set("authorization", `Bearer ${cronSecret}`);
  }
  return new Request("http://localhost/api/cron/sync-calendar", {
    headers,
  }) as unknown as Parameters<typeof GET>[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("CRON_SECRET", "test-secret");
});

describe("GET /api/cron/sync-calendar", () => {
  it("CRON_SECRET が不一致の場合 401 を返す", async () => {
    const res = await GET(makeRequest("wrong-secret"));
    expect(res.status).toBe(401);
  });

  it("Authorization ヘッダーがない場合 401 を返す", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("カレンダーイベントが 0 件の場合 synced: 0 を返す", async () => {
    mockedGetCalendarEventsRaw.mockResolvedValue([]);

    const res = await GET(makeRequest("test-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ synced: 0, skipped: 0 });
  });

  it("新規イベントを同期して synced: 1 を返す", async () => {
    mockedGetCalendarEventsRaw.mockResolvedValue([
      {
        id: "gcal-event-1",
        summary: "テスト予約",
        start: "10:00",
        end: "12:00",
        isAllDay: false,
        date: "2026-04-20",
      },
    ]);

    const chain: Record<string, ReturnType<typeof vi.fn>> = {};
    chain.from = vi.fn(() => chain);
    chain.select = vi.fn(() => chain);
    chain.in = vi.fn(() => Promise.resolve({ data: [], error: null }));
    chain.upsert = vi.fn(() =>
      Promise.resolve({ error: null, count: 1 }),
    );

    mockedCreateAdminClient.mockReturnValue(chain as never);

    const res = await GET(makeRequest("test-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.synced).toBe(1);
    expect(body.skipped).toBe(0);
  });

  it("既存イベントはスキップする", async () => {
    mockedGetCalendarEventsRaw.mockResolvedValue([
      {
        id: "gcal-event-1",
        summary: "既存予約",
        start: "10:00",
        end: "12:00",
        isAllDay: false,
        date: "2026-04-20",
      },
    ]);

    const chain: Record<string, ReturnType<typeof vi.fn>> = {};
    chain.from = vi.fn(() => chain);
    chain.select = vi.fn(() => chain);
    chain.in = vi.fn(() =>
      Promise.resolve({
        data: [{ google_event_id: "gcal-event-1" }],
        error: null,
      }),
    );

    mockedCreateAdminClient.mockReturnValue(chain as never);

    const res = await GET(makeRequest("test-secret"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.synced).toBe(0);
    expect(body.skipped).toBe(1);
  });
});
