// pages/Revision.jsx
// The revision schedule: problems due now at the top, and every upcoming
// revision below with how many days away it is.

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, FileText, Check, CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react';
import api from '../services/api';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import NotesModal from '../components/NotesModal';
import { getDaysUntil, formatRevisionLabel, formatShortDate } from '../utils/dateUtils';

// Badge colors for each difficulty (the key is the difficulty text the backend sends)
const LEVEL_STYLES = {
  Easy: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  Hard: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
};

// The schedule has five steps (1, 3, 7, 15 and then every 30 days), shown as five dots
const REVISION_STAGES = 5;

// How many upcoming revisions are listed before the "Show all" button
const UPCOMING_PREVIEW = 8;

// Builds the request settings that carry the login token
const getAuthConfig = () => {
  const token = localStorage.getItem('token');
  return { headers: { Authorization: `Bearer ${token}` } };
};

// Small colored badge with the problem's difficulty (renders nothing if it is missing)
function LevelBadge({ level }) {
  if (!level) return null;

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${LEVEL_STYLES[level] || ''}`}>
      {level}
    </span>
  );
}

// Five dots that show how far along the schedule a problem is.
// Filled dot = a revision already done, ringed dot = the one that is due now, grey = still ahead.
function StageDots({ revisionsDone }) {
  // The dot that is due now (it stays on the last dot once the problem is in the 30-day cycle)
  const currentIndex = Math.min(revisionsDone, REVISION_STAGES - 1);

  return (
    <div
      className="flex items-center gap-1.5"
      role="img"
      aria-label={`${revisionsDone} of ${REVISION_STAGES} schedule steps done`}
      title="Schedule: 1, 3, 7, 15, then every 30 days"
    >
      {Array.from({ length: REVISION_STAGES }).map((_, index) => {
        const isDone = index < revisionsDone;
        const isCurrent = !isDone && index === currentIndex;

        let dotClass = 'bg-gray-200 dark:bg-gray-700';
        if (isDone) dotClass = 'bg-blue-500';
        if (isCurrent) dotClass = 'bg-white dark:bg-gray-900 ring-2 ring-blue-500';

        return <span key={index} className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />;
      })}
    </div>
  );
}

// One problem that is due now: its details and the three actions (solve, notes, mark revised)
function DueCard({ entry, isLeaving, onOpenNotes, onMarkRevised }) {
  const problem = entry.problemId;

  // revisionCount includes the first solve, so revisions done = count - 1
  const revisionsDone = entry.revisionCount - 1;

  // Overdue (past its date) is shown in red, due today in amber
  const isOverdue = getDaysUntil(entry.nextRevisionDate) < 0;

  // True when the user already wrote a note for this problem
  const hasNotes = Boolean(entry.notes && entry.notes.trim());

  return (
    // While isLeaving is true the card fades and shrinks away (the "done" animation).
    // pointer-events-none stops a second click on Mark Revised during that time.
    <Card
      className={`p-5 transition-all duration-300 ease-out motion-reduce:transition-none ${
        isLeaving ? 'pointer-events-none -translate-y-1 scale-95 opacity-0' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{problem.title}</h3>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
            <span>{problem.topic}</span>
            <LevelBadge level={problem.difficulty} />
          </div>
        </div>

        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
            isOverdue
              ? 'bg-red-500/10 text-red-600 dark:text-red-400'
              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
          }`}
        >
          {formatRevisionLabel(entry.nextRevisionDate)}
        </span>
      </div>

      {/* Progress through the schedule + a short text version of it */}
      <div className="mt-4 flex items-center gap-3">
        <StageDots revisionsDone={revisionsDone} />
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {revisionsDone === 0
            ? 'Not revised yet'
            : `Revised ${revisionsDone} time${revisionsDone === 1 ? '' : 's'}`}
        </span>
      </div>

      {/* Actions. On phones the first two share a row and Mark Revised gets its own full-width row
          (w-full forces a new line inside flex-wrap); from "sm" up everything sits in one row. */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <a
          href={problem.link}
          target="_blank"
          rel="noreferrer"
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 transition hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-[0.98] sm:flex-none"
        >
          Solve on LeetCode
          <ExternalLink size={13} />
        </a>

        <button
          onClick={onOpenNotes}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 transition hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-[0.98] sm:flex-none"
        >
          <FileText size={14} />
          Notes
          {/* A small blue dot tells the user a note already exists */}
          {hasNotes && <span className="h-1.5 w-1.5 rounded-full bg-blue-500" aria-label="has notes" />}
        </button>

        <button
          onClick={onMarkRevised}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-500 active:scale-[0.98] sm:ml-auto sm:w-auto"
        >
          <Check size={15} />
          Mark Revised
        </button>
      </div>
    </Card>
  );
}

// The loading placeholder: the same shape as the real page, built from grey blocks
function RevisionSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="mt-3 h-4 w-80 max-w-full" />

      <div className="mt-8 space-y-3">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>

      <Skeleton className="mt-8 h-48 rounded-2xl" />
    </div>
  );
}

function Revision() {
  // Every solved problem with a next revision date, earliest first (sorted by the backend)
  const [schedule, setSchedule] = useState([]);

  // ID of the problem whose notepad is open (null = closed)
  const [activeNoteProblemId, setActiveNoteProblemId] = useState(null);

  // IDs of problems that were just marked revised and are fading out of the "Due now" list
  const [leavingIds, setLeavingIds] = useState([]);

  // How many problems were marked revised since this page was opened (feeds the progress bar).
  // It starts again from 0 when the page is reloaded, so it is a "this session" count.
  const [sessionDone, setSessionDone] = useState(0);

  // Whether the "Upcoming" list shows every entry or only the first few
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // True after the schedule has loaded successfully at least once. It lets us tell
  // "the page could not load at all" (show a full error card) apart from
  // "an action failed" (show a small message above the list).
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchSchedule = useCallback(async () => {
    try {
      const response = await api.get('/progress/revisions', getAuthConfig());
      setSchedule(response.data);
      setError('');
      setHasLoaded(true);
    } catch (err) {
      setError('Failed to load revision schedule');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  // Used by the "Try again" button on the error card
  const handleRetry = () => {
    setLoading(true);
    fetchSchedule();
  };

  // Marking a problem revised pushes its next date further out, so after
  // re-fetching it moves from "Due now" down into "Upcoming".
  // The card starts fading out straight away (before the server answers) so the page feels
  // instant. The progress count is updated at the same moment and rolled back if the request fails.
  const handleMarkRevised = async (problemId) => {
    setError('');
    setLeavingIds((ids) => [...ids, problemId]);
    setSessionDone((count) => count + 1);

    try {
      await api.patch(`/progress/${problemId}/done`, {}, getAuthConfig());
      await fetchSchedule();
    } catch (err) {
      setError('Failed to mark as revised');
      setSessionDone((count) => count - 1);
    } finally {
      setLeavingIds((ids) => ids.filter((id) => id !== problemId));
    }
  };

  const handleSaveNotes = async (problemId, noteText) => {
    try {
      await api.patch(`/progress/${problemId}/notes`, { note: noteText }, getAuthConfig());
      setActiveNoteProblemId(null);
      fetchSchedule();
    } catch (err) {
      setError('Failed to save notes');
    }
  };

  if (loading) return <RevisionSkeleton />;

  // The very first load failed: there is nothing to show, so offer a retry
  if (!hasLoaded && error) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
            <AlertCircle className="h-5 w-5" />
          </span>
          <p className="text-sm text-gray-700 dark:text-gray-300">{error}</p>
          <button
            type="button"
            onClick={handleRetry}
            className="rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 transition hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-[0.98]"
          >
            Try again
          </button>
        </Card>
      </div>
    );
  }

  // Skip entries whose problem no longer exists, then split by today's date.
  // 0 or fewer days away means due now (today or overdue).
  const validEntries = schedule.filter((entry) => entry.problemId);
  const dueEntries = validEntries.filter((entry) => getDaysUntil(entry.nextRevisionDate) <= 0);
  const upcomingEntries = validEntries.filter((entry) => getDaysUntil(entry.nextRevisionDate) > 0);

  // Cards that are fading out no longer count as "still to do"
  const remainingCount = dueEntries.filter(
    (entry) => !leavingIds.includes(entry.problemId._id)
  ).length;

  // Progress for this session: how many are done out of (done + still to do)
  const sessionTotal = sessionDone + remainingCount;
  const sessionPercent = sessionTotal > 0 ? Math.round((sessionDone / sessionTotal) * 100) : 0;

  const visibleUpcoming = showAllUpcoming ? upcomingEntries : upcomingEntries.slice(0, UPCOMING_PREVIEW);
  const hiddenUpcomingCount = upcomingEntries.length - visibleUpcoming.length;

  const activeEntry = schedule.find(
    (entry) => entry.problemId && entry.problemId._id === activeNoteProblemId
  );

  return (
    // animate-fade-up (defined in tailwind.config.js): the page fades in when it opens
    <div className="animate-fade-up motion-reduce:animate-none max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Revision</h1>
      <p className="mt-1.5 mb-6 text-sm text-gray-500 dark:text-gray-400">
        Solved problems come back after 1, 3, 7, 15 and then every 30 days.
      </p>

      {error && (
        <p
          role="alert"
          className="mb-5 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-3.5 py-2.5 text-sm text-red-700 dark:text-red-400"
        >
          {error}
        </p>
      )}

      {validEntries.length === 0 ? (
        // Nothing is scheduled at all: explain where revisions come from
        <Card className="flex flex-col items-center p-10 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <RefreshCw className="h-5 w-5" />
          </span>
          <h2 className="mt-4 text-base font-semibold text-gray-900 dark:text-gray-100">
            No revisions scheduled yet
          </h2>
          <p className="mt-1.5 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            Mark a problem as solved on the Problems page and its next revision date will show up here.
          </p>
          <Link
            to="/problems"
            className="mt-5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-500 active:scale-[0.98]"
          >
            Go to Problems
          </Link>
        </Card>
      ) : (
        <>
          {/* ---------- Session progress ---------- */}
          {/* Shown while there is something to do (or something was just done) */}
          {sessionTotal > 0 && (
            <Card className="mb-8 p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-gray-900 dark:text-gray-100">This session</span>
                <span className="text-gray-500 dark:text-gray-400">
                  {sessionDone} of {sessionTotal} revised
                </span>
              </div>
              <div
                role="progressbar"
                aria-label="Revision progress for this session"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={sessionPercent}
                className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800"
              >
                <div
                  style={{ width: `${sessionPercent}%` }}
                  className="h-full rounded-full bg-blue-500 transition-[width] duration-500 ease-out motion-reduce:transition-none"
                />
              </div>
            </Card>
          )}

          {/* ---------- Due now ---------- */}
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Due now
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium normal-case tracking-normal text-amber-600 dark:text-amber-400">
              {dueEntries.length}
            </span>
          </h2>

          {dueEntries.length === 0 ? (
            // Everything is done: a green tick, a note about this session and what comes next
            <Card className="mb-8 flex flex-col items-center p-8 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-gray-900 dark:text-gray-100">
                You're all caught up
              </h3>
              <p className="mt-1.5 max-w-sm text-sm text-gray-500 dark:text-gray-400">
                {sessionDone > 0
                  ? `You revised ${sessionDone} problem${sessionDone === 1 ? '' : 's'} this session. `
                  : 'Nothing is due right now. '}
                {upcomingEntries.length > 0 &&
                  `Next revision: ${upcomingEntries[0].problemId.title} (${formatRevisionLabel(
                    upcomingEntries[0].nextRevisionDate
                  )}).`}
              </p>
            </Card>
          ) : (
            <div className="mb-8 space-y-3">
              {dueEntries.map((entry) => (
                <DueCard
                  key={entry._id}
                  entry={entry}
                  isLeaving={leavingIds.includes(entry.problemId._id)}
                  onOpenNotes={() => setActiveNoteProblemId(entry.problemId._id)}
                  onMarkRevised={() => handleMarkRevised(entry.problemId._id)}
                />
              ))}
            </div>
          )}

          {/* ---------- Upcoming ---------- */}
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Upcoming
            <span className="rounded-full bg-gray-500/10 px-2 py-0.5 text-xs font-medium normal-case tracking-normal text-gray-600 dark:text-gray-400">
              {upcomingEntries.length}
            </span>
          </h2>

          {upcomingEntries.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No upcoming revisions.</p>
          ) : (
            <Card className="divide-y divide-gray-100 dark:divide-gray-800 overflow-hidden">
              {visibleUpcoming.map((entry) => (
                <div key={entry._id} className="flex items-center justify-between gap-3 px-4 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                      {entry.problemId.title}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                      <span>{entry.problemId.topic}</span>
                      <LevelBadge level={entry.problemId.difficulty} />
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {formatRevisionLabel(entry.nextRevisionDate)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatShortDate(entry.nextRevisionDate)}
                    </p>
                  </div>
                </div>
              ))}

              {/* A long schedule would make the page very tall, so it is cut short with a button.
                  The button stays after expanding so the list can be collapsed again. */}
              {upcomingEntries.length > UPCOMING_PREVIEW && (
                <button
                  type="button"
                  onClick={() => setShowAllUpcoming(!showAllUpcoming)}
                  className="w-full px-4 py-3 text-center text-sm font-medium text-blue-600 dark:text-blue-400 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60"
                >
                  {showAllUpcoming ? 'Show less' : `Show all ${upcomingEntries.length} (${hiddenUpcomingCount} more)`}
                </button>
              )}
            </Card>
          )}
        </>
      )}

      {activeEntry && (
        <NotesModal
          key={activeEntry._id}
          problemTitle={activeEntry.problemId.title}
          initialNotes={activeEntry.notes}
          onSave={(text) => handleSaveNotes(activeEntry.problemId._id, text)}
          onClose={() => setActiveNoteProblemId(null)}
        />
      )}
    </div>
  );
}

export default Revision;