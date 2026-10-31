import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import ProblemRow from './ProblemRow';

function TopicSection({
  topic,
  entries,
  allEntries,
  forceOpen = false,
  onMarkDone,
  onMarkUndone,
  onOpenNotes,
}) {
  const [isManuallyOpen, setIsManuallyOpen] = useState(false);

  const isOpen = forceOpen || isManuallyOpen;

  const countedEntries = allEntries || entries;
  const total = countedEntries.length;
  const solved = countedEntries.filter((entry) => entry.status === 'done').length;
  const percent = total === 0 ? 0 : Math.round((solved / total) * 100);

  const handleToggle = () => {
    if (!forceOpen) setIsManuallyOpen(!isManuallyOpen);
  };

  return (
    <div className="mb-3 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
      {/* Header — the whole bar is the expand/collapse button */}
      <button
        onClick={handleToggle}
        aria-expanded={isOpen}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        {/* Chevron rotates 90 degrees when the section is open */}
        <ChevronRight
          size={16}
          className={`shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`}
        />
        <span className="flex-1 font-semibold text-gray-900 dark:text-gray-100">{topic}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
          {solved}/{total}
        </span>

        {/* Progress bar. The width depends on runtime data, which Tailwind classes
            can't express, so this one value uses an inline style. */}
        <div className="w-28 sm:w-48 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
          <div className="h-full bg-green-500" style={{ width: `${percent}%` }} />
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          {/* Column headers — widths match the cells in ProblemRow */}
          <div className="flex items-center px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-800">
            <span className="w-14 shrink-0">Status</span>
            <span className="flex-1">Problem</span>
            <span className="w-20 text-center">Difficulty</span>
            <span className="w-12 text-center">Notes</span>
          </div>

          {entries.map((entry) => (
            <ProblemRow
              key={entry._id}
              entry={entry}
              onMarkDone={onMarkDone}
              onMarkUndone={onMarkUndone}
              onOpenNotes={onOpenNotes}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default TopicSection;