// components/ActivityHeatmap.jsx
// A LeetCode-style activity heatmap: the last 12 months, where each month is drawn
// as its own block of week-columns, with a gap between months and a label underneath.
// Built with plain divs + Tailwind (no chart library) so we control the layout fully.

// How many months of history to display
const MONTHS_TO_SHOW = 12;

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Maps a day's problem count to a color class.
// The first color is for light mode, the one after "dark:" is for dark mode.
// Levels: 0, 1, 2, 3-4, 5+ (same ramp style GitHub uses)
const getColorClass = (count) => {
  if (count >= 5) return 'bg-[#216e39] dark:bg-[#39d353]';
  if (count >= 3) return 'bg-[#30a14e] dark:bg-[#26a641]';
  if (count >= 2) return 'bg-[#40c463] dark:bg-[#006d32]';
  if (count >= 1) return 'bg-[#9be9a8] dark:bg-[#0e4429]';
  return 'bg-[#ebedf0] dark:bg-[#2d333b]';
};

// Builds a "YYYY-MM-DD" key for a calendar day — this matches the key format
// the backend uses in heatmapData, so we can look up each day's count directly
const toDateKey = (year, monthIndex, day) => {
  const mm = String(monthIndex + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
};

// Describes each of the last N months: how many days it has, and how many
// empty cells are needed before day 1 so it starts on the correct weekday row
const buildMonths = (today) => {
  const months = [];

  for (let i = MONTHS_TO_SHOW - 1; i >= 0; i--) {
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const year = firstOfMonth.getFullYear();
    const monthIndex = firstOfMonth.getMonth();

    // Day 0 of the next month = the last day of this month
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    // getDay(): 0 = Sunday ... 6 = Saturday. This is how many blank cells come first
    const leadingBlanks = firstOfMonth.getDay();

    months.push({ year, monthIndex, daysInMonth, leadingBlanks });
  }

  return months;
};

// `data` is the heatmapData object from the backend: { "2026-09-15": 2, ... }
function ActivityHeatmap({ data = {} }) {
  const today = new Date();
  const months = buildMonths(today);

  return (
    // overflow-x-auto: on narrow screens the heatmap scrolls sideways instead of breaking the layout
    <div className="overflow-x-auto">
      {/* w-max stops the row from shrinking; gap-3 creates the visible gap between months */}
      <div className="flex gap-3 w-max">
        {months.map(({ year, monthIndex, daysInMonth, leadingBlanks }) => (
          <div key={`${year}-${monthIndex}`} className="flex flex-col items-center gap-2">
            {/* Grid with 7 fixed rows (one per weekday). grid-flow-col fills cells top-to-bottom,
                then moves to the next column — so every column is exactly one week. */}
            <div className="grid grid-flow-col grid-rows-[repeat(7,10px)] auto-cols-[10px] gap-[3px]">
              {/* Invisible placeholder cells so day 1 lands on its correct weekday */}
              {Array.from({ length: leadingBlanks }).map((_, i) => (
                <div key={`blank-${i}`} />
              ))}

              {/* One square per day of the month */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;

                // Days that haven't happened yet are left empty (no square drawn)
                const isFuture = new Date(year, monthIndex, day) > today;
                if (isFuture) return <div key={day} />;

                const dateKey = toDateKey(year, monthIndex, day);
                const count = data[dateKey] || 0;

                return (
                  <div
                    key={day}
                    title={`${dateKey}: ${count} problem(s)`}
                    className={`rounded-[2px] ${getColorClass(count)}`}
                  />
                );
              })}
            </div>

            {/* Month label centered under its block */}
            <span className="text-xs text-gray-500 dark:text-gray-400">{MONTH_NAMES[monthIndex]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ActivityHeatmap;