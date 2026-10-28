// components/ConfirmDialog.jsx
// A "Are you sure?" popup that replaces the browser's window.confirm(). The browser box
// cannot be styled, looks different in every browser and ignores dark mode.
//
// The page keeps the dialog's details in its own state and renders this component only
// while a question is open.
//
// Props:
//   title        - the question, e.g. "Reset all progress?"
//   message      - the explanation of what will happen
//   confirmLabel - text of the main button (default "Confirm")
//   danger       - true makes the main button and the icon red (for destructive actions)
//   onConfirm    - called when the main button is pressed
//   onCancel     - called for Cancel, the Escape key, or a click on the dark backdrop

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

function ConfirmDialog({ title, message, confirmLabel = 'Confirm', danger = false, onConfirm, onCancel }) {
  // Escape cancels, like every dialog the user knows
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onCancel();
    };

    document.addEventListener('keydown', handleKeyDown);
    // Cleanup: remove the listener when the dialog closes
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    // The dark backdrop. event.target === event.currentTarget means the click landed on the
    // backdrop itself, not on the dialog inside it, so only outside clicks cancel.
    <div
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        style={{ animationDuration: '250ms' }}
        className="animate-fade-up motion-reduce:animate-none w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-2xl"
      >
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${
            danger
              ? 'bg-red-500/10 text-red-600 dark:text-red-400'
              : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
          }`}
        >
          <AlertTriangle className="h-5 w-5" />
        </span>

        <h2 id="confirm-title" className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h2>
        <p id="confirm-message" className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {message}
        </p>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {/* Cancel gets the focus, so pressing Enter by accident never confirms a destructive action */}
          <button
            type="button"
            onClick={onCancel}
            autoFocus
            className="rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 transition hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-[0.98]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition active:scale-[0.98] ${
              danger
                ? 'bg-red-600 shadow-red-600/25 hover:bg-red-500'
                : 'bg-blue-600 shadow-blue-600/25 hover:bg-blue-500'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;