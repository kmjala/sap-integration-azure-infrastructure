// Converts a date string in the format "/Date(1590105600000)/" and ISO duration time to a JavaScript Date object.
function sapDateTimeToUTC(dateStr: string, timeString: string): Date {
  if (dateStr === null || dateStr === undefined) return null;
  const date = sapDateToUTC(dateStr);
  const hours = timeString.replace(/PT(\d+)H(\d+)M(\d+)S/, "$1");
  const minutes = timeString.replace(/PT(\d+)H(\d+)M(\d+)S/, "$2");
  const seconds = timeString.replace(/PT(\d+)H(\d+)M(\d+)S/, "$3");
  date.setUTCHours(parseInt(hours));
  date.setUTCMinutes(parseInt(minutes));
  date.setUTCSeconds(parseInt(seconds));

  return date;
}

// Converts a date string in the format "/Date(1590105600000)/" and ISO duration time to a ISO-8601 date string.
export function sapDateTimeToISOString(
  dateStr: string,
  timeString = "PT0H0M0S",
): string {
  if (dateStr === null || dateStr === undefined) return null;
  return sapDateTimeToUTC(dateStr, timeString).toISOString();
}

// Converts a date string in the format "/Date(1590105600000)/" to a JavaScript Date object.
function sapDateToUTC(dateStr: string): Date {
  if (dateStr === null || dateStr === undefined) return null;
  const miliseconds = parseInt(dateStr.replace("/Date(", "").replace(")/", ""));
  const date = new Date(miliseconds);
  return date;
}

// Converts a date string in the format "yyyymmddhhmmss" to a JavaScript Date object.
export function sapDateStringToUTC(dateStr: string): Date {
  if (dateStr === null || dateStr === undefined) {
    return null;
  }
  if (dateStr.length !== 14) throw new Error(`Invalid date string: ${dateStr}`);
  const year = parseInt(dateStr.substring(0, 4));
  const month = parseInt(dateStr.substring(4, 6));
  const day = parseInt(dateStr.substring(6, 8));
  const hours = parseInt(dateStr.substring(8, 10));
  const minutes = parseInt(dateStr.substring(10, 12));
  const seconds = parseInt(dateStr.substring(12, 14));
  const date = new Date(
    Date.UTC(year, month - 1, day, hours, minutes, seconds),
  );
  return date;
}

// Converts a date string in the format "yyyymmddhhmmss" to ISO-8601 date string.
export function sapDateStringToISOString(dateStr: string): string {
  if (dateStr === null || dateStr === undefined) {
    return null;
  }
  return sapDateStringToUTC(dateStr).toISOString();
}
