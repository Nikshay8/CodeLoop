// pages/Revision.jsx
// The revision schedule: problems due now at the top, and every upcoming
// revision below with how many days away it is.

import { useState, useEffect } from 'react';
import { ExternalLink, FileText, RotateCcw } from 'lucide-react';
import api from '../services/api';
import NotesModal from '../components/NotesModal';
import { getDaysUntil, formatRevisionLabel, formatShortDate } from '../utils/dateUtils';

const getLapsesLabel = (entry) => {
  const lapses = entry.lapses || 0;
  return lapses > 0 ? `Forgot ${lapses}×` : '';
};

function Revision() {
  // Every solved problem with a next revision date, earliest first (sorted by the backend)
  const [schedule, setSchedule] = useState([]);

  // ID of the problem whose notepad is open (null = closed)
  const [activeNoteProblemId, setActiveNoteProblemId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [notice, setNotice] = useState('');

  const getAuthConfig = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const fetchSchedule = async () => {
    try {
      const response = await api.get('/progress/revisions', getAuthConfig());
      setSchedule(response.data);
      setError('');
    } catch (err) {
      setError('Failed to load revision schedule');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, []);

  useEffect(() => {
    if (!notice) return undefined;

    const timer = setTimeout(() => setNotice(''), 6000);
    return () => clearTimeout(timer);
  }, [notice]);

  const handleMarkRevised = async (problemId) => {
    setNotice('');

    try {
      await api.patch(`/progress/${problemId}/done`, {}, getAuthConfig());
      fetchSchedule();
    } catch (err) {
      setError('Failed to mark as revised');
    }
  };

  const handleCantRecall = async (problem) => {
    setNotice('');

    try {
      await api.patch(`/progress/${problem._id}/cant-recall`, {}, getAuthConfig());
      setNotice(
        `"${problem.title}" will come back tomorrow, and its revision cycle starts again from day 1.`
      );
      fetchSchedule();
    } catch (err) {
      setError("Failed to reset this problem's revision cycle");
    }
  };

  const handleSaveNotes = async (problemId, noteText) => {
    try {
      await api.patch(`/progress/${problemId}/notes`, { note: noteText }, getAuthConfig());
      setActiveNoteProblemId(null);
      fetchSchedule();
    } catch (err) {
      setError('Failed to save notes');
    }
  };

  if (loading) return <p className="p-6">Loading revision schedule...</p>;

  const validEntries = schedule.filter((entry) => entry.problemId);
  const dueEntries = validEntries.filter((entry) => getDaysUntil(entry.nextRevisionDate) <= 0);
  const upcomingEntries = validEntries.filter((entry) => getDaysUntil(entry.nextRevisionDate) > 0);

  const activeEntry = schedule.find(
    (entry) => entry.problemId && entry.problemId._id === activeNoteProblemId
  );

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">Revision</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
        Solved problems come back after 1, 3, 7, 15 and then every 30 days.
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Solved it from memory? Mark Revised. Needed the solution or a big hint? Hit Can't Recall
        and the problem restarts from day 1.
      </p>

      {error && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded p-2">
          {error}
        </p>
      )}

      {notice && (
        <p className="mb-4 text-sm text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded p-2">
          {notice}
        </p>
      )}

      {validEntries.length === 0 ? (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-900 shadow-sm text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No revisions scheduled yet. Mark a problem as solved on the Problems page and
            its next revision date will show up here.
          </p>
        </div>
      ) : (
        <>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Due now ({dueEntries.length})
          </h2>

          {dueEntries.length === 0 ? (
            <p className="mb-8 text-sm text-gray-500 dark:text-gray-400">
              Nothing due today. Your next revision is listed below.
            </p>
          ) : (
            <div className="mb-8">
              {dueEntries.map((entry) => {
                const problem = entry.problemId;
                // revisionCount includes the first solve, so revisions done = count - 1
                const revisionsDone = entry.revisionCount - 1;
                const lapsesLabel = getLapsesLabel(entry);

                return (
                  <div
                    key={entry._id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-3 bg-white dark:bg-gray-900 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                          {problem.title}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {problem.topic} • {problem.difficulty} •{' '}
                          {revisionsDone === 0
                            ? 'Not revised yet'
                            : `Revised ${revisionsDone} time${revisionsDone === 1 ? '' : 's'}`}
                          {lapsesLabel && (
                            <>
                              {' '}
                              •{' '}
                              <span className="text-amber-600 dark:text-amber-400">
                                {lapsesLabel}
                              </span>
                            </>
                          )}
                        </p>
                      </div>

                      <span className="text-xs font-medium px-2 py-1 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                        {formatRevisionLabel(entry.nextRevisionDate)}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      <a
                        href={problem.link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Solve on LeetCode
                        <ExternalLink size={13} />
                      </a>

                      <button
                        onClick={() => setActiveNoteProblemId(problem._id)}
                        className="inline-flex items-center gap-1.5 text-sm px-3 py-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <FileText size={14} />
                        Notes
                      </button>

                      <button
                        onClick={() => handleCantRecall(problem)}
                        title="Couldn't solve it from memory? Restart this problem's revision cycle from day 1"
                        className="inline-flex items-center gap-1.5 text-sm px-3 py-1 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 rounded hover:bg-amber-50 dark:hover:bg-amber-950/40"
                      >
                        <RotateCcw size={14} />
                        Can't Recall
                      </button>

                      <button
                        onClick={() => handleMarkRevised(problem._id)}
                        className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Mark Revised
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Upcoming ({upcomingEntries.length})
          </h2>

          {upcomingEntries.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No upcoming revisions.</p>
          ) : (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 shadow-sm divide-y divide-gray-100 dark:divide-gray-800">
              {upcomingEntries.map((entry) => {
                const lapsesLabel = getLapsesLabel(entry);

                return (
                  <div key={entry._id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {entry.problemId.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {entry.problemId.topic} • {entry.problemId.difficulty}
                        {lapsesLabel && (
                          <>
                            {' '}
                            •{' '}
                            <span className="text-amber-600 dark:text-amber-400">
                              {lapsesLabel}
                            </span>
                          </>
                        )}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {formatRevisionLabel(entry.nextRevisionDate)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatShortDate(entry.nextRevisionDate)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeEntry && (
        <NotesModal
          key={activeEntry._id}
          problemTitle={activeEntry.problemId.title}
          initialNotes={activeEntry.notes}
          onSave={(text) => handleSaveNotes(activeEntry.problemId._id, text)}
          onClose={() => setActiveNoteProblemId(null)}
        />
      )}
    </div>
  );
}

export default Revision;