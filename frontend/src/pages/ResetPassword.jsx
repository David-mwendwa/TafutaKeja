import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient, { errorMessage } from '../api/apiClient.js';
import { useAuth } from '../context/AuthContext.jsx';
import usePageMeta from '../hooks/usePageMeta.js';
import Alert from '../components/ui/Alert.jsx';

export const ResetPassword = () => {
  const { token } = useParams();
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [state, setState] = useState({ busy: false, error: '' });

  usePageMeta({ title: 'Choose a new password', robots: 'noindex, follow' });

  const submit = async (event) => {
    event.preventDefault();
    setState({ busy: true, error: '' });
    try {
      const data = await apiClient.patch(`/auth/reset-password/${token}`, { password });
      setUser(data.user);
      navigate('/', { replace: true });
    } catch (err) {
      setState({ busy: false, error: errorMessage(err) });
    }
  };

  return (
    <div className="container max-w-md py-14">
      <h1 className="font-heading text-3xl font-extrabold">Choose a new password</h1>

      <form onSubmit={submit} className="card mt-6 space-y-4 p-6">
        <Alert>{state.error}</Alert>
        <div>
          <label htmlFor="password" className="label">New password</label>
          <input
            id="password" type="password" required minLength={8} autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field"
          />
        </div>
        <button type="submit" disabled={state.busy} className="btn-primary w-full">
          Set new password
        </button>
      </form>
    </div>
  );
};

export default ResetPassword;
