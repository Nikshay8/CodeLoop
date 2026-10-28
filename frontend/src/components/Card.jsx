// components/Card.jsx
// The standard "panel" used on the app's pages: rounded corners, a thin border and a soft
// background that works in both light and dark mode. Before this component, every page
// repeated the same long class string, so the look could drift between pages.
// Extra classes (padding, layout) are passed in through className.

function Card({ children, className = '' }) {
  return (
    <div
      className={`rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export default Card;