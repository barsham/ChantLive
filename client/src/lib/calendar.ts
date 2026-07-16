export type CalendarEventDetails = {
  title: string;
  scheduledAt: Date | string;
  durationMinutes?: number | null;
  location?: string | null;
  description?: string | null;
  uid: string;
};

function escapeCalendarText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function formatCalendarDate(value: Date) {
  return value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function getCalendarRange(details: CalendarEventDetails) {
  const start = new Date(details.scheduledAt);
  if (Number.isNaN(start.getTime())) return null;

  const durationMinutes = Math.max(15, details.durationMinutes ?? 120);
  return {
    start,
    end: new Date(start.getTime() + durationMinutes * 60_000),
  };
}

export function buildGoogleCalendarUrl(details: CalendarEventDetails) {
  const range = getCalendarRange(details);
  if (!range) return null;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: details.title,
    dates: `${formatCalendarDate(range.start)}/${formatCalendarDate(range.end)}`,
  });
  if (details.description) params.set("details", details.description);
  if (details.location) params.set("location", details.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildOutlookCalendarUrl(details: CalendarEventDetails) {
  const range = getCalendarRange(details);
  if (!range) return null;

  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: details.title,
    startdt: range.start.toISOString(),
    enddt: range.end.toISOString(),
  });
  if (details.description) params.set("body", details.description);
  if (details.location) params.set("location", details.location);
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

function calendarFilename(title: string) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "chantlive-event";
  return `${slug}.ics`;
}

export function buildCalendarFile(details: CalendarEventDetails) {
  const range = getCalendarRange(details);
  if (!range) return null;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ChantLive//Event Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeCalendarText(details.uid)}`,
    `DTSTAMP:${formatCalendarDate(new Date())}`,
    `DTSTART:${formatCalendarDate(range.start)}`,
    `DTEND:${formatCalendarDate(range.end)}`,
    `SUMMARY:${escapeCalendarText(details.title)}`,
    ...(details.location ? [`LOCATION:${escapeCalendarText(details.location)}`] : []),
    ...(details.description ? [`DESCRIPTION:${escapeCalendarText(details.description)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return `${lines.join("\r\n")}\r\n`;
}

export function downloadCalendarFile(details: CalendarEventDetails) {
  const contents = buildCalendarFile(details);
  if (!contents) return false;

  const blob = new Blob([contents], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = calendarFilename(details.title);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return true;
}
