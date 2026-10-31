import { useState, useEffect } from 'react';
import { Search, Filter, Shuffle, Trash2, X, Plus } from 'lucide-react';
import api from '../services/api';
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

const difficultyTextClass = {
  Easy: 'text-green-600 dark:text-green-400',
  Medium: 'text-amber-600 dark:text-amber-400',
  Hard: 'text-red-600 dark:text-red-400',
};
const difficultyBarClass = {
  Easy: 'bg-green-500',
  Medium: 'bg-amber-500',
  Hard: 'bg-red-500',
};

const iconButtonClass =
  'relative h-11 w-11 shrink-0 inline-flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-gray-900';

const cardClass =
  'rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm';

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
              className={`px-3.5 py-1.5 text-sm rounded-full border transition-colors ${
                isActive
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
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

const groupEntries = (progressList) => {
  const validEntries = progressList.filter((entry) => entry.problemId);

  const sortedEntries = [...validEntries].sort(
    (a, b) => (a.problemId.order ?? 0) - (b.problemId.order ?? 0)
  );

  const sheetMap = new Map();
  sortedEntries.forEach((entry) => {
    const { sheet, topic } = entry.problemId;

    if (!sheetMap.has(sheet)) sheetMap.set(sheet, new Map());
    const topicMap = sheetMap.get(sheet);

    if (!topicMap.has(topic)) topicMap.set(topic, []);
    topicMap.get(topic).push(entry);
  });

  return Array.from(sheetMap, ([sheet, topicMap]) => ({
    sheet,
    topics: Array.from(topicMap, ([topic, entries]) => ({ topic, entries })),
  })).sort((a, b) => {
    if (a.sheet === 'custom') return 1;
    if (b.sheet === 'custom') return -1;
    return a.sheet.localeCompare(b.sheet);
  });
};

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
  const [progressList, setProgressList] = useState([]);

  const [availableSheets, setAvailableSheets] = useState([]);

  const [activeNoteProblemId, setActiveNoteProblemId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [difficulty, setDifficulty] = useState('All');
  const [status, setStatus] = useState('All');
  const [showFilters, setShowFilters] = useState(false);

  const getAuthConfig = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchData = async () => {
    try {
      const config = getAuthConfig();

      const progressResponse = await api.get('/progress', config);
      const sheetsResponse = await api.get('/problems/sheets');

      setProgressList(progressResponse.data);
      setAvailableSheets(sheetsResponse.data);
      setError('');
    } catch (err) {
      setError('Failed to load problems');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);


  const handleSelectSheet = async (e) => {
    const sheetName = e.target.value;
    if (!sheetName) return; 

    try {
      await api.post('/progress/select-sheet', { sheet: sheetName }, getAuthConfig());
      fetchData();
    } catch (err) {
      setError('Failed to add sheet');
    }
  };

  const handleHideSheet = async (sheetName) => {
    try {
      await api.patch(`/progress/sheet/${encodeURIComponent(sheetName)}/hide`, {}, getAuthConfig());
      fetchData();
    } catch (err) {
      setError('Failed to hide sheet');
    }
  };

  // TICK: marks a problem as solved
  const handleMarkDone = async (problemId) => {
    try {
      await api.patch(`/progress/${problemId}/done`, {}, getAuthConfig());
      fetchData();
    } catch (err) {
      setError('Failed to mark problem as solved');
    }
  };

  // UNTICK: marks a problem as unsolved. If the problem has been solved/revised
  const handleMarkUndone = async (problemId) => {
    const entry = progressList.find(
      (item) => item.problemId && item.problemId._id === problemId
    );

    if (entry && entry.revisionCount > 1) {
      const confirmed = window.confirm(
        `You have solved/revised "${entry.problemId.title}" ${entry.revisionCount} times. ` +
          'Marking it unsolved will clear its revision history (your notes are kept). Continue?'
      );
      if (!confirmed) return;
    }

    try {
      await api.patch(`/progress/${problemId}/undone`, {}, getAuthConfig());
      fetchData();
    } catch (err) {
      setError('Failed to mark problem as unsolved');
    }
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

  const handleResetProgress = async (solvedTotal) => {
    const confirmed = window.confirm(
      `Reset progress for all problems on this page? ${solvedTotal} solved problem(s) will be ` +
        'marked unsolved and their revision schedule and activity history will be cleared. ' +
        'Your notes are kept. This cannot be undone.'
    );
    if (!confirmed) return;

    try {
      await api.post('/progress/reset', {}, getAuthConfig());
      fetchData();
    } catch (err) {
      setError('Failed to reset progress');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setDifficulty('All');
    setStatus('All');
  };

  if (loading) return <p className="p-6">Loading problems...</p>;

  const groups = groupEntries(progressList);

  // Sheets the user has already added (custom isn't a real sheet, so it gets no chip)
  const activeSheets = groups.filter((group) => group.sheet !== 'custom').map((group) => group.sheet);

  const selectableSheets = availableSheets.filter(
    (sheet) => sheet !== 'custom' && !activeSheets.includes(sheet)
  );

  // The progress entry whose notepad is currently open, if any
  const activeEntry = progressList.find(
    (entry) => entry.problemId && entry.problemId._id === activeNoteProblemId
  );

  const validEntries = progressList.filter((entry) => entry.problemId);
  const totalCount = validEntries.length;
  const solvedCount = validEntries.filter((entry) => entry.status === 'done').length;
  const overallPercent = totalCount === 0 ? 0 : Math.round((solvedCount / totalCount) * 100);

  const difficultyStats = ['Easy', 'Medium', 'Hard'].map((level) => {
    const ofLevel = validEntries.filter((entry) => entry.problemId.difficulty === level);
    return {
      level,
      total: ofLevel.length,
      solved: ofLevel.filter((entry) => entry.status === 'done').length,
    };
  });

  const filters = { searchTerm, difficulty, status };

  const isFiltering = searchTerm.trim() !== '' || difficulty !== 'All' || status !== 'All';

  const hasDropdownFilter = difficulty !== 'All' || status !== 'All';

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

  const handleRandomProblem = () => {
    const unsolved = visibleEntries.filter((entry) => entry.status !== 'done');
    const pool = unsolved.length > 0 ? unsolved : visibleEntries;
    if (pool.length === 0) return;

    const pick = pool[Math.floor(Math.random() * pool.length)];
    window.open(pick.problemId.link, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* ---------- 1. Header: title + subtitle on the left, primary action on the right ---------- */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Problems</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {totalCount === 0
              ? 'Add a sheet to get started.'
              : `${solvedCount} of ${totalCount} solved`}
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-blue-600 text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700"
        >
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
        <p className="mb-6 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded-lg p-3">
          {error}
        </p>
      )}

      {/*  2. Overview card: sheets on top, progress summary below */}
      <div className={`${cardClass} mb-6`}>
        {/* Sheet controls: a chip for every active sheet + the "Add sheet" dropdown */}
        <div className="p-5">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Your sheets
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {activeSheets.map((sheet) => (
              <span
                key={sheet}
                className="inline-flex items-center gap-1.5 pl-3.5 pr-1.5 py-1.5 text-sm font-medium rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900"
              >
                {sheet}
                {/* × HIDES the sheet instead of deleting it - progress is kept */}
                <button
                  onClick={() => handleHideSheet(sheet)}
                  title={`Hide ${sheet} (your progress is kept)`}
                  aria-label={`Hide ${sheet}`}
                  className="p-0.5 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900"
                >
                  <X size={14} />
                </button>
              </span>
            ))}

            {/* The dropdown is disabled when there are no more sheets to add */}
            <select
              value=""
              onChange={handleSelectSheet}
              disabled={selectableSheets.length === 0}
              aria-label="Add a sheet"
              className="px-3.5 py-1.5 text-sm rounded-full border border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 [color-scheme:light] dark:[color-scheme:dark] hover:border-gray-400 dark:hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
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

        {/* Overall progress + Easy / Medium / Hard breakdown */}
        <div className="border-t border-gray-100 dark:border-gray-800 p-5">
          <div className="mb-2 flex items-baseline justify-between">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Overall progress</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 tabular-nums">
              <span className="font-semibold text-gray-900 dark:text-gray-100">{solvedCount}</span>
              {' / '}
              {totalCount} · {overallPercent}%
            </p>
          </div>

          {/* The bars' widths depend on runtime data, which Tailwind classes can't
              express, so these use an inline style (same as TopicSection) */}
          <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div className="h-full bg-blue-600" style={{ width: `${overallPercent}%` }} />
          </div>

          {/* Three columns on wide screens, stacked on phones — each with its own bar */}
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {difficultyStats.map(({ level, solved, total }) => {
              const levelPercent = total === 0 ? 0 : Math.round((solved / total) * 100);

              return (
                <div key={level}>
                  <div className="mb-1.5 flex items-baseline justify-between text-sm">
                    <span className={`font-medium ${difficultyTextClass[level]}`}>{level}</span>
                    <span className="text-gray-500 dark:text-gray-400 tabular-nums">
                      {solved}/{total}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                    <div
                      className={`h-full ${difficultyBarClass[level]}`}
                      style={{ width: `${levelPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Toolbar: search, filter, random, reset Only shown once there is something to search through. */}
      {progressList.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-3">
            {/* Search box with a magnifier on the left and a clear (✕) button on the right */}
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search problems"
                aria-label="Search problems"
                className="w-full h-11 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 pl-11 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Filter button - tinted while the panel is open, with a small blue dot when a filter is active */}
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

            {/* Random problem - disabled when nothing is on screen to pick from */}
            <button
              onClick={handleRandomProblem}
              disabled={visibleEntries.length === 0}
              title="Choose random problem"
              aria-label="Choose random problem"
              className={iconButtonClass}
            >
              <Shuffle size={18} />
            </button>

            {/* Reset progress - disabled when nothing is solved yet */}
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

          {/* Filter panel - opens under the toolbar with a clear gap */}
          {showFilters && (
            <div className={`${cardClass} mt-3 flex flex-wrap gap-x-10 gap-y-5 p-5`}>
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
            </div>
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

      {/* 4. Topic list */}
      {groups.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-6">
          No problems added yet. Add a sheet above or add a custom problem to get started.
        </p>
      ) : visibleGroups.length === 0 ? (
        // There are problems, but none match the current search/filters
        <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
          <p>No problems match your search or filters.</p>
          <button onClick={clearFilters} className="mt-2 text-blue-600 dark:text-blue-400 hover:underline">
            Clear search and filters
          </button>
        </div>
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
                onMarkUndone={handleMarkUndone}
                onOpenNotes={setActiveNoteProblemId}
              />
            ))}
          </section>
        ))
      )}

      {/* The notepad - mounted only while a problem's notes are open */}
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

export default Problems;