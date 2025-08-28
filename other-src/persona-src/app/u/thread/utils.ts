import { format, isToday, isYesterday, differenceInDays } from "date-fns";

export const formatDuration = (durationSecs: number) => {
  if (durationSecs < 60) {
    return `${durationSecs}s`;
  }

  if (durationSecs < 3600) {
    return `${Math.floor(durationSecs / 60)}m`;
  }

  const hours = Math.floor(durationSecs / 3600);
  const minutes = Math.floor((durationSecs % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

export function formatMessageDateSection(date: Date | string): string {
  const parsedDate = typeof date === "string" ? new Date(date) : date;
  const localDate = new Date(parsedDate.getTime());
  if (isToday(localDate)) {
    return "Today";
  } else if (isYesterday(localDate)) {
    return "Yesterday";
  } else if (differenceInDays(new Date(), localDate) <= 7) {
    return format(localDate, "EEEE");
  } else {
    return format(localDate, "dd/MM/yy");
  }
}
