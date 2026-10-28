// components/Toast.jsx
// A small message that slides up at the bottom of the screen, optionally with an action
// button such as "Undo", and then disappears by itself. It is used for quick feedback
// ("Marked as solved") that should not interrupt the user the way a popup would.
//
// The page that owns the toast decides WHEN it exists (it keeps the toast in its own state).
// To show a new toast while an old one is still visible, give the component a new `key`:
// React then replaces it and the dismiss timer starts again from zero.
//
// Props:
//   message     - the text to show
//   actionLabel - optional text of the action button (e.g. "Undo")
//   onAction    - called when the action button is pressed (the toast closes afterwards)
//   onClose     - called when the toast should go away (timer ended, or the X was pressed)
//   duration    - how long it stays, in milliseconds (default 6 seconds)

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

function Toast({ message, actionLabel, onAction, onClose, duration = 6000 }) {
  // The parent creates a new onClose function on every render. If the timer depended on it,
  // the timer would restart whenever the parent re-renders (for example while typing in a
  // search box) and the toast would never leave. So the latest onClose is kept in a ref
  // and the timer only depends on the duration.
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const timer = setTimeout(() => onCloseRef.current(), duration);

    // Cleanup: stop the timer if the toast is closed or replaced earlier
    return () => clearTimeout(timer);
  }, [duration]);

  const handleAction = () => {
    onAction();
    onClose();
  };

  return (
    // inset-x-4 + mx-auto + max-w-md centers the toast without using a transform
    // (the fade-up animation uses a transform, which would clash with a translate-based centering).
    // role="status" makes screen readers read the message out without interrupting the user.
    <div
      role="status"
      style={{ animationDuration: '250ms' }}
      className="animate-fade-up motion-reduce:animate-none fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-xl bg-gray-900 px-4 py-3 text-sm text-white shadow-xl shadow-black/20 dark:bg-gray-100 dark:text-gray-900"
    >
      <span className="min-w-0 flex-1">{message}</span>

      {actionLabel && (
        <button
          type="button"
          onClick={handleAction}
          className="shrink-0 rounded-lg px-2 py-1 font-semibold text-blue-300 transition-colors hover:bg-white/10 dark:text-blue-600 dark:hover:bg-black/5"
        >
          {actionLabel}
        </button>
      )}

      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss"
        className="shrink-0 rounded-lg p-1 text-gray-400 transition-colors hover:text-white dark:text-gray-500 dark:hover:text-gray-900"
      >
        <X size={16} />
      </button>
    </div>
  );
}

export default Toast;