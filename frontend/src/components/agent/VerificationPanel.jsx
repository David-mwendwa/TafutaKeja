import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient, { errorMessage } from '../../api/apiClient.js';
import { longDate } from '../../lib/format.js';
import Alert from '../../components/ui/Alert.jsx';

const Tick = ({ done }) =>
  done ? (
    <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0 text-primary-700" fill="none"
      stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ) : (
    <span
      aria-hidden="true"
      className="mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 border-dashed border-dark-300 dark:border-dark-600"
    />
  );

/**
 * What an unverified agent has to do to get the badge, and the button that puts
 * them in front of the team.
 *
 * The steps are fetched, not written here: the server decides whether a request
 * is accepted, so a list typed into this component is a list that can tell an
 * agent they are ready when the endpoint disagrees.
 */
export const VerificationPanel = () => {
  const [state, setState] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get('/users/me/verification')
      .then((data) => {
        if (!cancelled) setState(data.verification);
      })
      .catch(() => {
        // A panel about paperwork is not worth an error banner over the page an
        // agent came to work in — it simply does not appear.
        if (!cancelled) setState(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!state || state.verified) return null;

  const request = async () => {
    setBusy(true);
    setError('');
    try {
      const data = await apiClient.post('/users/me/verification');
      setState((s) => ({ ...s, requestedAt: data.requestedAt }));
    } catch (err) {
      setError(errorMessage(err, 'Could not send that request'));
    } finally {
      setBusy(false);
    }
  };

  const done = state.steps.filter((s) => s.done).length;

  return (
    <section aria-labelledby="verification-heading" className="card mt-5 p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="verification-heading" className="font-heading text-lg font-bold">
          Get the verified badge
        </h2>
        <p className="text-xs text-dark-500">
          {done} of {state.steps.length} done
        </p>
      </div>

      <p className="mt-1.5 text-sm text-dark-600 dark:text-dark-400">
        You can list and sell without it. The badge shows on your agent page and beside every
        listing you run, and unverified listings take longer to clear review.
      </p>

      <ol className="mt-4 space-y-3">
        {state.steps.map((step) => (
          <li key={step.key} className="flex gap-3">
            <Tick done={step.done} />
            <div className="min-w-0">
              <p className={`text-sm font-medium ${step.done ? 'text-dark-500 line-through' : ''}`}>
                {step.done ? (
                  step.label
                ) : (
                  <Link to={step.href} className="text-primary-700 hover:underline dark:text-primary-300">
                    {step.label}
                  </Link>
                )}
              </p>
              <p className="text-xs text-dark-500">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>

      <Alert className="mt-4">{error}</Alert>

      {state.requestedAt ? (
        <Alert tone="success" className="mt-4">
          Sent for checking on {longDate(state.requestedAt)}. The team reviews requests by hand,
          so give it a couple of working days. Nothing else is needed from you.
        </Alert>
      ) : (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" onClick={request} disabled={!state.eligible || busy} className="btn-primary">
            {busy ? 'Sending…' : 'Ask to be verified'}
          </button>
          {!state.eligible ? (
            <p className="text-xs text-dark-500">
              Available once the list above is complete.
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
};

export default VerificationPanel;
