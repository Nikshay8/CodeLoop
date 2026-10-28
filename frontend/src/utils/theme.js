// utils/theme.js
// Helpers for the light/dark theme. Keeping them outside React lets the theme
// be applied before the app renders, on every page (including logged-out ones).

const STORAGE_KEY = 'theme';

// The theme new visitors see until they pick one themselves
const DEFAULT_THEME = 'dark';

// Returns the user's saved choice, or the default when they haven't chosen yet.
// Anything in storage that isn't "light" or "dark" is ignored.
export const getInitialTheme = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === 'light' || saved === 'dark' ? saved : DEFAULT_THEME;
};

// Switches the page between themes by adding/removing the "dark" class on <html>.
// Tailwind's dark: styles activate whenever that class is present.
export const applyTheme = (theme) => {
  document.documentElement.classList.toggle('dark', theme === 'dark');
};

// Remembers the user's explicit choice across reloads.
// Only called when the user toggles, so the default is never saved on their behalf.
export const saveTheme = (theme) => {
  localStorage.setItem(STORAGE_KEY, theme);
};