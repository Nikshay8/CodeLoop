// components/NotesModal.jsx
// A small notepad popup for writing notes on a problem.
// It opens with the full existing note, so the user can edit anything or add
// to the end — Save replaces the stored note with whatever is in the box.
// Notes are only visible here, never inline, so they don't spoil a problem
// while the user is revising.

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

function NotesModal({ problemTitle, initialNotes, onSave, onClose }) {
  // Local copy of the note being edited — only sent to the parent when Save is clicked
  const [text, setText] = useState(initialNotes || '');
  const [isSaving, setIsSaving] = useState(false);

  // Close the notepad when the user presses Escape
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    // Cleanup: remove the listener when the modal closes
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(text);
    setIsSaving(false);
  };

  return (
    // Full-screen dim backdrop (slightly blurred); flex centers the notepad on the page.
    // Clicking the backdrop does NOT close it, so unsaved text is never lost by accident.
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      {/* The notepad fades up when it opens. The animation comes from tailwind.config.js and lasts
          0.7s by default, which is slow for a popup, so the style prop shortens it to 250ms.
          max-h + overflow-y-auto keep it usable on a short phone screen (for example with the keyboard open). */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Notes for ${problemTitle}`}
        style={{ animationDuration: '250ms' }}
        className="animate-fade-up motion-reduce:animate-none w-full max-w-lg max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xl"
      >
        {/* Header: problem name + close button */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {problemTitle}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close notes"
            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus
            rows={10}
            placeholder="Approach, time and space complexity, tricks..."
            className="w-full resize-none rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950/60 p-3.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={onClose}
            className="rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 transition hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-[0.98]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-500 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default NotesModal;