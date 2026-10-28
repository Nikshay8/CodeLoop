// components/Navbar.jsx
// Shows navigation links and the profile menu (avatar, GitHub/LeetCode links,
// theme toggle, logout), with different content depending on login state.
// Logged-out visitors get a standalone theme toggle, since they have no profile menu.
// On the landing page only, logged-out visitors also get links that scroll to its sections.
//
// Small screens: a logged-in user has four page links, which do not fit next to the logo and
// the avatar on a phone. So below the "md" breakpoint (768px) the links are hidden and a
// hamburger button opens them as a menu that slides down under the navbar.

import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, LayoutDashboard, ListChecks, RefreshCw, BarChart3 } from 'lucide-react';
import api from '../services/api';
import { getValidToken } from '../utils/auth';
import ProfileMenu from './ProfileMenu';
import ThemeToggle from './ThemeToggle';
// The CodeLoop logo shown in front of the brand name (transparent PNG,
// so it looks the same on both the light and dark navbar background)
import codeloopLogo from '../assets/codeloop-logo.png';

// The pages a logged-in user can open from the navbar. One list feeds both the desktop
// links and the mobile menu, so a new page is added in one place only.
const APP_LINKS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/problems', label: 'Problems', icon: ListChecks },
  { to: '/revision', label: 'Revision', icon: RefreshCw },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
];

// Sections of the landing page the navbar can scroll to.
// Each id must match an id="..." on a section in pages/Landing.jsx.
// The order is the order the sections have on the page (top to bottom).
const LANDING_LINKS = [
  { id: 'how-it-works', label: 'How it works' },
  { id: 'features', label: 'Features' },
  { id: 'faq', label: 'FAQ' },
];

// Look of the plain text links (the landing section links, Login). Kept in one place
// so changing it changes every one of them.
const NAV_LINK =
  'text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors';

// Look of the desktop page links. The page you are on is shown in a darker color.
// font-medium is on both versions so the links do not change width when the page changes.
const getAppLinkClass = (isActive) =>
  `text-sm font-medium transition-colors ${
    isActive
      ? 'text-gray-900 dark:text-white'
      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
  }`;

// Look of one row in the mobile menu (big enough to tap comfortably)
const getMobileLinkClass = (isActive) =>
  `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
  }`;

// Smoothly scrolls the page to the section with the given id.
// Does nothing if that section does not exist on the current page.
const scrollToSection = (id) => {
  const section = document.getElementById(id);
  if (section) {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

function Navbar() {
  // BUG FIX: the Navbar lives OUTSIDE <Routes> in App.jsx, so React never
  // re-rendered it when the user logged in or out via navigate(). It kept showing
  // the old links until the page was refreshed.
  // Calling useLocation() subscribes this component to route changes: every time
  // the URL changes (e.g. /login -> /dashboard after login, or /dashboard -> /login
  // after logout), the Navbar re-renders and re-reads the token below.
  // We also use the pathname to know whether the visitor is on the landing page,
  // and which page link to highlight.
  const { pathname } = useLocation();
  const isLanding = pathname === '/';

  // Read the token fresh on every render. getValidToken() also treats an
  // expired token as "logged out" and removes it.
  const token = getValidToken();
  const isLoggedIn = Boolean(token);

  // Holds the logged-in user's profile info (name, email, githubUrl, leetcodeUsername)
  const [user, setUser] = useState(null);

  // Whether the mobile menu is open
  const [menuOpen, setMenuOpen] = useState(false);

  // Points at the <nav> element, so a click anywhere outside it can close the menu
  const navRef = useRef(null);

  // Runs whenever the login state (or the token itself) changes
  useEffect(() => {
    // Logged out: clear any profile left over from the previous user, so a
    // stale name/avatar never shows after logout (or for the next person to log in)
    if (!isLoggedIn) {
      setUser(null);
      return;
    }

    // Logged in: fetch the user's profile, needed for the avatar initial and dropdown content
    const fetchProfile = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const response = await api.get('/auth/profile', config);
        setUser(response.data);
      } catch (err) {
        // Silently ignore: if this fails, the avatar just won't have a name yet.
        // (An expired token is handled globally by the interceptor in services/api.js.)
      }
    };

    fetchProfile();
  }, [isLoggedIn, token]);

  // Listens for the "profile-updated" event sent by the Edit Profile page after
  // a successful save, so the avatar initial and the GitHub/LeetCode links in the
  // dropdown update immediately, without a page refresh.
  useEffect(() => {
    const handleProfileUpdated = (event) => {
      setUser(event.detail);
    };

    window.addEventListener('profile-updated', handleProfileUpdated);

    // Cleanup: stop listening when the Navbar is removed from the page
    return () => window.removeEventListener('profile-updated', handleProfileUpdated);
  }, []);

  // Close the mobile menu whenever the page changes (the user tapped one of its links)
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // While the mobile menu is open: close it on Escape, or on a click/tap outside the navbar.
  // (A full-screen invisible "click catcher" would be simpler, but the navbar's blur effect
  // makes position:fixed children relative to the navbar instead of the screen, so we
  // listen on the document instead.)
  useEffect(() => {
    if (!menuOpen) return;

    const handleMouseDown = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup: remove both listeners when the menu closes
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  return (
    // sticky top-0 = the navbar stays at the top while scrolling.
    // bg-white/80 = 80% opaque background, backdrop-blur-md = the content behind it shows blurred
    // (frosted glass effect). z-40 = above the page content, but below modals (z-50).
    <nav
      ref={navRef}
      className="sticky top-0 z-40 border-b border-gray-200/70 dark:border-gray-800/70 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md"
    >
      {/* max-w-7xl (1280px) is wider than the page content, so the logo sits
          further left and the right-side items further right, like LeetCode's navbar.
          This one container is shared by every page, logged in or out.
          px-4 on phones and px-6 from the "sm" breakpoint up: a little more room on small screens. */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Brand: logo + name, both clickable and leading back to the home page.
            tracking-tight = letters slightly closer together, which suits bold brand names. */}
        <Link
          to="/"
          className="flex items-center gap-2 text-lg font-bold tracking-tight text-gray-900 dark:text-gray-100"
        >
          <img src={codeloopLogo} alt="CodeLoop logo" className="h-7 w-7" />
          CodeLoop
        </Link>

        {/* gap-3 on phones, gap-5 from "sm" up: keeps Login + Sign Up on one line on a narrow screen */}
        <div className="flex items-center gap-3 sm:gap-5">
          {isLoggedIn ? (
            <>
              {/* Page links: only from "md" up. On phones they live in the hamburger menu below. */}
              <div className="hidden md:flex items-center gap-5">
                {APP_LINKS.map((link) => {
                  const isActive = pathname === link.to;

                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      aria-current={isActive ? 'page' : undefined}
                      className={getAppLinkClass(isActive)}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </div>

              {/* Hamburger button: phones only (md:hidden).
                  aria-expanded tells screen readers whether the menu is open;
                  aria-controls points at the menu's id below. */}
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={menuOpen}
                aria-controls="mobile-menu"
                className="md:hidden rounded-lg p-2 text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                {menuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>

              {/* Profile avatar + dropdown (includes the theme switch).
                  Pressing the avatar area closes the hamburger menu, so the two
                  menus are never open on top of each other. */}
              <div onMouseDown={() => setMenuOpen(false)}>
                <ProfileMenu user={user} />
              </div>
            </>
          ) : (
            <>
              {/* Section links: only on the landing page, and hidden on small screens
                  (hidden md:flex) so they don't crowd the Login and Sign Up buttons.
                  They are buttons, not links, because they scroll instead of navigating. */}
              {isLanding && (
                <>
                  <div className="hidden md:flex items-center gap-6">
                    {LANDING_LINKS.map((link) => (
                      <button
                        key={link.id}
                        type="button"
                        onClick={() => scrollToSection(link.id)}
                        className={NAV_LINK}
                      >
                        {link.label}
                      </button>
                    ))}
                  </div>

                  {/* Thin vertical divider between the section links and the account actions */}
                  <span className="hidden md:block h-5 w-px bg-gray-200 dark:bg-gray-800" />
                </>
              )}

              <ThemeToggle />
              <Link to="/login" className={NAV_LINK}>
                Login
              </Link>

              {/* Sign Up button: active:scale-95 = it presses down slightly when clicked (tactile feel) */}
              <Link
                to="/signup"
                className="text-sm font-medium px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm shadow-blue-600/20 hover:bg-blue-500 active:scale-95 transition"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>

      {/* ----- Mobile menu (logged-in users, phones only) -----
          It is always in the page and opens by growing from 0 to its full height: the grid row
          goes from 0fr (closed) to 1fr (open), and the inner div has overflow-hidden so its
          content is clipped while the row is small. "invisible" (with a matching transition)
          also takes the closed links out of the keyboard tab order, so nobody tabs into
          links they cannot see. */}
      {isLoggedIn && (
        <div
          className={`md:hidden grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
            menuOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          }`}
        >
          <div
            className={`overflow-hidden transition-[visibility] duration-300 ${
              menuOpen ? 'visible' : 'invisible'
            }`}
          >
            <ul
              id="mobile-menu"
              className="border-t border-gray-200/70 dark:border-gray-800/70 px-4 py-3 space-y-1"
            >
              {APP_LINKS.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.to;

                return (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      aria-current={isActive ? 'page' : undefined}
                      className={getMobileLinkClass(isActive)}
                    >
                      <Icon className="h-4 w-4" />
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;