// components/AuthLayout.jsx
// The frame shared by every authentication page: a soft glowing background and a
// centered card with a title. The page itself only supplies the form as children.
// This keeps all auth pages looking identical, and the look can be changed here once.
//
// Props:
//   title    - the big heading of the card
//   subtitle - the grey line under the heading (can be text or JSX)
//   icon     - optional lucide icon component shown in a small tile above the title
//   iconSpin - make the icon rotate (used for the loading spinner on the GitHub callback page)
//   centered - center the text (used by the GitHub callback page)

// A thin line with "or" in the middle. Used between the form and the social buttons.
export function AuthDivider() {
  return (
    <div className="my-6 flex items-center gap-3">
      <div className="flex-1 border-t border-gray-200 dark:border-gray-800" />
      <span className="text-xs text-gray-400 dark:text-gray-500">or</span>
      <div className="flex-1 border-t border-gray-200 dark:border-gray-800" />
    </div>
  );
}

function AuthLayout({ title, subtitle, icon: Icon, iconSpin = false, centered = false, children }) {
  return (
    // min-h-[calc(100vh-4rem)]: the Navbar (about 4rem tall) already sits above this page,
    // so using a full 100vh here would make the page taller than the screen and add a
    // pointless scrollbar. isolate keeps the -z-10 background inside this block.
    <div className="relative isolate flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 py-10">
      {/* Background: faint grid (class defined in index.css) + one blurred blue glow */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="hero-grid absolute inset-0" />
        <div className="absolute left-1/2 top-[-120px] h-[360px] w-[640px] -translate-x-1/2 rounded-full bg-blue-500/20 blur-[100px] dark:bg-blue-600/20" />
      </div>

      {/* The card. It fades up when the page opens (animation defined in tailwind.config.js) */}
      <div
        className={`animate-fade-up motion-reduce:animate-none w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/70 p-6 shadow-xl shadow-blue-900/5 dark:shadow-black/30 backdrop-blur sm:p-8 ${
          centered ? 'text-center' : ''
        }`}
      >
        {Icon && (
          <span
            className={`mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 ${
              centered ? 'mx-auto' : ''
            }`}
          >
            {/* motion-reduce: people who turned off animations in their OS get a still icon */}
            <Icon
              className={`h-5 w-5 text-blue-600 dark:text-blue-400 ${
                iconSpin ? 'animate-spin motion-reduce:animate-none' : ''
              }`}
            />
          </span>
        )}

        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{title}</h1>

        {subtitle && (
          <p className="mt-2 mb-6 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
        )}

        {children}
      </div>
    </div>
  );
}

export default AuthLayout;