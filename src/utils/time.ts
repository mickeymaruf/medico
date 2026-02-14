/**
 * Converts days into either seconds or milliseconds.
 *
 * @param days - The number of days to convert
 * @param format - 's' for seconds (Better-Auth config), 'ms' for milliseconds (JS Date/Timestamps)
 */
export const convertDays = (days: number, format: "s" | "ms" = "s"): number => {
  const secondsInADay = 24 * 60 * 60; // 86,400

  if (format === "ms") {
    return days * secondsInADay * 1000;
  }

  return days * secondsInADay;
};
