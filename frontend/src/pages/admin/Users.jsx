import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient, { errorMessage } from '../../api/apiClient.js';
import { useAuth } from '../../context/AuthContext.jsx';
import usePageMeta from '../../hooks/usePageMeta.js';
import useConfirm from '../../hooks/useConfirm.jsx';
import { longDate, timeAgo, titleCase } from '../../lib/format.js';
import { Badge } from '../../components/ui/Badge.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import IconButton from '../../components/ui/IconButton.jsx';

export const AdminUsers = () => {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [role, setRole] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const { confirm, dialog } = useConfirm();

  usePageMeta({ title: 'Users', robots: 'noindex, follow' });

  const load = () => {
    setLoading(true);
    apiClient
      .get('/admin/users', { params: { role: role || undefined, search: search || undefined, limit: 50 } })
      .then((data) => setUsers(data.users || []))
      .catch((err) => setError(errorMessage(err, 'Could not load users')))
      .finally(() => setLoading(false));
  };

  useEffect(load, [role]);

  const patch = async (target, path, body, ask) => {
    if (ask && !(await confirm(ask))) return;

    setBusyId(target._id);
    setError('');
    try {
      const data = await apiClient.patch(`/admin/users/${target._id}/${path}`, body);
      setUsers((list) => list.map((u) => (u._id === data.user._id ? data.user : u)));
    } catch (err) {
      setError(errorMessage(err, 'Could not update that user'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="container py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-3xl font-extrabold">Users</h1>
        <Link to="/admin" className="btn-outline">Back to admin</Link>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
        className="mt-6 flex flex-wrap gap-3"
      >
        <label htmlFor="search" className="sr-only">Search users</label>
        <input
          id="search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Name, email or agency"
          className="field max-w-xs"
        />
        <label htmlFor="role" className="sr-only">Filter by role</label>
        <select id="role" value={role} onChange={(e) => setRole(e.target.value)} className="field w-auto">
          <option value="">All roles</option>
          <option value="user">House hunters</option>
          <option value="agent">Agents</option>
          <option value="admin">Admins</option>
        </select>
        <button type="submit" className="btn-outline">Search</button>
      </form>

      <Alert className="mt-4">{error}</Alert>

      {loading ? (
        <div className="grid min-h-[30vh] place-items-center">
          <Spinner size="lg" />
        </div>
      ) : users.length ? (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-dark-200 text-left dark:border-dark-800">
                <th scope="col" className="py-2 pr-4 font-semibold">Name</th>
                <th scope="col" className="py-2 pr-4 font-semibold">Role</th>
                <th scope="col" className="py-2 pr-4 font-semibold">Joined</th>
                <th scope="col" className="py-2 pr-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isMe = u._id === me._id;
                return (
                  <tr key={u._id} className="border-b border-dark-100 dark:border-dark-800">
                    <td className="py-3 pr-4">
                      <p className="font-medium">
                        {u.name} {isMe ? <span className="text-xs text-dark-500">(you)</span> : null}
                      </p>
                      <p className="text-xs text-dark-500">{u.email}</p>
                      {u.agencyName ? (
                        <p className="text-xs text-dark-500">{u.agencyName}</p>
                      ) : null}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone={u.role === 'admin' ? 'secondary' : 'neutral'}>
                          {titleCase(u.role)}
                        </Badge>
                        {u.verified ? <Badge tone="primary">Verified</Badge> : null}
                        {!u.verified && u.verificationRequestedAt ? (
                          <Badge tone="secondary">Asked to be verified</Badge>
                        ) : null}
                      </div>
                      {!u.verified && u.verificationRequestedAt ? (
                        <p className="mt-1 text-xs text-dark-500">
                          Waiting since {timeAgo(u.verificationRequestedAt)}
                        </p>
                      ) : null}
                    </td>
                    <td className="py-3 pr-4 text-xs text-dark-500">{longDate(u.createdAt)}</td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {u.role === 'agent' ? (
                          <IconButton
                            icon={u.verified ? 'unverify' : 'verify'}
                            label={u.verified ? 'Remove the verified badge' : 'Verify this agent'}
                            tone={u.verified ? 'danger' : 'default'}
                            disabled={busyId === u._id}
                            onClick={() =>
                              patch(u, 'verified', { verified: !u.verified }, {
                                title: u.verified
                                  ? `Remove ${u.name}'s verified badge?`
                                  : `Verify ${u.name}?`,
                                body: u.verified
                                  ? 'The badge disappears from their agent page and every listing they run. They can ask to be checked again.'
                                  : 'The badge appears on their agent page and beside every listing they run. It tells house hunters the team has checked them.',
                                confirmLabel: u.verified ? 'Remove badge' : 'Verify agent',
                                tone: u.verified ? 'danger' : 'primary',
                              })
                            }
                          />
                        ) : null}

                        {/* Self-demotion is blocked server-side too — this just
                            keeps the button from being offered at all. */}
                        {!isMe ? (
                          <>
                            {u.role === 'user' ? (
                              <IconButton
                                icon="promote"
                                label="Make this person an agent"
                                disabled={busyId === u._id}
                                onClick={() => patch(u, 'role', { role: 'agent' }, {
                                  title: `Make ${u.name} an agent?`,
                                  body: 'They get their own listings area and can put properties in front of a moderator. The verified badge is separate and stays off until it is awarded.',
                                  confirmLabel: 'Make agent',
                                })}
                              />
                            ) : null}
                            {u.role === 'agent' ? (
                              <IconButton
                                icon="demote"
                                label="Remove the agent role"
                                tone="danger"
                                disabled={busyId === u._id}
                                onClick={() => patch(u, 'role', { role: 'user' }, {
                                  title: `Remove ${u.name}'s agent role?`,
                                  body: 'They lose their listings area and their verified badge. Any properties they run stay on the site. Take those down separately if that is the intent.',
                                  confirmLabel: 'Remove agent',
                                  tone: 'danger',
                                })}
                              />
                            ) : null}
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-6">
          <EmptyState title="No users match that search" />
        </div>
      )}

      {dialog}
    </div>
  );
};

export default AdminUsers;
