// components/ThemeToggle.jsx
// A small icon button that switches between dark and light mode.
// Shown in the navbar for logged-out visitors; logged-in users get the same
// option inside the profile menu.

import { Sun, Moon } from 'lucide-react';
import useTheme from '../hooks/useTheme';

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="p-2 rounded-lg text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      {/* Show the icon of the theme you'd switch TO: sun while dark, moon while light */}
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

export default ThemeToggle;