import { useState } from 'react';
import { applyTheme, getInitialTheme, saveTheme } from '../utils/theme';

function useTheme() {
  const [theme, setTheme] = useState(getInitialTheme);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';

    applyTheme(nextTheme);
    saveTheme(nextTheme);
    setTheme(nextTheme);
  };

  return { theme, toggleTheme };
}

export default useTheme;