// pages/Problems.jsx
// Shows the user's problems grouped by topic, in each sheet's own order,
// like NeetCode. Only problems the user has added (via a sheet or a custom
// entry) appear here — never the full global catalog.
//
// Page layout (top to bottom):
//   1. Header        — title, "X of Y solved", and the Add Custom Problem button
//   2. Overview card — sheet chips + "Add sheet" dropdown, overall progress bar,
//                      and a per-difficulty (Easy / Medium / Hard) breakdown
//   3. Toolbar       — search box + filter / random / reset buttons (sticks to the top while scrolling)
//   4. Topic list    — collapsible topic sections (TopicSection)
//
// Features on this page:
// - Add a sheet from the dropdown / hide a sheet with × (progress is KEPT)
// - Search by title or topic, filter by difficulty and status
// - Random problem picker, and a reset-progress button
// - Tick a problem as solved (it updates at once, and a toast offers Undo)
// Everything works for ANY sheet, because it only relies on the generic
// problem fields (title, topic, difficulty, link, sheet, order).

import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Shuffle, Trash2, X, Plus, ListChecks, AlertCircle } from 'lucide-react';
import api from '../services/api';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton';
import Toast from '../components/Toast';
import ConfirmDialog from '../components/ConfirmDialog';
import TopicSection from '../components/TopicSection';
import AddProblemForm from '../components/AddProblemForm';
import NotesModal from '../components/NotesModal';

// Options for the two filter pill groups
const DIFFICULTY_OPTIONS = [
  { value: 'All', label: 'All' },
  { value: 'Easy', label: 'Easy' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Hard', label: 'Hard' },
];
const STATUS_OPTIONS = [
  { value: 'All', label: 'All' },
  { value: 'solved', label: 'Solved' },
  { value: 'unsolved', label: 'Unsolved' },
];

// Difficulty colors for the overview breakdown (same palette as the problem rows)
const difficultyTextClass = {
  Easy: 'text-emerald-600 dark:text-emerald-400',
  Medium: 'text-amber-600 dark:text-amber-400',
  Hard: 'text-rose-600 dark:text-rose-400',
};
const difficultyBarClass = {
  Easy: 'bg-emerald-500',
  Medium: 'bg-amber-500',
  Hard: 'bg-rose-500',
};

// Shared look for the square icon buttons next to the search box.
// h-11 w-11 (44px) matches the height of the search input, so the whole
// toolbar row lines up neatly. Disabled buttons fade out and stop reacting to hover.
const iconButtonClass =
  'relative h-11 w-11 shrink-0 inline-flex items-center justify-center rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 transition hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-gray-900 disabled:active:scale-100';

// The blue main button (Add Custom Problem, and the "Add <sheet>" buttons of the empty state)
const primaryButtonClass =
  'inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-500 active:scale-[0.98]';

// Builds the request settings that carry the login token
const getAuthConfig = () => {
  const token = localStorage.getItem('token');
  return { headers: { Authorization: `Bearer ${token}` } };
};

// A row of pill-shaped buttons where exactly one option is selected.
// Used for the Difficulty and Status filters (nicer to tap than a dropdown).
function FilterPills({ label, options, value, onChange }) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isActive = value === option.value;

          return (
            <button
              key={option.value}
              onClick={() => onChange(option.value)}
              aria-pressed={isActive}
              className={`px-4 py-2 text-sm rounded-full border transition active:scale-95 ${
                isActive
                  ? 'bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-600/25'
                  : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// The loading placeholder: the same shape as the real page, built from grey blocks
function ProblemsSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="mt-3 h-4 w-32" />

      <Skeleton className="mt-8 h-52 rounded-2xl" />
      <Skeleton className="mt-6 h-11 rounded-xl" />

      <div className="mt-6 space-y-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-14 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

// Groups progress entries into: sheet -> topic -> entries.
// Each sheet keeps its own problem order (the `order` field set by the seed script),
// and the "custom" sheet is always listed last.
const groupEntries = (progressList) => {
  const validEntries = progressList.filter((entry) => entry.problemId);

  // Sort once by position in the sheet. Array.sort is stable, so custom problems
  // (which all have order 0) keep the order they were added in.
  const sortedEntries = [...validEntries].sort(
    (a, b) => (a.problemId.order ?? 0) - (b.problemId.order ?? 0)
  );

  // A Map remembers insertion order, so topics end up in the sheet's natural sequence
  const sheetMap = new Map();
  sortedEntries.forEach((entry) => {
    const { sheet, topic } = entry.problemId;

    if (!sheetMap.has(sheet)) sheetMap.set(sheet, new Map());
    const topicMap = sheetMap.get(sheet);

    if (!topicMap.has(topic)) topicMap.set(topic, []);
    topicMap.get(topic).push(entry);
  });

  // Convert the Maps into plain arrays the JSX can loop over
  return Array.from(sheetMap, ([sheet, topicMap]) => ({
    sheet,
    topics: Array.from(topicMap, ([topic, entries]) => ({ topic, entries })),
  })).sort((a, b) => {
    if (a.sheet === 'custom') return 1;
    if (b.sheet === 'custom') return -1;
    return a.sheet.localeCompare(b.sheet);
  });
};

// Decides whether one progress entry passes the current search + filters.
// - search: case-insensitive match on the problem title OR its topic
// - difficulty: 'All' or an exact match
// - status: 'All', 'solved' or 'unsolved'
const matchesFilters = (entry, { searchTerm, difficulty, status }) => {
  const problem = entry.problemId;
  const term = searchTerm.trim().toLowerCase();

  if (
    term &&
    !problem.title.toLowerCase().includes(term) &&
    !problem.topic.toLowerCase().includes(term)
  ) {
    return false;
  }

  if (difficulty !== 'All' && problem.difficulty !== difficulty) return false;

  const isDone = entry.status === 'done';
  if (status === 'solved' && !isDone) return false;
  if (status === 'unsolved' && isDone) return false;

  return true;
};

function Problems() {
  // This user's progress entries — the single source of truth for this page
  const [progressList, setProgressList] = useState([]);

  // All sheet names that exist in the database — populates the dropdown
  const [availableSheets, setAvailableSheets] = useState([]);

  // ID of the problem whose notepad is open (null = notepad closed)
  const [activeNoteProblemId, setActiveNoteProblemId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // True after the first successful load. It lets us tell "the page could not load at all"
  // (show a full error card) apart from "an action failed" (show a banner above the list).
  const [hasLoaded, setHasLoaded] = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);

  // Search + filter state. These only change what is DISPLAYED; no server calls.
  const [searchTerm, setSearchTerm] = useState('');
  const [difficulty, setDifficulty] = useState('All');
  const [status, setStatus] = useState('All');
  const [showFilters, setShowFilters] = useState(false);

  // The message toast at the bottom of the screen: { id, message, actionLabel, onAction } or null
  const [toast, setToast] = useState(null);

  // The open "Are you sure?" question: { title, message, confirmLabel, danger, onConfirm } or null
  const [confirmState, setConfirmState] = useState(null);

  // Fetches this user's progress and the list of available sheets
  const fetchData = useCallback(async () => {
    try {
      const config = getAuthConfig();

      const progressResponse = await api.get('/progress', config);
      const sheetsResponse = await api.get('/problems/sheets');

      setProgressList(progressResponse.data);
      setAvailableSheets(sheetsResponse.data);
      setError('');
      setHasLoaded(true);
    } catch (err) {
      setError('Failed to load problems');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Used by the "Try again" button on the error card
  const handleRetry = () => {
    setLoading(true);
    fetchData();
  };

  // Shows a toast. A new id makes React replace an old toast, which restarts its timer.
  const showToast = (message, actionLabel, onAction) => {
    setToast({ id: Date.now(), message, actionLabel, onAction });
  };

  // Adds a sheet (called by the dropdown and by the buttons of the empty state).
  // If the sheet was hidden before, this also restores all the progress and notes.
  const addSheet = async (sheetName) => {
    if (!sheetName) return; // ignore the placeholder option

    setError('');

    try {
      await api.post('/progress/select-sheet', { sheet: sheetName }, getAuthConfig());
      fetchData();
    } catch (err) {
      setError('Failed to add sheet');
    }
  };

  // Hides a sheet from this page. Nothing is deleted: progress, revision dates
  // and notes stay saved, and picking the sheet from the dropdown again brings
  // everything back. Because it is harmless, no confirmation is needed — the toast
  // just offers an Undo, which adds the sheet back.
  const handleHideSheet = async (sheetName) => {
    setError('');

    try {
      await api.patch(`/progress/sheet/${encodeURIComponent(sheetName)}/hide`, {}, getAuthConfig());
      showToast(`Hid "${sheetName}". Your progress is kept.`, 'Undo', () => addSheet(sheetName));
      fetchData();
    } catch (err) {
      setError('Failed to hide sheet');
    }
  };

  // Ticks a problem as solved. The row turns green immediately (before the server answers),
  // so the page feels instant. If the request fails, the real data is loaded again and the
  // tick disappears. On success a toast offers an Undo.
  const handleMarkDone = async (problemId) => {
    const entry = progressList.find((item) => item.problemId && item.problemId._id === problemId);

    setError('');
    setProgressList((list) =>
      list.map((item) =>
        item.problemId && item.problemId._id === problemId ? { ...item, status: 'done' } : item
      )
    );

    try {
      await api.patch(`/progress/${problemId}/done`, {}, getAuthConfig());

      if (entry) {
        showToast(`Marked "${entry.problemId.title}" as solved`, 'Undo', () =>
          handleMarkUndone(problemId)
        );
      }

      fetchData();
    } catch (err) {
      setError('Failed to mark problem as solved');
      fetchData();
    }
  };

  // "Untick": turns a solved problem back into unsolved (notes are kept).
  // If the problem has been revised several times, un-ticking also wipes that
  // revision history, so we ask first (with the in-app dialog, not the browser box).
  const handleMarkUndone = async (problemId) => {
    const entry = progressList.find(
      (item) => item.problemId && item.problemId._id === problemId
    );

    const performUndo = async () => {
      try {
        await api.patch(`/progress/${problemId}/undone`, {}, getAuthConfig());
        fetchData();
      } catch (err) {
        setError('Failed to mark problem as unsolved');
      }
    };

    if (entry && entry.revisionCount > 1) {
      setConfirmState({
        title: 'Mark as unsolved?',
        message:
          `You have solved/revised "${entry.problemId.title}" ${entry.revisionCount} times. ` +
          'Marking it unsolved will clear its revision history (your notes are kept).',
        confirmLabel: 'Mark unsolved',
        danger: true,
        onConfirm: performUndo,
      });
      return;
    }

    await performUndo();
  };

  // Called by the notepad's Save button — stores the note, closes the notepad, refreshes
  const handleSaveNotes = async (problemId, noteText) => {
    try {
      await api.patch(`/progress/${problemId}/notes`, { note: noteText }, getAuthConfig());
      setActiveNoteProblemId(null);
      fetchData();
    } catch (err) {
      setError('Failed to save notes');
    }
  };

  const handleAddProblem = async (formData) => {
    try {
      await api.post('/problems', formData, getAuthConfig());
      setShowAddForm(false);
      fetchData();
    } catch (err) {
      setError('Failed to add problem');
    }
  };

  // Resets solved status + revision schedule for everything on this page.
  // Notes are kept. Destructive, so we confirm first and say exactly what happens.
  const handleResetProgress = (solvedTotal) => {
    setConfirmState({
      title: 'Reset all progress?',
      message:
        `${solvedTotal} solved problem${solvedTotal === 1 ? '' : 's'} will be marked unsolved, ` +
        'and their revision schedule and activity history will be cleared. ' +
        'Your notes are kept. This cannot be undone.',
      confirmLabel: 'Reset progress',
      danger: true,
      onConfirm: async () => {
        try {
          await api.post('/progress/reset', {}, getAuthConfig());
          fetchData();
        } catch (err) {
          setError('Failed to reset progress');
        }
      },
    });
  };

  // Runs when the main button of the "Are you sure?" dialog is pressed:
  // the dialog is closed first, then the saved action runs
  const handleConfirm = () => {
    const action = confirmState.onConfirm;
    setConfirmState(null);
    action();
  };

  // Resets the search box and both filters back to "show everything"
  const clearFilters = () => {
    setSearchTerm('');
    setDifficulty('All');
    setStatus('All');
  };

  if (loading) return <ProblemsSkeleton />;

  // The very first load failed: there is nothing to show, so offer a retry
  if (!hasLoaded && error) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
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

  const groups = groupEntries(progressList);

  // Sheets the user has already added (custom isn't a real sheet, so it gets no chip)
  const activeSheets = groups.filter((group) => group.sheet !== 'custom').map((group) => group.sheet);

  // The dropdown offers every sheet the user isn't currently showing —
  // that includes sheets they hid earlier (picking one restores its progress)
  const selectableSheets = availableSheets.filter(
    (sheet) => sheet !== 'custom' && !activeSheets.includes(sheet)
  );

  // The progress entry whose notepad is currently open, if any
  const activeEntry = progressList.find(
    (entry) => entry.problemId && entry.problemId._id === activeNoteProblemId
  );

  // ---------- Overview numbers (header subtitle + overview card) ----------
  // Only entries whose problem still exists are counted
  const validEntries = progressList.filter((entry) => entry.problemId);
  const totalCount = validEntries.length;
  const solvedCount = validEntries.filter((entry) => entry.status === 'done').length;
  const overallPercent = totalCount === 0 ? 0 : Math.round((solvedCount / totalCount) * 100);

  // Solved/total for each difficulty, e.g. { level: 'Easy', solved: 12, total: 40 }
  const difficultyStats = ['Easy', 'Medium', 'Hard'].map((level) => {
    const ofLevel = validEntries.filter((entry) => entry.problemId.difficulty === level);
    return {
      level,
      total: ofLevel.length,
      solved: ofLevel.filter((entry) => entry.status === 'done').length,
    };
  });

  // ---------- Search + filter ----------
  const filters = { searchTerm, difficulty, status };

  // True when anything is narrowing down the list
  const isFiltering = searchTerm.trim() !== '' || difficulty !== 'All' || status !== 'All';

  // True when a pill filter (not just the search box) is on — shows the dot on the filter button
  const hasDropdownFilter = difficulty !== 'All' || status !== 'All';

  // Same sheet -> topic structure as before, but each topic now carries two lists:
  // allEntries (for the solved/total counts) and visibleEntries (what passes the filters).
  // Topics and sheets with nothing visible are dropped from the page.
  const visibleGroups = groups
    .map((group) => ({
      sheet: group.sheet,
      topics: group.topics
        .map(({ topic, entries }) => ({
          topic,
          allEntries: entries,
          visibleEntries: entries.filter((entry) => matchesFilters(entry, filters)),
        }))
        .filter((topicGroup) => topicGroup.visibleEntries.length > 0),
    }))
    .filter((group) => group.topics.length > 0);

  // Flat list of every problem currently on screen — the pool for "random problem"
  const visibleEntries = visibleGroups.flatMap((group) =>
    group.topics.flatMap((topicGroup) => topicGroup.visibleEntries)
  );

  // Picks a random problem and opens it on LeetCode in a new tab.
  // It prefers UNSOLVED problems (the point is to find something new to practise);
  // if everything visible is already solved, it picks from all of them.
  // It respects the current search/filters, e.g. filter to "Hard" to get a random hard one.
  const handleRandomProblem = () => {
    const unsolved = visibleEntries.filter((entry) => entry.status !== 'done');
    const pool = unsolved.length > 0 ? unsolved : visibleEntries;
    if (pool.length === 0) return;

    const pick = pool[Math.floor(Math.random() * pool.length)];
    window.open(pick.problemId.link, '_blank', 'noopener,noreferrer');
  };

  return (
    // animate-fade-up (defined in tailwind.config.js): the page fades in when it opens
    <div className="animate-fade-up motion-reduce:animate-none max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* ---------- 1. Header: title + subtitle on the left, primary action on the right ---------- */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Problems</h1>
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
            {totalCount === 0
              ? 'Add a sheet to get started.'
              : `${solvedCount} of ${totalCount} solved`}
          </p>
        </div>

        <button onClick={() => setShowAddForm(!showAddForm)} className={primaryButtonClass}>
          {showAddForm ? <X size={16} /> : <Plus size={16} />}
          {showAddForm ? 'Close form' : 'Add Custom Problem'}
        </button>
      </div>

      {/* The add-problem form opens right under the header, where the button is */}
      {showAddForm && (
        <div className="mb-6">
          <AddProblemForm onAddProblem={handleAddProblem} onClose={() => setShowAddForm(false)} />
        </div>
      )}

      {/* Errors show as a banner instead of replacing the page, so the list stays usable */}
      {error && (
        <p
          role="alert"
          className="mb-6 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-3.5 py-2.5 text-sm text-red-700 dark:text-red-400"
        >
          {error}
        </p>
      )}

      {/* ---------- 2. Overview card: sheets on top, progress summary below ---------- */}
      <Card className="mb-6">
        {/* Sheet controls: a chip for every active sheet + the "Add sheet" dropdown */}
        <div className="p-5">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Your sheets
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {activeSheets.map((sheet) => (
              <span
                key={sheet}
                className="inline-flex items-center gap-1 pl-3.5 pr-1 py-1 text-sm font-medium rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20"
              >
                {sheet}
                {/* × HIDES the sheet instead of deleting it — progress is kept */}
                <button
                  onClick={() => handleHideSheet(sheet)}
                  title={`Hide ${sheet} (your progress is kept)`}
                  aria-label={`Hide ${sheet}`}
                  className="flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-blue-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <X size={14} />
                </button>
              </span>
            ))}

            {/* value="" keeps this a controlled input that snaps back to the placeholder after each pick.

                DROPDOWN VISIBILITY FIX: the browser draws the open dropdown list (the
                "popup") itself, and it fills it with WHITE whenever the select's own
                background is transparent — which made the light-grey sheet names
                invisible. So now:
                  1. the select has a SOLID background (bg-white / dark:bg-gray-900),
                  2. every <option> gets its own explicit background + text color,
                  3. color-scheme tells the browser to draw its native popup (and
                     scrollbar) in dark mode when the app is in dark mode. */}
            <select
              value=""
              onChange={(e) => addSheet(e.target.value)}
              disabled={selectableSheets.length === 0}
              aria-label="Add a sheet"
              className="h-9 px-3.5 text-sm rounded-full border border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 [color-scheme:light] dark:[color-scheme:dark] transition-colors hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="" className="bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200">
                + Add sheet
              </option>
              {selectableSheets.map((sheet) => (
                <option
                  key={sheet}
                  value={sheet}
                  className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                >
                  {sheet}
                </option>
              ))}
            </select>

            {activeSheets.length === 0 && (
              <span className="text-sm text-gray-400 dark:text-gray-500">
                No sheet added yet — pick one from the dropdown.
              </span>
            )}
          </div>
        </div>

        {/* Overall progress + per-difficulty breakdown */}
        <div className="border-t border-gray-100 dark:border-gray-800 p-5">
          <div className="mb-2 flex items-baseline justify-between">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Overall progress</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 tabular-nums">
              <span className="font-semibold text-gray-900 dark:text-gray-100">{solvedCount}</span>
              {' / '}
              {totalCount} · {overallPercent}%
            </p>
          </div>

          {/* The bar's width depends on runtime data, which Tailwind classes can't
              express, so this one value uses an inline style (same as TopicSection).
              It is blue while in progress and turns green at 100%. */}
          <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
            <div
              style={{ width: `${overallPercent}%` }}
              className={`h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none ${
                totalCount > 0 && overallPercent === 100 ? 'bg-emerald-500' : 'bg-blue-500'
              }`}
            />
          </div>

          {/* Three equal columns, each with its own small bar (they fit even on a phone) */}
          <div className="mt-5 grid grid-cols-3 gap-4 sm:gap-8">
            {difficultyStats.map(({ level, solved, total }) => {
              const percent = total === 0 ? 0 : Math.round((solved / total) * 100);

              return (
                <div key={level}>
                  <div className="flex items-baseline justify-between gap-1">
                    <span className={`text-sm font-medium ${difficultyTextClass[level]}`}>{level}</span>
                    <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 tabular-nums">
                      {solved}/{total}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      style={{ width: `${percent}%` }}
                      className={`h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none ${difficultyBarClass[level]}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* ---------- 3. Toolbar: search, filter, random, reset ----------
          Only shown once there is something to search through.
          sticky top-[61px]: it stays in view under the navbar while the long list scrolls
          (61px is the navbar's height; change this number if the navbar's height changes).
          z-30 keeps it below the navbar (z-40) and above the list. The slightly see-through,
          blurred background lets the list pass underneath without clashing with the buttons. */}
      {progressList.length > 0 && (
        <div className="sticky top-[61px] z-30 -mx-4 mb-4 bg-white/90 px-4 py-3 backdrop-blur-md dark:bg-gray-950/90 sm:-mx-6 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search box with a magnifier on the left and a clear (✕) button on the right */}
            <div className="relative flex-1 min-w-0">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search problems"
                aria-label="Search problems by name or topic"
                className="w-full h-11 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 pl-11 pr-10 text-sm transition focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray-400 transition-colors hover:text-gray-700 dark:hover:text-gray-200"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Filter button — tinted while the panel is open, with a small blue dot when a filter is active */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              title="Filter problems"
              aria-label="Filter problems"
              aria-expanded={showFilters}
              className={`${iconButtonClass} ${
                showFilters ? 'bg-gray-100 dark:bg-gray-800' : ''
              }`}
            >
              <Filter size={18} />
              {hasDropdownFilter && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500" />
              )}
            </button>

            {/* Random problem — disabled when nothing is on screen to pick from */}
            <button
              onClick={handleRandomProblem}
              disabled={visibleEntries.length === 0}
              title="Choose random problem"
              aria-label="Choose random problem"
              className={iconButtonClass}
            >
              <Shuffle size={18} />
            </button>

            {/* Reset progress — disabled when nothing is solved yet */}
            <button
              onClick={() => handleResetProgress(solvedCount)}
              disabled={solvedCount === 0}
              title="Reset progress"
              aria-label="Reset progress"
              className={iconButtonClass}
            >
              <Trash2 size={18} />
            </button>
          </div>

          {/* Filter panel — opens under the toolbar with a clear gap */}
          {showFilters && (
            <Card className="mt-3 flex flex-wrap gap-x-10 gap-y-5 p-5">
              <FilterPills
                label="Difficulty"
                options={DIFFICULTY_OPTIONS}
                value={difficulty}
                onChange={setDifficulty}
              />
              <FilterPills
                label="Status"
                options={STATUS_OPTIONS}
                value={status}
                onChange={setStatus}
              />
            </Card>
          )}

          {/* Result summary while searching/filtering, with a quick way out */}
          {isFiltering && (
            <div className="mt-3 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
              <span>
                Showing {visibleEntries.length} of {totalCount} problems
              </span>
              <button
                onClick={clearFilters}
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Clear search and filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* ---------- 4. Topic list ---------- */}
      {groups.length === 0 ? (
        // Nothing added yet: explain it and offer one-tap buttons for the sheets that exist
        <Card className="flex flex-col items-center p-10 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <ListChecks className="h-5 w-5" />
          </span>
          <h2 className="mt-4 text-base font-semibold text-gray-900 dark:text-gray-100">No problems yet</h2>
          <p className="mt-1.5 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            Add a sheet to get a ready-made list, or add your own problem with the button at the top.
          </p>

          {selectableSheets.length > 0 && (
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {selectableSheets.map((sheet) => (
                <button key={sheet} onClick={() => addSheet(sheet)} className={primaryButtonClass}>
                  <Plus size={16} />
                  Add {sheet}
                </button>
              ))}
            </div>
          )}
        </Card>
      ) : visibleGroups.length === 0 ? (
        // There are problems, but none match the current search/filters
        <Card className="flex flex-col items-center p-10 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-500/10 text-gray-500 dark:text-gray-400">
            <Search className="h-5 w-5" />
          </span>
          <p className="mt-4 text-sm font-medium text-gray-900 dark:text-gray-100">
            No problems match your search or filters.
          </p>
          <button onClick={clearFilters} className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline">
            Clear search and filters
          </button>
        </Card>
      ) : (
        visibleGroups.map((group) => (
          <section key={group.sheet} className="mb-8">
            {/* Sheet heading is only needed when more than one sheet is on the page */}
            {groups.length > 1 && (
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {group.sheet === 'custom' ? 'Custom problems' : group.sheet}
              </h2>
            )}

            {group.topics.map(({ topic, allEntries, visibleEntries: topicEntries }) => (
              <TopicSection
                key={`${group.sheet}::${topic}`}
                topic={topic}
                entries={topicEntries}
                allEntries={allEntries}
                forceOpen={isFiltering}
                onMarkDone={handleMarkDone}
                onOpenNotes={setActiveNoteProblemId}
              />
            ))}
          </section>
        ))
      )}

      {/* The notepad — mounted only while a problem's notes are open */}
      {activeEntry && (
        <NotesModal
          key={activeEntry._id}
          problemTitle={activeEntry.problemId.title}
          initialNotes={activeEntry.notes}
          onSave={(text) => handleSaveNotes(activeEntry.problemId._id, text)}
          onClose={() => setActiveNoteProblemId(null)}
        />
      )}

      {/* The "Are you sure?" dialog — mounted only while a question is open */}
      {confirmState && (
        <ConfirmDialog
          title={confirmState.title}
          message={confirmState.message}
          confirmLabel={confirmState.confirmLabel}
          danger={confirmState.danger}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}

      {/* The message toast. key={toast.id} makes a newer toast replace an older one. */}
      {toast && (
        <Toast
          key={toast.id}
          message={toast.message}
          actionLabel={toast.actionLabel}
          onAction={toast.onAction}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default Problems;