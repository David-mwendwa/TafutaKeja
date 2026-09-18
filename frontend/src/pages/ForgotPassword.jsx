import { useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient, { errorMessage } from '../api/apiClient.js';
import usePageMeta from '../hooks/usePageMeta.js';
import Alert from '../components/ui/Alert.jsx';

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [state, setState] = useState({ busy: false, error: '', sent: false, token: null });

  usePageMeta({ title: 'Reset your password', robots: 'noindex, follow' });

  const submit = async (event) => {
    event.preventDefault();
    setState({ busy: true, error: '', sent: false, token: null });
    try {
      const data = await apiClient.post('/auth/forgot-password', { email });
      // There is no mail transport on this project, so in development the API
      // hands the token back to make the flow demonstrable. In production it
      // withholds it and this link simply does not appear.
      setState({ busy: false, error: '', sent: true, token: data.resetToken || null });
    } catch (err) {
      setState({ busy: false, error: errorMessage(err), sent: false, token: null });
    }
  };

  return (
    <div className="container max-w-md py-14">
      <h1 className="font-heading text-3xl font-extrabold">Reset your password</h1>

      <form onSubmit={submit} className="card mt-6 space-y-4 p-6">
        <Alert>{state.error}</Alert>

        {state.sent ? (
          <>
            <Alert tone="success">
              If that email has an account, a reset link is on its way.
            </Alert>
            {state.token ? (
              <p className="text-sm text-dark-600 dark:text-dark-400">
                No mail is sent in this demo, so{' '}
                <Link
                  to={`/password/reset/${state.token}`}
                  className="font-semibold text-primary-700 hover:underline"
                >
                  continue to set a new password
                </Link>
                .
              </p>
            ) : null}
          </>
        ) : (
          <>
            <div>
              <label htmlFor="email" className="label">Email</label>
              <input
                id="email" type="email" required autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="field"
              />
            </div>
            <button type="submit" disabled={state.busy} className="btn-primary w-full">
              Send reset link
            </button>
          </>
        )}

        <p className="text-center text-sm">
          <Link to="/login" className="text-primary-700 hover:underline dark:text-primary-300">
            Back to sign in
          </Link>
        </p>
      </form>
    </div>
  );
};

export default ForgotPassword;
