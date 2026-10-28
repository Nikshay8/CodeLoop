// components/StatCard.jsx
// One overview card: a colored icon, a big number and a label under it.
// Used on the Dashboard and the Analytics page.
//
// Props:
//   icon  - a lucide icon component
//   label - the small text under the number
//   value - the number (or text such as "25%")
//   tone  - the color of the icon tile: "blue", "green", "amber" or "violet"

import Card from './Card';

// Icon tile colors. Full class names are written out (not built from a variable)
// because Tailwind only generates classes it can find as complete strings.
const TONES = {
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  green: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
};

function StatCard({ icon: Icon, label, value, tone = 'blue' }) {
  return (
    <Card className="p-5">
      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${TONES[tone]}`}>
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-4 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{value}</p>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{label}</p>
    </Card>
  );
}

export default StatCard;