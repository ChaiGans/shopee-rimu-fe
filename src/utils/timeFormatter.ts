const WIB_TIMEZONE = "Asia/Jakarta";
export const HHMM_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const formatDateToWIBHHmm = (date: Date): string => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: WIB_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
};

export const normalizeClockToWIB = (value?: string): string => {
  if (!value) {
    return "";
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (HHMM_PATTERN.test(trimmed)) {
    return trimmed;
  }

  const parsedDate = new Date(trimmed);
  if (!Number.isNaN(parsedDate.getTime())) {
    return formatDateToWIBHHmm(parsedDate);
  }

  return "";
};