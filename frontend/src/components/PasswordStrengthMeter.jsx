// components/PasswordStrengthMeter.jsx
// Shown under the password box on the Signup page. It has two parts:
//   1. A 4-segment colored bar with a label (Weak / Fair / Good / Strong)
//   2. A checklist where each rule turns green with a tick as soon as it is met
// It only DISPLAYS what it is given; all the rule logic lives in utils/validators.js.

import { Check, Circle } from 'lucide-react';

// Bar color and label color for each strength level (1 = Weak ... 4 = Strong)
const barColor = {
  1: 'bg-red-500',
  2: 'bg-orange-500',
  3: 'bg-amber-400',
  4: 'bg-green-500',
};
const labelColor = {
  1: 'text-red-600 dark:text-red-400',
  2: 'text-orange-600 dark:text-orange-400',
  3: 'text-amber-600 dark:text-amber-400',
  4: 'text-green-600 dark:text-green-400',
};

function PasswordStrengthMeter({ rules, strength }) {
  return (
    <div className="mt-2">
      {/* Four segments; the first `score` of them are filled with the level's color */}
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4].map((segment) => (
          <div
            key={segment}
            className={`h-1.5 flex-1 rounded-full ${
              segment <= strength.score ? barColor[strength.score] : 'bg-gray-200 dark:bg-gray-700'
            }`}
          />
        ))}
        <span className={`ml-1 w-12 text-xs font-medium ${labelColor[strength.score] || ''}`}>
          {strength.label}
        </span>
      </div>

      {/* The checklist of rules */}
      <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
        {rules.map((rule) => (
          <li
            key={rule.id}
            className={`flex items-center gap-2 text-xs ${
              rule.passed
                ? 'text-green-600 dark:text-green-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {rule.passed ? (
              <Check size={13} strokeWidth={3} className="shrink-0" />
            ) : (
              <Circle size={13} className="shrink-0" />
            )}
            {rule.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default PasswordStrengthMeter;