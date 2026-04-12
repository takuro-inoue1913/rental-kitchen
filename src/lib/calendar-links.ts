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

  // endTime が "24:00" の場合は翌日の "00:00" に繰り上げる
  const resolveEndDate = (d: string, t: string): { date: string; time: string } => {
    const hh = t.slice(0, 2);
    if (hh === "24") {
      const next = new Date(d + "T00:00:00");
      next.setDate(next.getDate() + 1);
      const y = next.getFullYear();
      const m = String(next.getMonth() + 1).padStart(2, "0");
      const dd = String(next.getDate()).padStart(2, "0");
      return { date: `${y}-${m}-${dd}`, time: "00:00" };
    }
    return { date: d, time: t.slice(0, 5) };
  };

  const endResolved = resolveEndDate(date, endTime);

  const hhmm = (t: string) => t.slice(0, 5).replace(":", "");
  const dateCompact = date.replace(/-/g, "");
  const endDateCompact = endResolved.date.replace(/-/g, "");

  // Google Calendar: YYYYMMDDTHHmmss 形式 + ctz で Asia/Tokyo を指定
  const googleStart = `${dateCompact}T${hhmm(startTime)}00`;
  const googleEnd = `${endDateCompact}T${hhmm(endResolved.time)}00`;
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
  const outlookStart = `${date}T${startTime.slice(0, 5)}:00+09:00`;
  const outlookEnd = `${endResolved.date}T${endResolved.time}:00+09:00`;
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
