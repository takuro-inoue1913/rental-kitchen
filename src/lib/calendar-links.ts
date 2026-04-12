type CalendarLinkParams = {
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:MM" or "HH:MM:SS"
  endTime: string; // "HH:MM" or "HH:MM:SS"
  title: string;
  location: string;
  description?: string;
};

/**
 * Google Calendar / Outlook 用の「カレンダーに追加」URLを生成する。
 */
export function buildCalendarLinks(params: CalendarLinkParams): {
  google: string;
  outlook: string;
} {
  const { date, startTime, endTime, title, location, description = "" } =
    params;

  const hhmm = (t: string) => t.slice(0, 5).replace(":", "");
  const dateCompact = date.replace(/-/g, "");

  // Google Calendar: YYYYMMDDTHHmmss 形式 + ctz で Asia/Tokyo を指定
  const googleStart = `${dateCompact}T${hhmm(startTime)}00`;
  const googleEnd = `${dateCompact}T${hhmm(endTime)}00`;
  const googleUrl = new URL(
    "https://calendar.google.com/calendar/render"
  );
  googleUrl.searchParams.set("action", "TEMPLATE");
  googleUrl.searchParams.set("text", title);
  googleUrl.searchParams.set("dates", `${googleStart}/${googleEnd}`);
  googleUrl.searchParams.set("ctz", "Asia/Tokyo");
  googleUrl.searchParams.set("location", location);
  if (description) {
    googleUrl.searchParams.set("details", description);
  }

  // Outlook: ISO 8601 (+09:00) 形式
  const hhmm2 = (t: string) => t.slice(0, 5);
  const outlookStart = `${date}T${hhmm2(startTime)}:00+09:00`;
  const outlookEnd = `${date}T${hhmm2(endTime)}:00+09:00`;
  const outlookUrl = new URL(
    "https://outlook.live.com/calendar/0/action/compose"
  );
  outlookUrl.searchParams.set("rru", "addevent");
  outlookUrl.searchParams.set("subject", title);
  outlookUrl.searchParams.set("startdt", outlookStart);
  outlookUrl.searchParams.set("enddt", outlookEnd);
  outlookUrl.searchParams.set("location", location);
  if (description) {
    outlookUrl.searchParams.set("body", description);
  }

  return {
    google: googleUrl.toString(),
    outlook: outlookUrl.toString(),
  };
}
