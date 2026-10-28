// components/Skeleton.jsx
// A grey pulsing placeholder block shown while a page is loading. Pages build a
// "skeleton" out of these in the same shape as the real content, which feels much
// faster than a plain "Loading..." text because the layout does not jump when the
// data arrives. Size and shape come from className (for example "h-8 w-40").

function Skeleton({ className = '' }) {
  return (
    // motion-reduce:animate-none = a still grey block for people who turned off animations
    <div
      aria-hidden="true"
      className={`animate-pulse motion-reduce:animate-none rounded-lg bg-gray-200 dark:bg-gray-800 ${className}`}
    />
  );
}

export default Skeleton;