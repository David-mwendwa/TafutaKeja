import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { errorMessage } from '../api/apiClient.js';
import usePageMeta from '../hooks/usePageMeta.js';
import Alert from '../components/ui/Alert.jsx';
import Spinner from '../components/ui/Spinner.jsx';

/* Every seeded account, so the demo can be explored from all three sides
 * without reading the README. */
const DEMO_ACCOUNTS = [
  { label: 'House hunter', email: 'demo@tafutakeja.ke', password: 'demo12345', note: 'saved properties and message threads' },
  { label: 'Agent', email: 'wanjiru@tafutakeja.ke', password: 'agent12345', note: 'verified, listings across the western suburbs' },
  { label: 'Agent (unverified)', email: 'samuel@tafutakeja.ke', password: 'agent12345', note: 'listings still awaiting review' },
  { label: 'Admin', email: 'admin@tafutakeja.ke', password: 'admin12345', note: 'moderation queue and user management' },
];

export const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showAccounts, setShowAccounts] = useState(false);

  usePageMeta({
    title: 'Sign in',
    description: 'Sign in to TafutaKeja to save properties, message agents and manage your listings.',
  });

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const user = await login(form);
      const from = location.state?.from;
      navigate(from || (user.role === 'admin' ? '/admin' : user.role === 'agent' ? '/agent' : '/'), {
        replace: true,
      });
    } catch (err) {
      setError(errorMessage(err, 'Could not sign you in'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container max-w-md py-14">
      <h1 className="font-heading text-3xl font-extrabold">Welcome back</h1>
      <p className="mt-2 text-sm text-dark-600 dark:text-dark-400">
        Sign in to pick up where you left off.
      </p>

      <form onSubmit={submit} className="card mt-6 space-y-4 p-6">
        <Alert>{error}</Alert>

        <div>
          <label htmlFor="email" className="label">Email</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="field"
          />
        </div>

        <div>
          <label htmlFor="password" className="label">Password</label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="field"
          />
        </div>

        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? <Spinner size="sm" className="border-white" /> : 'Sign in'}
        </button>

        <div className="flex justify-between text-sm">
          <Link to="/password/forgot" className="text-primary-700 hover:underline dark:text-primary-300">
            Forgot password?
          </Link>
          <Link to="/register" className="text-primary-700 hover:underline dark:text-primary-300">
            Create an account
          </Link>
        </div>
      </form>

      <div className="card mt-4 p-4">
        <button
          type="button"
          onClick={() => setShowAccounts((v) => !v)}
          aria-expanded={showAccounts}
          className="flex w-full items-center justify-between text-sm font-semibold"
        >
          Demo accounts
          <span aria-hidden="true">{showAccounts ? '−' : '+'}</span>
        </button>

        {showAccounts ? (
          <ul className="mt-3 space-y-2">
            {DEMO_ACCOUNTS.map((account) => (
              <li key={account.email}>
                <button
                  type="button"
                  onClick={() => setForm({ email: account.email, password: account.password })}
                  className="w-full rounded-lg border border-dark-200 px-3 py-2 text-left text-sm transition-colors hover:border-primary-400 dark:border-dark-700"
                >
                  <span className="font-semibold">{account.label}</span>
                  <span className="block text-xs text-dark-500">
                    {account.email} · {account.note}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
};

export default Login;
