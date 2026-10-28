// pages/Landing.jsx
// The landing page: the first thing visitors see. It explains the problem CodeLoop
// solves (forgetting what you practiced), shows how the product works and answers
// common questions, with signup/login links along the way.
//
// Section order (the ids are used by the anchor links in components/Navbar.jsx):
//   hero (+ product preview) > stats strip > without/with comparison > forgetting curve
//   > #how-it-works > #features > #faq > final call to action > footer
//
// REDESIGN NOTES (kya badla aur kyun):
// - Alternating grey/white bands hata diye. Ab poora page ek hi background par hai aur
//   sections ko sirf spacing se alag kiya hai: ye "clean" look ka sabse bada raaz hai.
// - Cards ab rounded-2xl, halki border, hover par thoda upar uthte hain.
// - Hero me glow + grid + ek fake product preview, taaki visitor ko turant dikhe ki app kaisi hai.
// - Har section scroll karne par <Reveal> se smoothly fade-in hota hai.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronDown,
  Check,
  X,
  ListChecks,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import Reveal from '../components/Reveal';

// ---------- Forgetting curve chart ----------
// This chart is an illustration of the idea, not a calendar. It deliberately shows
// no day numbers, so it can never disagree with the real gaps (1, 3, 7, 15, then every
// 30 days) that the Revision page shows. Each segment has the same width, and each
// revision makes the next drop shallower.

// The first solve plus four revisions, each one a segment of the same length
const SEGMENT_LENGTH = 6;
const LABELS = ['Solved', 'Revision 1', 'Revision 2', 'Revision 3', 'Revision 4'];
const TOTAL_TIME = LABELS.length * SEGMENT_LENGTH;

// How much memory is left at the END of each segment (just before the next revision).
// The values rise because every revision makes the memory last longer.
const END_LEVELS = [0.35, 0.5, 0.62, 0.72, 0.8];

// The drawing area inside the SVG (the SVG viewBox is 560 x 340).
// The space around it is left for the axis labels.
const CHART = { left: 60, right: 540, top: 36, bottom: 272 };

// Convert a time value into an x position, and a memory level (0 to 1) into a y position
const xFor = (time) => CHART.left + (time / TOTAL_TIME) * (CHART.right - CHART.left);
const yFor = (level) => CHART.bottom - level * (CHART.bottom - CHART.top);

// Times at which a segment starts: these are the "Solved" and "Revision" peaks
const PEAK_TIMES = LABELS.map((_, i) => i * SEGMENT_LENGTH);

// Line for "no revision": memory simply decays and never recovers
function buildForgetPath() {
  let path = '';
  for (let time = 0; time <= TOTAL_TIME; time += 0.5) {
    const level = Math.exp(-time / 4);
    path += `${time === 0 ? 'M' : 'L'}${xFor(time).toFixed(1)} ${yFor(level).toFixed(1)} `;
  }
  return path;
}

// Line for "with revision": memory decays, jumps back to 100% at every revision,
// and each decay is slower than the one before it
function buildRevisionPath() {
  let path = '';

  END_LEVELS.forEach((endLevel, i) => {
    const start = i * SEGMENT_LENGTH;
    // Pick the decay speed so the memory ends the segment at exactly "endLevel"
    const stability = -SEGMENT_LENGTH / Math.log(endLevel);

    for (let s = 0; s <= 24; s += 1) {
      const time = start + (SEGMENT_LENGTH * s) / 24;
      const level = Math.exp(-(time - start) / stability);
      path += `${path === '' ? 'M' : 'L'}${xFor(time).toFixed(1)} ${yFor(level).toFixed(1)} `;
    }
  });

  return path;
}

// Built once when the file loads, not on every render
const FORGET_PATH = buildForgetPath();
const REVISION_PATH = buildRevisionPath();

// The same revision line, closed down to the baseline, used for the soft blue fill under it
const REVISION_AREA = `${REVISION_PATH} L${xFor(TOTAL_TIME).toFixed(1)} ${yFor(0).toFixed(1)} L${xFor(0).toFixed(1)} ${yFor(0).toFixed(1)} Z`;

function ForgettingCurve() {
  const yTicks = [0, 0.5, 1];

  return (
    <svg
      viewBox="0 0 560 340"
      className="w-full h-auto"
      role="img"
      aria-label="Illustration comparing memory over time with and without revision"
    >
      {/* Axis title for the vertical axis */}
      <text x={CHART.left} y="18" fontSize="14" className="fill-gray-500 dark:fill-gray-400">
        Memory retained
      </text>

      {/* Horizontal grid lines (dashed) with percentage labels */}
      {yTicks.map((level) => (
        <g key={level}>
          <line
            x1={CHART.left}
            x2={CHART.right}
            y1={yFor(level)}
            y2={yFor(level)}
            strokeDasharray="3 5"
            className="stroke-gray-200 dark:stroke-gray-800"
          />
          <text
            x={CHART.left - 12}
            y={yFor(level) + 5}
            textAnchor="end"
            fontSize="14"
            className="fill-gray-500 dark:fill-gray-400"
          >
            {level * 100}%
          </text>
        </g>
      ))}

      {/* Faint vertical guides from each peak down to the labels, one per revision */}
      {PEAK_TIMES.map((time) => (
        <line
          key={time}
          x1={xFor(time)}
          x2={xFor(time)}
          y1={yFor(1)}
          y2={yFor(0)}
          strokeDasharray="3 5"
          className="stroke-gray-200 dark:stroke-gray-800"
        />
      ))}

      {/* Labels under the baseline: Solved, Revision 1, Revision 2 ... */}
      {PEAK_TIMES.map((time, i) => (
        <text
          key={LABELS[i]}
          x={xFor(time)}
          y={CHART.bottom + 24}
          textAnchor={i === 0 ? 'start' : 'middle'}
          fontSize="13"
          className="fill-gray-500 dark:fill-gray-400"
        >
          {LABELS[i]}
        </text>
      ))}
      <text
        x={(CHART.left + CHART.right) / 2}
        y="330"
        textAnchor="middle"
        fontSize="14"
        className="fill-gray-500 dark:fill-gray-400"
      >
        Time
      </text>

      {/* Soft blue fill under the revision line */}
      <path d={REVISION_AREA} className="fill-blue-500/10" />

      {/* Without revision: dashed grey line */}
      <path
        d={FORGET_PATH}
        fill="none"
        strokeWidth="3"
        strokeDasharray="7 6"
        strokeLinecap="round"
        className="stroke-gray-400 dark:stroke-gray-500"
      />

      {/* With revision: solid blue line that climbs back up after every revision */}
      <path
        d={REVISION_PATH}
        fill="none"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-blue-500"
      />

      {/* A dot on each peak: the first solve and every revision.
          The ring uses the chart card's own background color (gray-50 / gray-900)
          so the dot looks cut out of the line. */}
      {PEAK_TIMES.map((time) => (
        <circle
          key={time}
          cx={xFor(time)}
          cy={yFor(1)}
          r="6"
          strokeWidth="3"
          className="fill-blue-500 stroke-gray-50 dark:stroke-gray-900"
        />
      ))}
    </svg>
  );
}

// ---------- Page content (kept as data so the JSX below stays short) ----------

// Hero ke neeche wali 3 chhoti "facts". Sab kuch wahi hai jo app me sach me hai.
// Yahan kisi ek sheet ka number nahi likha, taaki naye sheets aane par ye badalna na pade.
const STATS = [
  { value: 'Your problems', label: 'start with NeetCode 150 or add your own' },
  { value: '1 · 3 · 7 · 15 · 30d', label: 'automatic revision gaps' },
  { value: 'Free', label: 'email, Google or GitHub signup' },
];

// Hero me dikhne wale fake "Revision" card ki rows (sirf dikhane ke liye, real data nahi)
const PREVIEW_ROWS = [
  { name: 'Two Sum', topic: 'Arrays & Hashing', level: 'Easy', step: 'Revision 2' },
  { name: 'Group Anagrams', topic: 'Arrays & Hashing', level: 'Medium', step: 'Revision 1' },
  { name: 'Container With Most Water', topic: 'Two Pointers', level: 'Medium', step: 'Revision 3' },
  { name: 'Trapping Rain Water', topic: 'Two Pointers', level: 'Hard', step: 'Revision 1' },
];

// Difficulty badge ke colors. Key wahi hai jo PREVIEW_ROWS me "level" hai.
const LEVEL_STYLES = {
  Easy: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  Hard: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
};

// Left and right cards of the comparison section
const WITHOUT_ITEMS = [
  'You solve a problem, feel good about it and move on to the next one.',
  'A few weeks later you cannot remember the approach you used.',
  'Revision depends on you remembering to go back, so it rarely happens.',
  'A week before an interview, problems from your first month look brand new.',
];

const WITH_ITEMS = [
  'Marking a problem as solved schedules its first revision automatically.',
  'Each revision comes after a longer gap: 1 day, then 3, 7, 15 and then every 30 days.',
  'The notes you wrote last time are waiting when you open it again.',
  'By interview week you have seen every problem several times.',
];

// The three steps in "How it works"
const STEPS = [
  {
    icon: ListChecks,
    title: 'Pick a sheet',
    text: 'Choose a problem sheet to start with, or add your own problems. More sheets are coming soon.',
  },
  {
    icon: CheckCircle2,
    title: 'Solve and mark it',
    text: 'Solve the problem wherever you practice, mark it solved here and write a short note on your approach.',
  },
  {
    icon: RefreshCw,
    title: 'Revise when it is due',
    text: 'Open the Revision page each day. Anything due today is already listed for you.',
  },
];

// Spaced Revision card ke bars: gap jitna bada, bar utna lamba.
// Height ki classes poori likhi hain (dynamic nahi) kyunki Tailwind sirf poore class names dhoondhta hai.
const REVISION_BARS = [
  { label: '1d', height: 'h-5' },
  { label: '3d', height: 'h-9' },
  { label: '7d', height: 'h-14' },
  { label: '15d', height: 'h-20' },
  { label: '30d', height: 'h-28' },
];

// Activity Heatmap ka sample data: 112 digits = 16 hafte x 7 din.
// Har digit ek din ki activity hai (0 = kuch nahi ... 4 = bahut zyada).
// Random function ki jagah fixed string rakhi hai, taaki har render par same pattern dikhe.
const HEATMAP_DATA =
  '0042111022003101010403000023042224243001100312243311004103103424340234442442402132342423321100443022341434340422';
const HEATMAP_LEVELS = HEATMAP_DATA.split('').map(Number);

// Level (0-4) -> cell ka color. Jitna bada level, utna gehra blue.
const HEATMAP_COLORS = [
  'bg-gray-200 dark:bg-gray-800',
  'bg-blue-200 dark:bg-blue-950',
  'bg-blue-300 dark:bg-blue-800',
  'bg-blue-400 dark:bg-blue-600',
  'bg-blue-500 dark:bg-blue-400',
];

// Questions and answers for the FAQ accordion
const FAQS = [
  {
    question: 'What is spaced revision?',
    answer:
      'Instead of rereading everything at once, you revisit a problem after gaps that keep growing. In CodeLoop the gap after each revision is 1 day, then 3, 7 and 15 days, and then every 30 days after that. Every review pushes the problem further into long-term memory.',
  },
  {
    question: 'Which problem sheets are supported?',
    answer:
      'NeetCode 150 is available right now, and more sheets are being added soon. You can also add your own custom problems, and they get the same revision schedule as everything else.',
  },
  {
    question: 'Is it free?',
    answer:
      'Yes. You can sign up with email, Google or GitHub and use every feature at no cost.',
  },
  {
    question: 'Is my data safe?',
    answer:
      'Passwords are hashed before they are stored, so they are never saved as plain text. If you prefer, you can skip passwords and sign in with Google or GitHub. Your progress and notes are only visible to you.',
  },
];

// ---------- Small reusable pieces ----------

// Har section ke upar ka heading block: chhota label + bada title + optional subtitle.
// Ek jagah define kiya hai taaki saare sections ka heading style same rahe.
function SectionHeader({ eyebrow, title, subtitle }) {
  return (
    <div className="max-w-2xl mx-auto text-center mb-14">
      {/* eyebrow = title ke upar ka chhota blue label, jaise "How it works" */}
      <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-3">{eyebrow}</p>
      <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 text-base md:text-lg text-gray-600 dark:text-gray-400">{subtitle}</p>
      )}
    </div>
  );
}

// Hero ke neeche wala fake product window. Sirf styled <div>s hain, koi image nahi,
// isliye light/dark dono theme me apne aap sahi dikhta hai aur load bhi turant hota hai.
function ProductPreview() {
  return (
    // aria-hidden = screen readers ise skip karenge, kyunki ye sirf decoration hai
    <div aria-hidden="true" className="relative mx-auto mt-16 max-w-3xl">
      {/* Window ke peeche ka blue glow */}
      <div className="absolute -inset-x-6 -inset-y-4 -z-10 rounded-[2rem] bg-gradient-to-b from-blue-500/20 to-violet-500/10 blur-2xl" />

      <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xl shadow-blue-900/10 dark:shadow-black/40 text-left">
        {/* Window ka title bar: 3 dots + page ka naam */}
        <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-gray-300 dark:bg-gray-700" />
          <span className="h-2.5 w-2.5 rounded-full bg-gray-300 dark:bg-gray-700" />
          <span className="h-2.5 w-2.5 rounded-full bg-gray-300 dark:bg-gray-700" />
          <span className="ml-3 text-xs text-gray-500 dark:text-gray-400">Revision</span>
        </div>

        <div className="p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Due today</h3>
            <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400">
              {PREVIEW_ROWS.length} problems
            </span>
          </div>

          {/* Har row: left me problem ka naam + topic, right me difficulty + revision number */}
          <ul className="space-y-2">
            {PREVIEW_ROWS.map((row) => (
              <li
                key={row.name}
                className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/60 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                    {row.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{row.topic}</p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${LEVEL_STYLES[row.level]}`}>
                    {row.level}
                  </span>
                  {/* hidden sm:inline = bahut chhoti screen par ye label chhupa do, jagah bachane ke liye */}
                  <span className="hidden sm:inline text-xs text-gray-500 dark:text-gray-400">
                    {row.step}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// Hero ke elements par lagne wali entrance animation. motion-reduce = jinhone OS me
// animations band ki hain unke liye animation skip ho jayegi.
const FADE_UP = 'animate-fade-up motion-reduce:animate-none';

// Cards ki common styling ek jagah: gol kone, patli border, halka shadow,
// aur hover par thoda upar uthna. Badalna ho to sirf yahan badlo.
const CARD =
  'h-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-700';

function Landing() {
  // Index of the FAQ item that is currently open (null means all closed).
  // Only one item is open at a time; the first one starts open.
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <div>
      {/* ================= HERO ================= */}
      {/* relative + isolate: background decoration (-z-10) is section ke andar hi rehta hai,
          page ke baaki hisso ke peeche nahi jata. overflow-hidden glow ko section ke bahar nahi failne deta. */}
      <section className="relative isolate overflow-hidden">
        {/* Background decoration: grid + do blurred glow. pointer-events-none = click inke aar-paar jayega */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
          <div className="hero-grid absolute inset-0" />
          <div className="absolute left-1/2 top-[-180px] h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-blue-500/20 blur-[110px] dark:bg-blue-600/25" />
          <div className="absolute right-[8%] top-10 h-[240px] w-[320px] rounded-full bg-violet-500/10 blur-[100px] dark:bg-violet-600/15" />
        </div>

        <div className="max-w-6xl mx-auto px-6 pt-20 pb-24 md:pt-28 text-center">
          {/* Chhota badge pill, headline ke upar */}
          <div
            className={`${FADE_UP} inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/70 px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 backdrop-blur`}
          >
            <Sparkles className="h-3.5 w-3.5 text-blue-500" />
            Spaced revision for DSA problems
          </div>

          {/* Headline: leading-[1.05] = lines paas paas, tracking-tight = letters thode paas.
              Dono milke bade headings ko "designed" look dete hain.
              Gradient text: bg-gradient + bg-clip-text + text-transparent.
              pb-2 + inline-block isliye ki "g" jaise letters ka neeche wala hissa kat na jaye. */}
          <h1
            style={{ animationDelay: '80ms' }}
            className={`${FADE_UP} mt-6 text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.05] text-gray-900 dark:text-white`}
          >
            Solve it once.
            <br />
            <span className="inline-block pb-2 bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-500 dark:from-blue-400 dark:via-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">
              Remember it for good.
            </span>
          </h1>

          <p
            style={{ animationDelay: '160ms' }}
            className={`${FADE_UP} mx-auto mt-5 max-w-2xl text-lg md:text-xl text-gray-600 dark:text-gray-400`}
          >
            CodeLoop schedules your problem revisions automatically, so you revisit what you
            solved before you forget it, not months too late.
          </p>

          {/* Two CTA buttons side by side (mobile par ek ke neeche ek: flex-col sm:flex-row) */}
          <div
            style={{ animationDelay: '240ms' }}
            className={`${FADE_UP} mt-9 flex flex-col sm:flex-row items-center justify-center gap-3`}
          >
            {/* "group" = is Link ke andar ke elements group-hover: se Link par hover pe react kar sakte hain.
                Yahan arrow icon hover par thoda aage khiskta hai. */}
            <Link
              to="/signup"
              className="group inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-500 hover:shadow-blue-500/30 active:scale-[0.98]"
            >
              Get Started
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center rounded-xl border border-gray-300 dark:border-gray-700 bg-white/60 dark:bg-gray-900/40 px-6 py-3 text-sm font-semibold text-gray-700 dark:text-gray-200 backdrop-blur transition hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-[0.98]"
            >
              Login
            </Link>
          </div>

          {/* Product preview window */}
          <div style={{ animationDelay: '360ms' }} className={FADE_UP}>
            <ProductPreview />
          </div>
        </div>
      </section>

      {/* ================= STATS STRIP ================= */}
      {/* Teen chhoti facts. Mobile par ek ke neeche ek (divide-y), bade screen par side by side (sm:divide-x) */}
      <section className="border-y border-gray-200 dark:border-gray-800">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-200 dark:divide-gray-800">
          {STATS.map((stat) => (
            <div key={stat.label} className="px-6 py-8 text-center">
              <p className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= WITHOUT vs WITH ================= */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <Reveal>
          <SectionHeader
            eyebrow="The problem"
            title="Solving is not the same as remembering"
            subtitle="Most people grind hundreds of problems and still blank out in the interview. The missing piece is revision."
          />
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Without CodeLoop: neutral card, grey cross icons.
              Reveal ko h-full diya hai taaki dono cards same height ke rahein. */}
          <Reveal className="h-full">
            <div className={`${CARD} p-7`}>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-5">
                Without CodeLoop
              </h3>
              <ul className="space-y-4">
                {WITHOUT_ITEMS.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400">
                    {/* Icon ko gol grey tile me rakha hai, sirf bare icon se zyada polished lagta hai */}
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                      <X className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          {/* With CodeLoop: blue tinted card with a soft gradient, blue check icons */}
          <Reveal delay={120} className="h-full">
            <div
              className={`${CARD} p-7 !border-blue-200 dark:!border-blue-900/60 bg-gradient-to-b from-blue-50 to-white dark:from-blue-950/50 dark:to-gray-900/40`}
            >
              <h3 className="text-base font-semibold text-blue-900 dark:text-blue-200 mb-5">
                With CodeLoop
              </h3>
              <ul className="space-y-4">
                {WITH_ITEMS.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-gray-700 dark:text-blue-100/90">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/15">
                      <Check className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================= FORGETTING CURVE ================= */}
      {/* Text on the left, chart inside a card on the right (stacked on mobile). */}
      <section className="max-w-6xl mx-auto px-6 pb-24 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <Reveal>
          <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-3">The science</p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-5">
            Memory fades faster than you think
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Right after you learn something, you start forgetting it. A problem you never
            look at again is mostly gone within a few weeks.
          </p>
          <p className="text-gray-600 dark:text-gray-400">
            A revision resets the curve, and the next drop is slower than the last one.
            CodeLoop schedules those revisions for you, so each one lands just before the
            problem slips away.
          </p>
        </Reveal>

        <Reveal delay={120}>
          {/* IMPORTANT: is card ka background bg-gray-50 / dark:bg-gray-900 hi rehna chahiye.
              Chart ke dots ka ring (stroke-gray-50 / dark:stroke-gray-900) isi color se match karta hai,
              tabhi dot line me "cut out" jaisa dikhta hai. Color badlo to chart ke stroke bhi badlo. */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-6 bg-gray-50 dark:bg-gray-900 shadow-sm">
            <ForgettingCurve />

            {/* Legend: a small line sample next to each label */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-4 text-sm text-gray-700 dark:text-gray-300">
              <span className="flex items-center gap-2">
                <span className="inline-block w-6 border-t-2 border-blue-500" />
                With CodeLoop revisions
              </span>
              <span className="flex items-center gap-2">
                <span className="inline-block w-6 border-t-2 border-dashed border-gray-400 dark:border-gray-500" />
                No revision
              </span>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
              Illustration of the forgetting curve idea, not measured data. Each revision
              comes after a longer gap than the one before.
            </p>
          </div>
        </Reveal>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      {/* scroll-mt-24 = navbar ab sticky hai, isliye scroll karne par heading navbar ke neeche
          na chhup jaye, uske liye upar 96px ki jagah chhodi hai */}
      <section id="how-it-works" className="scroll-mt-24 max-w-6xl mx-auto px-6 pb-24">
        <Reveal>
          <SectionHeader
            eyebrow="How it works"
            title="Three steps, then it runs itself"
            subtitle="You only do the solving. CodeLoop handles the remembering."
          />
        </Reveal>

        {/* One column on mobile, three columns from the md breakpoint up */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map((step, index) => {
            // Components must start with a capital letter in JSX, so copy the icon into one
            const Icon = step.icon;
            return (
              // delay={index * 120}: pehla card turant, doosra 120ms baad, teesra 240ms baad (stagger effect)
              <Reveal key={step.title} delay={index * 120} className="h-full">
                <div className={`${CARD} p-7`}>
                  <div className="flex items-center justify-between mb-6">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10">
                      <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </span>
                    {/* padStart(2,'0') : 1 -> "01", 2 -> "02" */}
                    <span className="text-sm font-semibold text-gray-300 dark:text-gray-700">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{step.text}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ================= FEATURES ================= */}
      <section id="features" className="scroll-mt-24 max-w-6xl mx-auto px-6 pb-24">
        <Reveal>
          <SectionHeader
            eyebrow="Features"
            title="Built for one job: making problems stick"
          />
        </Reveal>

        {/* Teen cards. Har card me upar ek chhota visual, neeche title + text */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* ---- Feature 1: Spaced Revision (bars jinki height badhti jati hai) ---- */}
          <Reveal className="h-full">
            <div className={`${CARD} p-6`}>
              <div className="mb-6 flex h-48 items-end justify-center gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/60 p-4">
                {REVISION_BARS.map((bar) => (
                  <div key={bar.label} className="flex flex-col items-center gap-2">
                    <div className={`w-8 rounded-t-md bg-gradient-to-t from-blue-600 to-blue-400 ${bar.height}`} />
                    <span className="text-xs text-gray-500 dark:text-gray-400">{bar.label}</span>
                  </div>
                ))}
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">Spaced Revision</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                The gap before each revision keeps growing: 1 day, then 3, 7, 15 and then
                every 30 days, so the problem moves into long-term memory instead of fading.
              </p>
            </div>
          </Reveal>

          {/* ---- Feature 2: Activity Heatmap (16 hafte x 7 din ka grid) ---- */}
          <Reveal delay={120} className="h-full">
            <div className={`${CARD} p-6`}>
              <div className="mb-6 flex h-48 items-center justify-center rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/60 p-4">
                {/* grid-rows-7 + grid-flow-col = cells upar se neeche bharte hain (ek column = ek hafta) */}
                <div className="grid grid-flow-col grid-rows-7 gap-1">
                  {HEATMAP_LEVELS.map((level, i) => (
                    <span key={i} className={`h-3 w-3 rounded-sm ${HEATMAP_COLORS[level]}`} />
                  ))}
                </div>
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">Activity Heatmap</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                See your solving activity month by month, stay consistent and spot the gaps
                in your practice.
              </p>
            </div>
          </Reveal>

          {/* ---- Feature 3: Persistent Notes (ek chhota note card) ---- */}
          <Reveal delay={240} className="h-full">
            <div className={`${CARD} p-6`}>
              <div className="mb-6 flex h-48 items-center justify-center rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/60 p-4">
                <div className="w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 text-left shadow-sm">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    Two Sum · your note
                  </p>
                  <p className="font-mono text-xs leading-relaxed text-gray-600 dark:text-gray-300">
                    Hashmap of value to index.
                    <br />
                    Check the complement{' '}
                    <span className="text-blue-600 dark:text-blue-400">before</span> inserting.
                    <br />
                    One pass, O(n) time.
                  </p>
                </div>
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">Persistent Notes</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Write down your approach and tricks for each problem. Notes carry over to
                every revision, so earlier insights are never lost.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================= FAQ ================= */}
      <section id="faq" className="scroll-mt-24 max-w-3xl mx-auto px-6 pb-24">
        <Reveal>
          <SectionHeader eyebrow="FAQ" title="Frequently asked questions" />
        </Reveal>

        <Reveal>
          <div className="space-y-3">
            {FAQS.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={faq.question}
                  className={`rounded-2xl border bg-white dark:bg-gray-900/60 transition-colors ${
                    isOpen
                      ? 'border-gray-300 dark:border-gray-700'
                      : 'border-gray-200 dark:border-gray-800'
                  }`}
                >
                  {/* Clicking the question opens it, or closes it if it is already open */}
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left text-sm font-medium text-gray-900 dark:text-gray-100"
                  >
                    {faq.question}
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400 transition-transform duration-300 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* SMOOTH OPEN/CLOSE TRICK: pehle `{isOpen && <p>}` tha, jisme answer achanak
                      aa jata tha. Ab answer hamesha page me rehta hai, aur ye grid ki row
                      height 0fr (band) se 1fr (khula) tak animate hoti hai. Andar wala div
                      overflow-hidden hai, isliye content row ke saath hi chhota-bada hota hai. */}
                  <div
                    className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                      isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="px-5 pb-5 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>
      </section>

      {/* ================= FINAL CTA ================= */}
      {/* Pehle poori-width ka blue band tha. Ab ek rounded card hai jiske peeche glow hai. */}
      <section className="px-6 pb-24">
        <Reveal>
          <div className="relative isolate overflow-hidden mx-auto max-w-5xl rounded-3xl border border-blue-200 dark:border-blue-900/60 bg-gradient-to-b from-blue-50 to-white dark:from-blue-950/50 dark:to-gray-900/40 px-6 py-16 md:py-20 text-center">
            <div
              aria-hidden="true"
              className="absolute left-1/2 top-0 -z-10 h-64 w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/25 blur-[90px]"
            />
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-4">
              Start revising today
            </h2>
            <p className="mx-auto max-w-xl text-gray-600 dark:text-gray-400 mb-8">
              Create an account, mark your first problem as solved and your first revision is
              scheduled right away.
            </p>
            <Link
              to="/signup"
              className="group inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-500 active:scale-[0.98]"
            >
              Get Started
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500 dark:text-gray-400">
          {/* new Date().getFullYear() = saal apne aap update hota rahega, haath se badalna nahi padega */}
          <p>© {new Date().getFullYear()} CodeLoop</p>
          <div className="flex items-center gap-6">
            <Link to="/login" className="hover:text-gray-900 dark:hover:text-white transition-colors">
              Login
            </Link>
            <Link to="/signup" className="hover:text-gray-900 dark:hover:text-white transition-colors">
              Sign Up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Landing;