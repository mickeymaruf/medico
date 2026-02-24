export const convertDateTime = (date: Date) => {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() + offset);
};

// export const bdtToUtc = (date: Date): Date => {
//   const BDT_OFFSET_MS = 6 * 60 * 60 * 1000; // 6 hours
//   return new Date(date.getTime() - BDT_OFFSET_MS);
// };
