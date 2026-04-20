export const CAMBODIA_TIMEZONE = "Asia/Phnom_Penh";

function formatDateParts(parts: Intl.DateTimeFormatPart[]) {
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type === "literal") continue;
    map[part.type] = part.value;
  }

  const year = map.year;
  const month = map.month;
  const day = map.day;
  const hour = map.hour;
  const minute = map.minute;
  const second = map.second;

  if (!year || !month || !day || !hour || !minute || !second) return null;
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

export function formatCambodiaDateTime(date: Date): string {
  try {
    const dtf = new Intl.DateTimeFormat("en-CA", {
      timeZone: CAMBODIA_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const formatted = formatDateParts(dtf.formatToParts(date));
    if (formatted) return formatted;
  } catch {
    // ignore and fallback
  }

  return date.toISOString();
}

export function getCambodiaNowString(now = new Date()): string {
  return formatCambodiaDateTime(now);
}

export function normalizeCambodiaTimeString(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) return formatCambodiaDateTime(value);

  const raw = String(value).trim();
  if (!raw) return "";

  const looksIso =
    raw.includes("T") ||
    raw.endsWith("Z") ||
    /[+-]\d{2}:?\d{2}$/.test(raw);

  if (!looksIso) return raw;

  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return raw;

  return formatCambodiaDateTime(dt);
}

