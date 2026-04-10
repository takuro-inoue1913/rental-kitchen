import "server-only";
import { google } from "googleapis";
import { extractTime, resolveEndTime } from "./time-utils";
import type { CalendarEvent } from "./types";

export type { CalendarEvent };

const SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"];

function getAuth() {
  return new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: SCOPES,
  });
}

const calendar = google.calendar({ version: "v3", auth: getAuth() });

/**
 * 指定日の Google カレンダーイベント（予約）を取得する
 */
export async function getCalendarEvents(
  date: string,
): Promise<CalendarEvent[]> {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  if (!calendarId) return [];

  const timeMin = `${date}T00:00:00+09:00`;
  const timeMax = `${date}T23:59:59+09:00`;

  try {
    const res = await calendar.events.list({
      calendarId,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: "startTime",
    });

    return (res.data.items ?? []).map((event) => {
      const startDt = event.start?.dateTime ?? event.start?.date ?? "";
      const endDt = event.end?.dateTime ?? event.end?.date ?? "";

      return {
        summary: event.summary ?? "",
        startTime: extractTime(startDt),
        endTime: resolveEndTime(startDt, endDt),
        isAllDay: !event.start?.dateTime,
      };
    });
  } catch (error) {
    console.error("Google Calendar API error:", error);
    return [];
  }
}

/**
 * 指定期間の Google カレンダーイベントを日付ごとにグループ化して返す。
 * 1回の API コールで月分のデータを取得できる。
 */
export async function getCalendarEventsForRange(
  startDate: string,
  endDate: string,
): Promise<Record<string, CalendarEvent[]>> {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  if (!calendarId) return {};

  const timeMin = `${startDate}T00:00:00+09:00`;
  const timeMax = `${endDate}T23:59:59+09:00`;

  try {
    const res = await calendar.events.list({
      calendarId,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: "startTime",
    });

    const result: Record<string, CalendarEvent[]> = {};

    for (const event of res.data.items ?? []) {
      const isAllDay = !event.start?.dateTime;

      if (isAllDay) {
        // 終日イベント: start.date 〜 end.date（exclusive）の各日に割り当て
        const eventStart = event.start?.date ?? "";
        const eventEnd = event.end?.date ?? eventStart;
        let current = eventStart;
        while (current < eventEnd) {
          if (current >= startDate && current <= endDate) {
            if (!result[current]) result[current] = [];
            result[current].push({
              summary: event.summary ?? "",
              startTime: "00:00",
              endTime: "00:00",
              isAllDay: true,
            });
          }
          const [y, mo, da] = current.split("-").map(Number);
          const d = new Date(Date.UTC(y, mo - 1, da));
          d.setUTCDate(d.getUTCDate() + 1);
          current = d.toISOString().slice(0, 10);
        }
      } else {
        // 時間指定イベント: 開始日に割り当て
        const startDt = event.start?.dateTime ?? "";
        const endDt = event.end?.dateTime ?? "";
        const eventDate = startDt.split("T")[0];

        if (!result[eventDate]) result[eventDate] = [];
        result[eventDate].push({
          summary: event.summary ?? "",
          startTime: extractTime(startDt),
          endTime: resolveEndTime(startDt, endDt),
          isAllDay: false,
        });
      }
    }

    return result;
  } catch (error) {
    console.error("Google Calendar API error (range):", error);
    return {};
  }
}
