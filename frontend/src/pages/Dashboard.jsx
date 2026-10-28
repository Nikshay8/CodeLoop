// pages/Dashboard.jsx
// The main dashboard — shows stats, heatmap, due-today revisions, and overall progress.
// Cards come from components/Card.jsx (a thin border on a soft background), which keeps
// the layered look in dark mode against the page's gray-950 background set in App.jsx.

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ListChecks,
  CheckCircle2,
  CalendarClock,
  Target,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import ActivityHeatmap from '../components/ActivityHeatmap';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import StatCard from '../components/StatCard';
import api from '../services/api';
import { getUserTimeZone } from '../utils/dateUtils';

// The blue call-to-action button, used in the empty states
const BUTTON_CLASS =
  'group inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-500 active:scale-[0.98]';

// How many due problems the card lists before it says "View all"
const MAX_DUE_SHOWN = 6;

// "Good morning" / "Good afternoon" / "Good evening" based on the browser's clock
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

// The loading placeholder: the same shape as the real dashboard, built from grey blocks
function DashboardSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="mt-3 h-4 w-48" />

      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>

      <Skeleton className="mt-6 h-56 rounded-2xl" />

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Skeleton className="h-72 rounded-2xl lg:col-span-3" />
        <Skeleton className="h-72 rounded-2xl lg:col-span-2" />
      </div>
    </div>
  );
}

function Dashboard() {
  // Stats object from backend: totalProblems, totalSolved, heatmapData, topicStats
  const [stats, setStats] = useState(null);

  // Problems due for revision today
  const [dueToday, setDueToday] = useState([]);

  // The user's first name for the greeting (stays '' if the profile request fails)
  const [firstName, setFirstName] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // The topic progress bars start at 0% and grow to their real width once this turns true,
  // which is what makes them animate when the page opens
  const [barsReady, setBarsReady] = useState(false);

  // Loads the dashboard data. It is a function of its own (not inside useEffect) so the
  // "Try again" button on the error card can call it too.
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      // Send the browser's timezone so the backend groups heatmap dates by the
      // user's own calendar days (fixes solves after midnight IST landing on
      // the previous day's box). Example request: /progress/stats?tz=Asia/Kolkata
      const statsResponse = await api.get('/progress/stats', {
        ...config,
        params: { tz: getUserTimeZone() },
      });
      const dueTodayResponse = await api.get('/progress/due-today', config);

      setStats(statsResponse.data);
      setDueToday(dueTodayResponse.data);
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch dashboard data once, when the component first loads
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Fetch the user's name for the greeting. This is separate from the main data on purpose:
  // if it fails, the dashboard still works and the greeting just has no name.
  useEffect(() => {
    const fetchName = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await api.get('/auth/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });

        // "Nikshay Garg" -> "Nikshay"
        setFirstName((response.data.name || '').trim().split(' ')[0]);
      } catch (err) {
        // Ignored: no name, plain greeting
      }
    };

    fetchName();
  }, []);

  // Once the data is on screen, wait a moment and then let the progress bars grow.
  // (The short delay lets the browser paint the 0% state first, so there is something to animate from.)
  useEffect(() => {
    if (loading || !stats) return;

    const timer = setTimeout(() => setBarsReady(true), 50);

    // Cleanup: cancel the timer if the page closes first
    return () => clearTimeout(timer);
  }, [loading, stats]);

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
            <AlertCircle className="h-5 w-5" />
          </span>
          <p className="text-sm text-gray-700 dark:text-gray-300">{error}</p>
          <button
            type="button"
            onClick={loadData}
            className="rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 transition hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-[0.98]"
          >
            Try again
          </button>
        </Card>
      </div>
    );
  }

  // ---------- Numbers derived from the stats ----------
  // Share of all tracked problems that are solved, as a whole number (0 when there are none)
  const completion =
    stats.totalProblems > 0 ? Math.round((stats.totalSolved / stats.totalProblems) * 100) : 0;

  const visibleDue = dueToday.slice(0, MAX_DUE_SHOWN);
  const hiddenDueCount = dueToday.length - visibleDue.length;

  // The line under the greeting changes with the situation
  let summary = "You're all caught up for today.";
  if (stats.totalProblems === 0) {
    summary = 'Add your first problems to get started.';
  } else if (dueToday.length > 0) {
    summary = `You have ${dueToday.length} problem${dueToday.length === 1 ? '' : 's'} to revise today.`;
  }

  return (
    // animate-fade-up (defined in tailwind.config.js): the page fades in when it opens
    <div className="animate-fade-up motion-reduce:animate-none max-w-6xl mx-auto px-6 py-8">
      {/* ----- Greeting ----- */}
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
        {getGreeting()}
        {firstName && `, ${firstName}`}
      </h1>
      <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">{summary}</p>

      {/* Shown only when the user has no problems tracked yet */}
      {stats.totalProblems === 0 && (
        <Card className="mt-6 flex flex-col gap-4 border-blue-200 bg-gradient-to-b from-blue-50 to-white p-6 dark:border-blue-900/60 dark:from-blue-950/50 dark:to-gray-900/40 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              You haven't added any problems yet
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Select a sheet or add your own problems, and your revisions will be scheduled automatically.
            </p>
          </div>
          <Link to="/problems" className={`${BUTTON_CLASS} shrink-0`}>
            Go to Problems
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Card>
      )}

      {/* ----- Overview cards: 2 per row on phones, 4 in a row on large screens ----- */}
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={ListChecks} label="Total Problems" value={stats.totalProblems} tone="blue" />
        <StatCard icon={CheckCircle2} label="Solved" value={stats.totalSolved} tone="green" />
        {/* The Due card turns amber when something is waiting, grey-blue when nothing is */}
        <StatCard
          icon={CalendarClock}
          label="Due Today"
          value={dueToday.length}
          tone={dueToday.length > 0 ? 'amber' : 'blue'}
        />
        <StatCard icon={Target} label="Completion" value={`${completion}%`} tone="violet" />
      </div>

      {/* ----- Heatmap card — the heatmap itself lives in its own reusable component ----- */}
      <Card className="mt-6 p-6">
        <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">Activity Heatmap</h2>
        <ActivityHeatmap data={stats.heatmapData} />
      </Card>

      {/* ----- Due today + topic progress -----
          On phones the Due card comes first (it is the thing to act on). On large screens
          lg:order-* swaps them so the wide topic list sits on the left. */}
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-5">
        {/* Due-today card */}
        <Card className="p-6 lg:order-2 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Due for Revision Today
            </h2>
            {dueToday.length > 0 && (
              <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                {dueToday.length}
              </span>
            )}
          </div>

          {dueToday.length === 0 ? (
            // Empty state: a green tick and a hint about what to do next
            <div className="flex flex-col items-center py-6 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <p className="mt-3 text-sm font-medium text-gray-900 dark:text-gray-100">Nothing due today</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Solve a problem and its first revision gets scheduled for you.
              </p>
            </div>
          ) : (
            <>
              {/* -mx-3 lets the hover background reach slightly past the text on both sides */}
              <ul className="-mx-3 space-y-1">
                {visibleDue.map((entry) => {
                  const problem = entry.problemId;

                  // Topic and difficulty are shown only when the backend sent them
                  const details = problem ? [problem.topic, problem.difficulty].filter(Boolean).join(' • ') : '';

                  return (
                    <li key={entry._id}>
                      <Link
                        to="/revision"
                        className="group flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                            {problem ? problem.title : 'Unknown problem'}
                          </p>
                          {details && (
                            <p className="truncate text-xs text-gray-500 dark:text-gray-400">{details}</p>
                          )}
                        </div>
                        <ArrowRight className="h-4 w-4 shrink-0 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-blue-500 dark:text-gray-600" />
                      </Link>
                    </li>
                  );
                })}
              </ul>

              {/* One link to the full Revision page, with the number of problems not listed above */}
              <Link
                to="/revision"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                {hiddenDueCount > 0 ? `View all ${dueToday.length} problems` : 'Open Revision'}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          )}
        </Card>

        {/* Topic-wise progress card */}
        <Card className="p-6 lg:order-1 lg:col-span-3">
          <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">Progress by Topic</h2>

          {Object.keys(stats.topicStats).length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No problems added yet. Select a sheet to get started.
            </p>
          ) : (
            <div className="space-y-4">
              {/* Object.entries converts { "Array": {...} } into [["Array", {...}]] so we can loop over it */}
              {Object.entries(stats.topicStats).map(([topic, data]) => {
                // Percentage solved in this topic (0 when the topic has no problems)
                const percent = data.total > 0 ? Math.round((data.solved / data.total) * 100) : 0;
                const isComplete = data.total > 0 && data.solved === data.total;

                return (
                  <div key={topic}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                        {topic}
                        {isComplete && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400">
                        {data.solved} / {data.total}
                      </span>
                    </div>

                    {/* The track (grey) with the fill (blue, or green when the topic is finished) inside it.
                        The fill's width goes from 0 to its real value when barsReady becomes true. */}
                    <div
                      role="progressbar"
                      aria-label={`${topic} progress`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={percent}
                      className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"
                    >
                      <div
                        style={{ width: `${barsReady ? percent : 0}%` }}
                        className={`h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none ${
                          isComplete ? 'bg-emerald-500' : 'bg-blue-500'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default Dashboard;