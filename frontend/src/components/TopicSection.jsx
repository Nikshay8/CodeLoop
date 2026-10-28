import { useState, useId } from 'react';
import { ChevronRight, CheckCircle2 } from 'lucide-react';
import Card from './Card';
import ProblemRow from './ProblemRow';

function TopicSection({
  topic,
  entries,
  allEntries,
  forceOpen = false,
  onMarkDone,
  onOpenNotes,
}) {
  const [isManuallyOpen, setIsManuallyOpen] = useState(false);
  const panelId = useId();
  const isOpen = forceOpen || isManuallyOpen;

  const countedEntries = allEntries || entries;
  const total = countedEntries.length;
  const solved = countedEntries.filter((entry) => entry.status === 'done').length;
  const percent = total === 0 ? 0 : Math.round((solved / total) * 100);
  const isComplete = total > 0 && solved === total;

  const handleToggle = () => {
    if (!forceOpen) setIsManuallyOpen(!isManuallyOpen);
  };

  return (
    <Card className="mb-3 overflow-hidden">
      <button
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="w-full flex items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
      >
        <ChevronRight
          size={16}
          className={`shrink-0 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`}
        />
        <span className="flex-1 min-w-0 truncate font-semibold text-gray-900 dark:text-gray-100">{topic}</span>

        {isComplete && <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />}

        <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400 tabular-nums">
          {solved}/{total}
        </span>
      </button>

      <div className="h-1 bg-gray-100 dark:bg-gray-800">
        <div
          style={{ width: `${percent}%` }}
          className={`h-full transition-[width] duration-500 ease-out motion-reduce:transition-none ${
            isComplete ? 'bg-emerald-500' : 'bg-blue-500'
          }`}
        />
      </div>

      <div
        id={panelId}
        className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className={`overflow-hidden transition-[visibility] duration-300 ${isOpen ? 'visible' : 'invisible'}`}>
          <div className="hidden sm:flex items-center px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-800">
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
              onOpenNotes={onOpenNotes}
            />
          ))}
        </div>
      </div>
    </Card>
  );
}

export default TopicSection;