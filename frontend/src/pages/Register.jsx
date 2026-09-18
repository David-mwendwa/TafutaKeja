import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { errorMessage } from '../api/apiClient.js';
import usePageMeta from '../hooks/usePageMeta.js';
import Alert from '../components/ui/Alert.jsx';
import Spinner from '../components/ui/Spinner.jsx';

export const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    // The footer's "List your property" link arrives with ?role=agent, so the
    // right account type is already chosen when they get here.
    role: params.get('role') === 'agent' ? 'agent' : 'user',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  usePageMeta({
    title: 'Create an account',
    description: 'Create a TafutaKeja account to save properties and message agents, or list a property of your own.',
  });

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const user = await register(form);
      navigate(user.role === 'agent' ? '/agent' : '/', { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Could not create your account'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container max-w-md py-14">
      <h1 className="font-heading text-3xl font-extrabold">Create your account</h1>

      <form onSubmit={submit} className="card mt-6 space-y-4 p-6">
        <Alert>{error}</Alert>

        <fieldset>
          <legend className="label">I am here to</legend>
          <div className="grid grid-cols-2 gap-2">
            {[
              ['user', 'Find a place'],
              ['agent', 'List property'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setForm({ ...form, role: value })}
                aria-pressed={form.role === value}
                className={`chip justify-center py-2.5 ${form.role === value ? 'chip-active' : ''}`}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="name" className="label">Full name</label>
          <input
            id="name" type="text" required minLength={3} autoComplete="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="field"
          />
        </div>

        <div>
          <label htmlFor="email" className="label">Email</label>
          <input
            id="email" type="email" required autoComplete="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="field"
          />
        </div>

        <div>
          <label htmlFor="phone" className="label">
            Phone {form.role === 'agent' ? '' : <span className="text-dark-400">(optional)</span>}
          </label>
          <input
            id="phone" type="tel" required={form.role === 'agent'} autoComplete="tel"
            placeholder="07xx xxx xxx"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="field"
          />
        </div>

        <div>
          <label htmlFor="password" className="label">Password</label>
          <input
            id="password" type="password" required minLength={8} autoComplete="new-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="field"
          />
          <p className="mt-1 text-xs text-dark-500">At least 8 characters.</p>
        </div>

        {form.role === 'agent' ? (
          <p className="rounded-lg bg-secondary-50 px-3 py-2 text-xs text-secondary-900">
            Agent accounts can list immediately. The verified badge is separate: it is awarded by
            our team after a check, and your listings area shows what that check needs before you
            ask for it.
          </p>
        ) : null}

        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? <Spinner size="sm" className="border-white" /> : 'Create account'}
        </button>

        <p className="text-center text-sm text-dark-600 dark:text-dark-400">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-700 hover:underline dark:text-primary-300">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Register;
