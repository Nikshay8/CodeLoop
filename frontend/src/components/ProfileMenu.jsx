// components/ProfileMenu.jsx
// A dropdown menu triggered by clicking the user's avatar — shows profile info,
// GitHub/LeetCode links (with actual brand logo images) or prompts to add them,
// a theme toggle, and logout.

import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import githubLogo from '../assets/github-logo.png';
import leetcodeLogo from '../assets/leetcode-logo.png';
import useTheme from '../hooks/useTheme';

// Look of the plain rows in the dropdown (Edit Profile, theme switch, Logout)
const MENU_ITEM_CLASS =
  'block w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800';

function ProfileMenu({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close the dropdown when the user presses Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const goToEditProfile = () => {
    setIsOpen(false);
    navigate('/profile');
  };

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : '?';

  const getGithubUsername = (url) => {
    if (!url) return '';
    const parts = url.split('/').filter(Boolean);
    return parts[parts.length - 1];
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* aria-expanded tells screen readers whether the dropdown is open */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open profile menu"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium transition hover:bg-blue-500 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950"
      >
        {initial}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xl shadow-black/10 dark:shadow-black/40 py-2 z-50">
          <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-800">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
          </div>

          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 space-y-2.5">
            {user?.githubUrl ? (
              <a
                href={user.githubUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400"
              >
                <img src={githubLogo} alt="GitHub" className="w-4 h-4 dark:invert" />
                <span className="truncate">{getGithubUsername(user.githubUrl)}</span>
              </a>
            ) : (
              <button
                onClick={goToEditProfile}
                className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
              >
                <img src={githubLogo} alt="GitHub" className="w-4 h-4 opacity-50 dark:invert" />
                <span>Add GitHub Profile</span>
              </button>
            )}

            {user?.leetcodeUsername ? (
              <a
                href={`https://leetcode.com/u/${user.leetcodeUsername}/`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400"
              >
                <img src={leetcodeLogo} alt="LeetCode" className="w-4 h-4" />
                <span className="truncate">{user.leetcodeUsername}</span>
              </a>
            ) : (
              <button
                onClick={goToEditProfile}
                className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
              >
                <img src={leetcodeLogo} alt="LeetCode" className="w-4 h-4 opacity-50" />
                <span>Add LeetCode Profile</span>
              </button>
            )}
          </div>

          <Link to="/profile" onClick={() => setIsOpen(false)} className={MENU_ITEM_CLASS}>
            Edit Profile
          </Link>

          <button onClick={toggleTheme} className={MENU_ITEM_CLASS}>
            {theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          </button>

          <button
            onClick={handleLogout}
            className="block w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

export default ProfileMenu;