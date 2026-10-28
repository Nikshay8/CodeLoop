// components/AddProblemForm.jsx
// A form for adding a custom problem — only visible when toggled open on the Problems page.
// It doesn't talk to the backend itself; it passes the form data up via onAddProblem.
// The page closes the form after a successful save, which also empties it. If saving
// fails, the form stays open with everything the user typed, so nothing has to be retyped.

import { useState } from 'react';
import Card from './Card';

// Shared input styling, kept in one place so every field stays consistent in light and dark mode.
// [color-scheme:...] makes the browser draw the open dropdown list of the <select> in the
// matching theme (otherwise it can show light text on a white list).
const inputClass =
  'w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950/60 px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 [color-scheme:light] dark:[color-scheme:dark] transition focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20';

const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5';

function AddProblemForm({ onAddProblem, onClose }) {
  const [title, setTitle] = useState('');
  const [link, setLink] = useState('');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('Easy');

  const handleSubmit = (e) => {
    e.preventDefault();
    onAddProblem({ title, link, topic, difficulty });
  };

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">Add a custom problem</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="problem-title" className={labelClass}>Title</label>
          <input
            id="problem-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="problem-link" className={labelClass}>LeetCode Link</label>
          <input
            id="problem-link"
            type="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://leetcode.com/problems/..."
            required
            className={inputClass}
          />
        </div>

        {/* Topic and difficulty sit side by side from "sm" up, and stack on a phone */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="problem-topic" className={labelClass}>Topic</label>
            <input
              id="problem-topic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Array, Dynamic Programming"
              required
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="problem-difficulty" className={labelClass}>Difficulty</label>
            <select
              id="problem-difficulty"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className={inputClass}
            >
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-500 active:scale-[0.98]"
          >
            Add Problem
          </button>
          {/* type="button" so Cancel doesn't submit the form */}
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-300 dark:border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 transition hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-[0.98]"
          >
            Cancel
          </button>
        </div>
      </form>
    </Card>
  );
}

export default AddProblemForm;