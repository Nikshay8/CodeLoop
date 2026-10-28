// components/ProblemRow.jsx
// One row in a topic's problem table: status, title (links to LeetCode),
// difficulty, and a notes icon. Mirrors the layout of NeetCode's problem list.
// It holds no data logic — it reports clicks to the parent through callback props.
//
// Phones: the difficulty column is dropped and the difficulty is written under the title
// instead, because three fixed-width columns would leave almost no room for the title.
// The status circle and the notes icon sit in 40px tap areas (a comfortable size for a finger).

import { Check, ExternalLink, FileText } from 'lucide-react';

// Difficulty text colors, with brighter variants for dark mode
const difficultyClass = {
  Easy: 'text-emerald-600 dark:text-emerald-400',
  Medium: 'text-amber-600 dark:text-amber-400',
  Hard: 'text-rose-600 dark:text-rose-400',
};

function ProblemRow({ entry, onMarkDone, onOpenNotes }) {
  // entry is a progress entry whose problemId has been populated with the full problem
  const problem = entry.problemId;
  const isDone = entry.status === 'done';

  // Only used to tint the notes icon — the note text itself is never shown here
  const hasNotes = Boolean(entry.notes && entry.notes.trim());

  return (
    <div className="flex items-center px-3 sm:px-4 py-1 border-b last:border-b-0 border-gray-100 dark:border-gray-800 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40">
      {/* Status: a filled green check once solved, otherwise a clickable empty circle.
          Re-solving for revision happens from the Revision page, not here.
          The visible circle is 24px, but the clickable button around it is 40px. */}
      <div className="w-12 sm:w-14 shrink-0">
        {isDone ? (
          <span
            role="img"
            aria-label="Solved"
            title="Solved"
            className="flex h-10 w-10 items-center justify-center"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500">
              <Check size={14} strokeWidth={3} className="text-white" />
            </span>
          </span>
        ) : (
          <button
            onClick={() => onMarkDone(problem._id)}
            title="Mark as solved"
            aria-label={`Mark ${problem.title} as solved`}
            className="group flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <span className="block h-6 w-6 rounded-full border-2 border-gray-300 dark:border-gray-600 transition group-hover:border-emerald-500 group-active:scale-90" />
          </button>
        )}
      </div>

      {/* Problem title — opens the problem on LeetCode in a new tab.
          line-clamp-2 lets a long title use two lines on a phone; from "sm" up it stays on one line. */}
      <div className="flex-1 min-w-0 py-2">
        <a
          href={problem.link}
          target="_blank"
          rel="noreferrer"
          className="inline-flex max-w-full items-start gap-1.5 text-sm font-medium text-gray-900 dark:text-gray-100 transition-colors hover:text-blue-600 dark:hover:text-blue-400"
        >
          <span className="line-clamp-2 sm:line-clamp-1">{problem.title}</span>
          <ExternalLink size={13} className="mt-0.5 shrink-0 text-gray-400" />
        </a>

        {/* Phones only: the difficulty goes under the title */}
        <span className={`mt-0.5 block text-xs font-medium sm:hidden ${difficultyClass[problem.difficulty]}`}>
          {problem.difficulty}
        </span>
      </div>

      {/* From "sm" up: the difficulty has its own column (its header is in TopicSection) */}
      <span
        className={`hidden sm:block w-20 text-center text-xs font-semibold ${difficultyClass[problem.difficulty]}`}
      >
        {problem.difficulty}
      </span>

      {/* Notes icon — blue when a note exists, grey when empty */}
      <div className="w-10 sm:w-12 flex justify-center">
        <button
          onClick={() => onOpenNotes(problem._id)}
          title="Open notes"
          aria-label={`Open notes for ${problem.title}`}
          className="flex h-10 w-10 items-center justify-center rounded-xl transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
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