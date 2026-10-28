// pages/Analytics.jsx
// Shows how the user's practice is going: summary cards (solved, streaks, active days),
// the solving activity over the last 30 / 90 / 365 days, and the progress in every topic.
//
// Dark mode note: Recharts renders SVG, which can't use Tailwind's dark: variants.
// So axis/grid colors use `currentColor` (inherited from the wrapper's text color class),
// and the tooltip + muted bar read CSS variables defined in index.css.

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { CheckCircle2, Flame, Trophy, CalendarDays, AlertCircle, BarChart3 } from 'lucide-react';
import api from '../services/api';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import StatCard from '../components/StatCard';
import { getUserTimeZone } from '../utils/dateUtils';

// Tooltip box styling, driven by CSS variables so it adapts to light/dark mode
const tooltipStyle = {
  backgroundColor: 'var(--chart-tooltip-bg)',
  border: '1px solid var(--chart-tooltip-border)',
  borderRadius: 8,
  color: 'var(--chart-tooltip-text)',
};

// The time ranges the activity chart can show
const RANGE_OPTIONS = [
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: 365, label: '1 year' },
];

// ---------- Date helpers ----------
// The backend sends activity as { "2026-10-15": 2 }: one key per calendar day, in the
// user's own timezone. These helpers build and read keys of the same shape.

// Builds the "YYYY-MM-DD" key of a day, from the browser's local calendar
// (toISOString() would give the UTC day, which can be yesterday or tomorrow)
const toDateKey = (date) => {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mm}-${dd}`;
};

// Reads a "YYYY-MM-DD" key as a local date.
// (new Date("2026-10-15") would be read as UTC and could show the previous day.)
const parseDateKey = (key) => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// A new date that is `days` days after the given one (use a negative number to go back)
const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// "15 Oct" — the label under the chart's x-axis
const formatTick = (key) =>
  parseDateKey(key).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

// "Wed, 15 Oct 2026" — the title of the tooltip
const formatTooltipDate = (key) =>
  parseDateKey(key).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

// ---------- Numbers derived from the activity data ----------

// A streak is a run of days in a row with at least one solved problem.
// - current: the run that ends today. If today has nothing yet, the run that ends
//            yesterday still counts (the streak is only lost once a whole day passes).
// - best:    the longest run in the data.
// - activeDays: how many days have at least one solved problem.
const calculateStreaks = (heatmapData) => {
  // Days with activity, oldest first ("YYYY-MM-DD" keys sort correctly as plain text)
  const activeKeys = Object.keys(heatmapData)
    .filter((key) => heatmapData[key] > 0)
    .sort();

  if (activeKeys.length === 0) return { current: 0, best: 0, activeDays: 0 };

  // Best streak: walk through the days; a day continues the run when it is exactly
  // one day after the previous one, otherwise a new run starts
  let best = 1;
  let run = 1;
  for (let i = 1; i < activeKeys.length; i++) {
    const dayAfterPrevious = toDateKey(addDays(parseDateKey(activeKeys[i - 1]), 1));
    run = activeKeys[i] === dayAfterPrevious ? run + 1 : 1;
    best = Math.max(best, run);
  }

  // Current streak: count backwards from today (or from yesterday if today is still empty)
  const activeSet = new Set(activeKeys);
  let cursor = new Date();
  if (!activeSet.has(toDateKey(cursor))) cursor = addDays(cursor, -1);

  let current = 0;
  while (activeSet.has(toDateKey(cursor))) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  return { current, best, activeDays: activeKeys.length };
};

// One point per calendar day for the last `days` days, INCLUDING the days with nothing solved
// (count 0). Without those zeros a line would jump straight from one active day to the next,
// which makes a quiet month look as busy as a busy one.
const buildActivitySeries = (heatmapData, days) => {
  const today = new Date();
  const series = [];

  for (let i = days - 1; i >= 0; i--) {
    const key = toDateKey(addDays(today, -i));
    series.push({ date: key, count: heatmapData[key] || 0 });
  }

  return series;
};

// Shortens a long topic name for a small screen: "Advanced Graphs and Trees" -> "Advanced Grap…"
const shorten = (text, maxLength) =>
  text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;

// Tells whether the screen is narrower than the "sm" breakpoint (640px).
// Recharts draws SVG, which Tailwind's responsive classes cannot reach,
// so the chart's sizes have to be chosen in JavaScript.
function useIsMobile() {
  const query = '(max-width: 639px)';
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const update = () => setIsMobile(mediaQuery.matches);

    update();
    mediaQuery.addEventListener('change', update);

    // Cleanup: stop listening when the page closes
    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  return isMobile;
}

// The box shown when the user hovers (or taps) a topic's bar: "Arrays & Hashing — 5 of 9 solved"
function TopicTooltip({ active, payload }) {
  if (!active || !payload || payload.length === 0) return null;

  const { topic, solved, total } = payload[0].payload;

  return (
    <div style={tooltipStyle} className="px-3 py-2 text-sm shadow-lg">
      <p className="font-medium">{topic}</p>
      <p className="opacity-80">
        {solved} of {total} solved
      </p>
    </div>
  );
}

// The loading placeholder: the same shape as the real page, built from grey blocks
function AnalyticsSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="mt-3 h-4 w-56" />

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>

      <Skeleton className="mt-6 h-80 rounded-2xl" />
      <Skeleton className="mt-6 h-96 rounded-2xl" />
    </div>
  );
}

function Analytics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // How many days the activity chart shows (30, 90 or 365)
  const [rangeDays, setRangeDays] = useState(30);

  const isMobile = useIsMobile();

  // Loads the stats. It is a function of its own (not inside useEffect) so the
  // "Try again" button on the error card can call it too.
  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      // Send the browser's timezone so the "activity over time" dates match the
      // user's own calendar days (same fix as the Dashboard heatmap)
      const response = await api.get('/progress/stats', {
        ...config,
        params: { tz: getUserTimeZone() },
      });
      setStats(response.data);
    } catch (err) {
      setError('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) return <AnalyticsSkeleton />;

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
            <AlertCircle className="h-5 w-5" />
          </span>
          <p className="text-sm text-gray-700 dark:text-gray-300">{error}</p>
          <button
            type="button"
            onClick={fetchStats}
            className="rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 transition hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-[0.98]"
          >
            Try again
          </button>
        </Card>
      </div>
    );
  }

  // ---------- Summary numbers ----------
  const { current: currentStreak, best: bestStreak, activeDays } = calculateStreaks(stats.heatmapData);

  // ---------- Activity chart data ----------
  const hasActivity = Object.keys(stats.heatmapData).length > 0;
  const activitySeries = buildActivitySeries(stats.heatmapData, rangeDays);
  const solvedInRange = activitySeries.reduce((sum, point) => sum + point.count, 0);
  const rangeLabel = RANGE_OPTIONS.find((option) => option.days === rangeDays).label;

  // ---------- Topic chart data ----------
  // Convert topicStats { "Array": {solved: 2, total: 3} } into an array, because Recharts needs
  // an array of objects to plot a chart. "remaining" is what is left to solve: each topic is ONE
  // bar whose full length is the topic's total and whose blue part is what is already solved.
  const topicChartData = Object.entries(stats.topicStats).map(([topic, data]) => ({
    topic,
    solved: data.solved,
    remaining: data.total - data.solved,
    total: data.total,
  }));

  // The topic chart is horizontal: topic names run down the left side, where long names
  // are easy to read (tilted names under a bar chart were hard to read and cramped on a phone).
  // Its height grows with the number of topics, so every row has room.
  const topicChartHeight = Math.max(220, topicChartData.length * 34 + 30);
  const longestTopicLength = Math.max(0, ...topicChartData.map((item) => item.topic.length));
  const topicLabelMaxChars = isMobile ? 14 : 28;
  const yAxisWidth = isMobile ? 92 : Math.min(200, Math.max(110, longestTopicLength * 6.5));

  // The subtitle's two numbers both come from the topic data, so they always agree with the chart
  const totalTopicProblems = topicChartData.reduce((sum, item) => sum + item.total, 0);
  const solvedInTopics = topicChartData.reduce((sum, item) => sum + item.solved, 0);

  return (
    // animate-fade-up (defined in tailwind.config.js): the page fades in when it opens
    <div className="animate-fade-up motion-reduce:animate-none max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Analytics</h1>
      <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">How your practice is going.</p>

      {/* ----- Summary cards: 2 per row on phones, 4 in a row on large screens ----- */}
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={CheckCircle2} label="Problems solved" value={stats.totalSolved} tone="green" />
        <StatCard icon={Flame} label="Current streak (days)" value={currentStreak} tone="amber" />
        <StatCard icon={Trophy} label="Best streak (days)" value={bestStreak} tone="violet" />
        <StatCard icon={CalendarDays} label="Active days" value={activeDays} tone="blue" />
      </div>

      {/* ----- Activity over time ----- */}
      <Card className="mt-6 p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Solving Activity Over Time
            </h2>
            {hasActivity && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {solvedInRange} solved in the last {rangeLabel}
              </p>
            )}
          </div>

          {/* Range buttons: exactly one is selected at a time */}
          {hasActivity && (
            <div className="flex gap-1.5">
              {RANGE_OPTIONS.map((option) => {
                const isActive = rangeDays === option.days;

                return (
                  <button
                    key={option.days}
                    onClick={() => setRangeDays(option.days)}
                    aria-pressed={isActive}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition active:scale-95 ${
                      isActive
                        ? 'border-blue-600 bg-blue-600 text-white shadow-sm shadow-blue-600/25'
                        : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {!hasActivity ? (
          // Nothing solved yet: say so, and point to the page where solving starts
          <div className="flex flex-col items-center py-10 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <BarChart3 className="h-5 w-5" />
            </span>
            <p className="mt-4 text-sm font-medium text-gray-900 dark:text-gray-100">No activity yet</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Solve your first problem and your activity will show up here.
            </p>
            <Link
              to="/problems"
              className="mt-5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-500 active:scale-[0.98]"
            >
              Go to Problems
            </Link>
          </div>
        ) : (
          // This wrapper sets the text color that currentColor (axes, grid) picks up
          <div className="text-gray-500 dark:text-gray-400">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={activitySeries} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                {/* The soft blue fade under the line: strong at the top, fully transparent at the bottom */}
                <defs>
                  <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.2} vertical={false} />

                {/* preserveStartEnd + minTickGap: show the first and last date, and only as many
                    in between as fit without touching each other */}
                <XAxis
                  dataKey="date"
                  tickFormatter={formatTick}
                  interval="preserveStartEnd"
                  minTickGap={32}
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  stroke="currentColor"
                />
                <YAxis
                  allowDecimals={false}
                  width={32}
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  stroke="currentColor"
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: 'var(--chart-tooltip-text)' }}
                  labelFormatter={formatTooltipDate}
                  formatter={(value) => [`${value} problem${value === 1 ? '' : 's'}`, 'Solved']}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#activityFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* ----- Topic-wise progress ----- */}
      <Card className="mt-6 p-5 sm:p-6">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Problems Solved by Topic
          </h2>
          {topicChartData.length > 0 && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {solvedInTopics} of {totalTopicProblems} across {topicChartData.length} topic
              {topicChartData.length === 1 ? '' : 's'}
            </p>
          )}
        </div>

        {topicChartData.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <BarChart3 className="h-5 w-5" />
            </span>
            <p className="mt-4 text-sm font-medium text-gray-900 dark:text-gray-100">No data yet</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Select a sheet and start solving.
            </p>
          </div>
        ) : (
          <div className="text-gray-500 dark:text-gray-400">
            <ResponsiveContainer width="100%" height={topicChartHeight}>
              {/* layout="vertical" turns the chart sideways: the bars run left to right and the topic
                  names go on the vertical axis. That is why XAxis is the number axis here and YAxis
                  holds the names (the opposite of a normal bar chart). */}
              <BarChart
                data={topicChartData}
                layout="vertical"
                margin={{ top: 0, right: 12, left: 0, bottom: 0 }}
                barCategoryGap={8}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.2} horizontal={false} />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  stroke="currentColor"
                />
                {/* interval={0} shows EVERY topic name (by default Recharts hides names that would
                    overlap). On a phone the names are cut short; the tooltip shows the full name. */}
                <YAxis
                  type="category"
                  dataKey="topic"
                  width={yAxisWidth}
                  interval={0}
                  tickFormatter={(topic) => shorten(topic, topicLabelMaxChars)}
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  stroke="currentColor"
                />
                <Tooltip content={<TopicTooltip />} cursor={{ fill: 'currentColor', fillOpacity: 0.08 }} />

                {/* Two bars with the same stackId are drawn end to end as ONE bar:
                    the solved part (blue) followed by what is still remaining (grey) */}
                <Bar dataKey="solved" stackId="topic" fill="#3b82f6" name="Solved" radius={[4, 0, 0, 4]} />
                <Bar
                  dataKey="remaining"
                  stackId="topic"
                  fill="var(--chart-bar-muted)"
                  name="Remaining"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
    </div>
  );
}

export default Analytics;