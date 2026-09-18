import { useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient, { errorMessage } from '../api/apiClient.js';
import { useAuth } from '../context/AuthContext.jsx';
import usePageMeta from '../hooks/usePageMeta.js';
import Alert from '../components/ui/Alert.jsx';
import Spinner from '../components/ui/Spinner.jsx';

export const Profile = () => {
  const { user, setUser, isAgent } = useAuth();
  const [form, setForm] = useState({
    name: user.name || '',
    phone: user.phone || '',
    whatsapp: user.whatsapp || '',
    agencyName: user.agencyName || '',
    bio: user.bio || '',
  });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const [state, setState] = useState({ busy: false, error: '', ok: '' });
  const [pwState, setPwState] = useState({ busy: false, error: '', ok: '' });

  usePageMeta({ title: 'Your profile', robots: 'noindex, follow' });

  const saveProfile = async (event) => {
    event.preventDefault();
    setState({ busy: true, error: '', ok: '' });
    try {
      const data = await apiClient.patch('/users/me', form);
      setUser(data.user);
      setState({ busy: false, error: '', ok: 'Profile updated' });
    } catch (err) {
      setState({ busy: false, error: errorMessage(err), ok: '' });
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    setPwState({ busy: true, error: '', ok: '' });
    try {
      await apiClient.patch('/auth/update-password', passwords);
      setPasswords({ currentPassword: '', newPassword: '' });
      setPwState({ busy: false, error: '', ok: 'Password changed' });
    } catch (err) {
      setPwState({ busy: false, error: errorMessage(err), ok: '' });
    }
  };

  return (
    <div className="container max-w-2xl py-10">
      <h1 className="font-heading text-3xl font-extrabold">Your profile</h1>

      <form onSubmit={saveProfile} className="card mt-6 space-y-4 p-6">
        <h2 className="font-heading text-lg font-bold">Details</h2>
        <Alert>{state.error}</Alert>
        <Alert tone="success">{state.ok}</Alert>

        <div>
          <label htmlFor="name" className="label">Full name</label>
          <input id="name" type="text" required minLength={3} value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} className="field" />
        </div>

        <div>
          <label htmlFor="email" className="label">Email</label>
          {/* Read-only: changing the address that identifies an account needs a
              confirmation round trip this project does not have a mailer for. */}
          <input id="email" type="email" value={user.email} disabled className="field opacity-60" />
          <p className="mt-1 text-xs text-dark-500">Get in touch to change your email address.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="phone" className="label">Phone</label>
            <input id="phone" type="tel" placeholder="07xx xxx xxx" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })} className="field" />
          </div>
          <div>
            <label htmlFor="whatsapp" className="label">WhatsApp</label>
            <input id="whatsapp" type="tel" placeholder="07xx xxx xxx" value={form.whatsapp}
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} className="field" />
          </div>
        </div>

        {isAgent ? (
          <>
            <div>
              <label htmlFor="agencyName" className="label">Agency name</label>
              <input id="agencyName" type="text" maxLength={80} value={form.agencyName}
                onChange={(e) => setForm({ ...form, agencyName: e.target.value })}
                className="field" placeholder="Leave blank if you work independently" />
            </div>
            <div>
              <label htmlFor="bio" className="label">About you</label>
              <textarea id="bio" rows={4} maxLength={600} value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })} className="field" />
              <p className="mt-1 text-xs text-dark-500">
                Shown on your public agent page and beside your listings.
              </p>
            </div>
            {!user.verified ? (
              <p className="rounded-lg bg-secondary-50 px-3 py-2 text-xs text-secondary-900">
                Your account is not yet verified. The badge is awarded by our team after a
                check.{' '}
                <Link to="/agent" className="font-semibold underline">
                  My listings
                </Link>{' '}
                shows what is still outstanding and the button to ask.
              </p>
            ) : null}
          </>
        ) : null}

        <button type="submit" disabled={state.busy} className="btn-primary">
          {state.busy ? <Spinner size="sm" className="border-white" /> : 'Save changes'}
        </button>
      </form>

      <form onSubmit={savePassword} className="card mt-6 space-y-4 p-6">
        <h2 className="font-heading text-lg font-bold">Change password</h2>
        <Alert>{pwState.error}</Alert>
        <Alert tone="success">{pwState.ok}</Alert>

        <div>
          <label htmlFor="currentPassword" className="label">Current password</label>
          <input id="currentPassword" type="password" required autoComplete="current-password"
            value={passwords.currentPassword}
            onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
            className="field" />
        </div>
        <div>
          <label htmlFor="newPassword" className="label">New password</label>
          <input id="newPassword" type="password" required minLength={8} autoComplete="new-password"
            value={passwords.newPassword}
            onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
            className="field" />
        </div>

        <button type="submit" disabled={pwState.busy} className="btn-outline">
          Change password
        </button>
      </form>
    </div>
  );
};

export default Profile;
