// utils/dateUtils.js
// Small helpers for showing revision dates in a human-friendly way,
// e.g. "Tomorrow", "In 3 days", "Overdue by 2 days".

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Returns the browser's IANA timezone name, e.g. "Asia/Kolkata".
// We send this to the backend with stats requests so it can group the heatmap
// by calendar day in the USER's timezone instead of UTC.
// Falls back to "UTC" in the rare case the browser can't tell us.
export const getUserTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch (error) {
    return 'UTC';
  }
};

// Drops the time portion so we compare calendar days, not exact moments
const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

// Whole calendar days from today until the given date.
// 0 = today, positive = in the future, negative = overdue.
export const getDaysUntil = (date) => {
  // Math.round absorbs the 1-hour difference around daylight-saving changes
  return Math.round((startOfDay(date) - startOfDay(new Date())) / MS_PER_DAY);
};

// Turns a revision date into a label like "Due today" or "In 3 days"
export const formatRevisionLabel = (date) => {
  const days = getDaysUntil(date);

  if (days < 0) {
    const overdue = Math.abs(days);
    return `Overdue by ${overdue} day${overdue === 1 ? '' : 's'}`;
  }
  if (days === 0) return 'Due today';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
};

// Short calendar date, e.g. "12 Oct"
export const formatShortDate = (date) => {
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};