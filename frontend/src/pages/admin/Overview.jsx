import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient, { errorMessage } from '../../api/apiClient.js';
import usePageMeta from '../../hooks/usePageMeta.js';
import { money, shortMoney, timeAgo, titleCase } from '../../lib/format.js';
import Alert from '../../components/ui/Alert.jsx';
import Spinner from '../../components/ui/Spinner.jsx';

const Stat = ({ label, value, hint, to }) => {
  const body = (
    <>
      <p className="text-sm text-dark-600 dark:text-dark-400">{label}</p>
      <p className="mt-1 font-heading text-3xl font-extrabold">{value}</p>
      {hint ? <p className="mt-1 text-xs text-dark-500">{hint}</p> : null}
    </>
  );
  return to ? (
    <Link to={to} className="card block p-5 transition-shadow hover:shadow-card-hover">{body}</Link>
  ) : (
    <div className="card p-5">{body}</div>
  );
};

export const AdminOverview = () => {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  usePageMeta({ title: 'Admin', robots: 'noindex, follow' });

  useEffect(() => {
    apiClient
      .get('/admin/overview')
      .then((data) => setOverview(data.overview))
      .catch((err) => setError(errorMessage(err, 'Could not load the dashboard')))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="container py-10">
        <Alert>{error}</Alert>
      </div>
    );
  }

  const { listingsByStatus, listingsByPurpose, usersByRole, enquiriesLast30Days, recentListings, topAreas } = overview;
  const pending = listingsByStatus.pending || 0;

  return (
    <div className="container py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-3xl font-extrabold">Admin</h1>
        <nav className="flex gap-2">
          <Link to="/admin/queue" className="btn-outline">Moderation queue</Link>
          <Link to="/admin/users" className="btn-outline">Users</Link>
        </nav>
      </header>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Awaiting review"
          value={pending}
          hint={pending ? 'Oldest first' : 'Queue is clear'}
          to="/admin/queue"
        />
        <Stat label="Live listings" value={listingsByStatus.published || 0} />
        <Stat
          label="Agents"
          value={usersByRole.agent || 0}
          hint={`${usersByRole.user || 0} house hunters`}
          to="/admin/users"
        />
        <Stat label="Enquiries" value={enquiriesLast30Days} hint="last 30 days" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="font-heading text-lg font-bold">Market split</h2>
          <ul className="mt-4 space-y-3">
            {listingsByPurpose.map((row) => (
              <li key={row._id} className="flex items-center justify-between">
                <span className="text-sm">{row._id === 'rent' ? 'To let' : 'For sale'}</span>
                <span className="text-sm text-dark-600 dark:text-dark-400">
                  {row.count} listings · avg {shortMoney(Math.round(row.medianish))}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-6">
          <h2 className="font-heading text-lg font-bold">Busiest areas</h2>
          <ul className="mt-4 space-y-2">
            {topAreas.map((area) => (
              <li key={area._id} className="flex items-center justify-between text-sm">
                <Link
                  to={`/listings?area=${encodeURIComponent(area._id)}`}
                  className="hover:text-primary-700"
                >
                  {area._id}
                </Link>
                <span className="text-dark-600 dark:text-dark-400">
                  {area.count} · avg {shortMoney(Math.round(area.avgPrice))}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card mt-6 p-6">
        <h2 className="font-heading text-lg font-bold">Recently published</h2>
        <ul className="mt-4 space-y-3">
          {recentListings.map((listing) => (
            <li key={listing._id} className="flex items-center justify-between gap-4 text-sm">
              <Link to={`/listing/${listing.slug}`} className="truncate hover:text-primary-700">
                {listing.title}
              </Link>
              <span className="shrink-0 text-xs text-dark-500">
                {money(listing.price)} · {timeAgo(listing.publishedAt)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card mt-6 p-6">
        <h2 className="font-heading text-lg font-bold">All statuses</h2>
        <ul className="mt-4 flex flex-wrap gap-4">
          {Object.entries(listingsByStatus).map(([status, count]) => (
            <li key={status} className="text-sm">
              <span className="text-dark-600 dark:text-dark-400">{titleCase(status)}: </span>
              <span className="font-semibold">{count}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export default AdminOverview;
