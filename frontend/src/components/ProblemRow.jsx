// components/ProblemRow.jsx
// One row in a topic's problem table: status, title (links to LeetCode),
// difficulty, and a notes icon. Mirrors the layout of NeetCode's problem list.

import { Check, ExternalLink, FileText } from 'lucide-react';

// Difficulty text colors, with brighter variants for dark mode
const difficultyClass = {
  Easy: 'text-green-600 dark:text-green-400',
  Medium: 'text-amber-600 dark:text-amber-400',
  Hard: 'text-red-600 dark:text-red-400',
};

function ProblemRow({ entry, onMarkDone, onMarkUndone, onOpenNotes }) {
  const problem = entry.problemId;
  const isDone = entry.status === 'done';

  const hasNotes = Boolean(entry.notes && entry.notes.trim());

  const handleToggle = () => {
    if (isDone) {
      if (typeof onMarkUndone !== 'function') {
        console.error('ProblemRow: onMarkUndone is missing. TopicSection must pass it down.');
        return;
      }
      onMarkUndone(problem._id);
    } else {
      onMarkDone(problem._id);
    }
  };

  return (
    <div className="flex items-center px-4 py-3 border-b last:border-b-0 border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
      {/* Status toggle button — green when solved, grey when unsolved */}
      <div className="w-14 shrink-0">
        <button
          onClick={handleToggle}
          aria-pressed={isDone}
          title={isDone ? 'Solved — click to mark as unsolved' : 'Mark as solved'}
          aria-label={
            isDone ? `Mark ${problem.title} as unsolved` : `Mark ${problem.title} as solved`
          }
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
            isDone
              ? 'bg-green-500 border-green-500 text-white hover:bg-green-600 hover:border-green-600'
              : 'border-gray-300 dark:border-gray-600 hover:border-green-500'
          }`}
        >
          {isDone && <Check size={12} strokeWidth={3} />}
        </button>
      </div>

      {/* Problem title - opens the problem on LeetCode in a new tab */}
      <div className="flex-1 min-w-0">
        <a
          href={problem.link}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 max-w-full text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400"
        >
          <span className="truncate">{problem.title}</span>
          <ExternalLink size={13} className="shrink-0 text-gray-400" />
        </a>
      </div>

      <span className={`w-20 text-center text-xs font-semibold ${difficultyClass[problem.difficulty]}`}>
        {problem.difficulty}
      </span>

      {/* Notes icon — blue when a note exists, grey when empty */}
      <div className="w-12 flex justify-center">
        <button
          onClick={() => onOpenNotes(problem._id)}
          title="Open notes"
          aria-label={`Open notes for ${problem.title}`}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <FileText
            size={18}
            className={hasNotes ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'}
          />
        </button>
      </div>
    </div>
  );
}

export default ProblemRow;