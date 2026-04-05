import "server-only";
import { google } from "googleapis";

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
export async function getCalendarEvents(date: string) {
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

    return (res.data.items ?? []).map((event) => ({
      summary: event.summary ?? "",
      startTime: extractTime(event.start?.dateTime ?? event.start?.date ?? ""),
      endTime: extractTime(event.end?.dateTime ?? event.end?.date ?? ""),
      isAllDay: !event.start?.dateTime,
    }));
  } catch (error) {
    console.error("Google Calendar API error:", error);
    return [];
  }
}

/**
 * ISO 8601 日時文字列から HH:MM を抽出
 */
function extractTime(dateTimeStr: string): string {
  if (!dateTimeStr.includes("T")) return "00:00";
  const timePart = dateTimeStr.split("T")[1];
  return timePart.substring(0, 5);
}
