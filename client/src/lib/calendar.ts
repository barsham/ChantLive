type CalendarEventDetails = {
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

function calendarFilename(title: string) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "chantlive-event";
  return `${slug}.ics`;
}

export function buildCalendarFile(details: CalendarEventDetails) {
  const start = new Date(details.scheduledAt);
  if (Number.isNaN(start.getTime())) return null;

  const durationMinutes = Math.max(15, details.durationMinutes ?? 120);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ChantLive//Event Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeCalendarText(details.uid)}`,
    `DTSTAMP:${formatCalendarDate(new Date())}`,
    `DTSTART:${formatCalendarDate(start)}`,
    `DTEND:${formatCalendarDate(end)}`,
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
