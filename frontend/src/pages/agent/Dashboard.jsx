import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient, { errorMessage } from '../../api/apiClient.js';
import usePageMeta from '../../hooks/usePageMeta.js';
import useConfirm from '../../hooks/useConfirm.jsx';
import VerificationPanel from '../../components/agent/VerificationPanel.jsx';
import { responsiveImage, PLACEHOLDER } from '../../lib/images.js';
import { shortPriceLabel, timeAgo, titleCase } from '../../lib/format.js';
import { StatusBadge } from '../../components/ui/Badge.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import IconButton from '../../components/ui/IconButton.jsx';

// What each transition is called from the agent's side, and the icon that
// stands in for it. `published` is absent on purpose: only a moderator can do
// it, and offering a button that always fails is worse than offering none.
const ACTION = {
  pending: { label: 'Submit for review', icon: 'submit' },
  draft: { label: 'Move back to draft', icon: 'draft' },
  let: { label: 'Mark as let', icon: 'let' },
  sold: { label: 'Mark as sold', icon: 'sold' },
  archived: { label: 'Archive', icon: 'archive' },
};

/*
 * A property is let or it is sold, depending on what it was advertised as.
 *
 * The state machine allows both out of `published` because it does not know the
 * purpose, so the dashboard offered "Mark as sold" on a rental and "Mark as
 * let" on a house for sale. Two text buttons made that merely odd; two similar
 * icons would make it a guess.
 */
const offeredFor = (listing, transitions) =>
  (transitions[listing.status] || []).filter((next) => {
    if (!ACTION[next]) return false;
    if (next === 'let') return listing.purpose === 'rent';
    if (next === 'sold') return listing.purpose === 'sale';
    return true;
  });

/*
 * Which transitions are worth a dialog.
 *
 * Not all of them: submitting a draft for review is undone by one more click,
 * and confirming it would train the agent to dismiss the dialog without reading
 * it — which is what makes the delete one useless. What is worth stopping for
 * is a change a reader outside the account can see, so the rule is "does this
 * take a live advert off the market", plus the delete that nothing undoes.
 */
const CONFIRM_TRANSITION = {
  let: {
    title: 'Mark this property as let?',
    body: 'It comes off the search results and its page stops asking to be indexed. Editing it puts it back in front of a moderator.',
    confirmLabel: 'Mark as let',
  },
  sold: {
    title: 'Mark this property as sold?',
    body: 'It comes off the search results and its page stops asking to be indexed. Editing it puts it back in front of a moderator.',
    confirmLabel: 'Mark as sold',
  },
  archived: {
    title: 'Archive this property?',
    body: 'It is hidden from the site and from your live tab. Nothing is deleted. It stays here under All.',
    confirmLabel: 'Archive',
  },
  draft: {
    title: 'Take this listing off the site?',
    body: 'A published listing moved back to draft stops being visible to anyone. It has to clear review again before it goes live.',
    confirmLabel: 'Move to draft',
  },
};

const TABS = [
  ['', 'All'],
  ['draft', 'Drafts'],
  ['pending', 'In review'],
  ['published', 'Live'],
  ['rejected', 'Rejected'],
];

export const AgentDashboard = () => {
  const [listings, setListings] = useState([]);
  const [counts, setCounts] = useState({});
  const [transitions, setTransitions] = useState({});
  const [tab, setTab] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const { confirm, dialog } = useConfirm();

  usePageMeta({ title: 'My listings', robots: 'noindex, follow' });

  // The state machine is fetched, not restated here. Two copies of the rules
  // drift, and the copy in the UI is the one that ends up offering buttons the
  // API rejects.
  useEffect(() => {
    apiClient
      .get('/listings/meta')
      .then((data) => setTransitions(data.meta.transitions || {}))
      .catch(() => setTransitions({}));
  }, []);

  const load = () => {
    setLoading(true);
    apiClient
      .get('/listings/mine', { params: { status: tab || undefined, limit: 50 } })
      .then((data) => {
        setListings(data.listings || []);
        setCounts(data.counts || {});
      })
      .catch((err) => setError(errorMessage(err, 'Could not load your listings')))
      .finally(() => setLoading(false));
  };

  useEffect(load, [tab]);

  const transition = async (listing, status) => {
    // `draft` is also the way back from `pending`, which costs nobody anything
    // — it is only worth confirming when it is a live advert coming down.
    const ask = status === 'draft' && listing.status !== 'published'
      ? null
      : CONFIRM_TRANSITION[status];
    if (ask && !(await confirm(ask))) return;

    setBusyId(listing._id);
    setError('');
    try {
      await apiClient.patch(`/listings/${listing._id}/status`, { status });
      load();
    } catch (err) {
      setError(errorMessage(err, 'Could not update that listing'));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (listing) => {
    const ok = await confirm({
      title: `Delete "${listing.title}"?`,
      body: 'The advert and everyone\u2019s saved copy of it go for good. Enquiries about the property are kept. This cannot be undone.',
      confirmLabel: 'Delete listing',
      tone: 'danger',
    });
    if (!ok) return;

    setBusyId(listing._id);
    try {
      await apiClient.delete(`/listings/${listing._id}`);
      load();
    } catch (err) {
      setError(errorMessage(err, 'Could not delete that listing'));
    } finally {
      setBusyId(null);
    }
  };

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="container py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-extrabold">My listings</h1>
          <p className="mt-1 text-sm text-dark-600 dark:text-dark-400">
            {total} {total === 1 ? 'property' : 'properties'}
            {counts.published ? ` · ${counts.published} live` : ''}
            {counts.pending ? ` · ${counts.pending} awaiting review` : ''}
          </p>
        </div>
        <Link to="/agent/listings/new" className="btn-primary">Add a property</Link>
      </header>

      {/* An agent who is already verified sees nothing here; the panel decides
          that for itself from the server's answer rather than from the cached
          user, which can be a badge behind. */}
      <VerificationPanel />

      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map(([value, label]) => (
          <button
            key={value || 'all'}
            type="button"
            onClick={() => setTab(value)}
            aria-pressed={tab === value}
            className={`chip ${tab === value ? 'chip-active' : ''}`}
          >
            {label}
            {value && counts[value] ? ` (${counts[value]})` : ''}
          </button>
        ))}
      </div>

      <Alert className="mt-4">{error}</Alert>

      {loading ? (
        <div className="grid min-h-[30vh] place-items-center">
          <Spinner size="lg" />
        </div>
      ) : listings.length ? (
        <ul className="mt-6 space-y-3">
          {listings.map((listing) => {
            const cover = listing.images?.[0];
            const next = offeredFor(listing, transitions);

            return (
              <li key={listing._id} className="card flex flex-col gap-4 p-4 sm:flex-row">
                <img
                  {...(cover ? responsiveImage(cover.url, '128px') : { src: PLACEHOLDER })}
                  alt=""
                  loading="lazy"
                  width="128"
                  height="96"
                  className="h-24 w-full shrink-0 rounded-lg object-cover sm:w-32"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={listing.status} />
                    <span className="text-xs text-dark-500">
                      Updated {timeAgo(listing.updatedAt)}
                    </span>
                  </div>
                  <p className="mt-1.5 truncate font-semibold">{listing.title}</p>
                  <p className="text-sm text-dark-600 dark:text-dark-400">
                    {shortPriceLabel(listing)} · {listing.location?.area} ·{' '}
                    {titleCase(listing.propertyType)}
                  </p>

                  {listing.status === 'rejected' && listing.moderation?.reason ? (
                    <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">
                      Rejected: {listing.moderation.reason}
                    </p>
                  ) : null}

                  {listing.status === 'published' ? (
                    <p className="mt-2 text-xs text-dark-500">
                      {listing.views || 0} views · {listing.enquiryCount || 0} enquiries
                    </p>
                  ) : null}
                </div>

                {/* Six stacked text buttons beside every row read as a wall of
                    words rather than as controls, and the row is the same six
                    on every listing. */}
                <div className="flex flex-wrap items-start gap-1.5 sm:justify-end">
                  <IconButton
                    to={`/agent/listings/${listing._id}/edit`}
                    icon="edit"
                    label="Edit listing"
                  />
                  {listing.status === 'published' ? (
                    <IconButton
                      to={`/listing/${listing.slug}`}
                      icon="view"
                      label="View the public page"
                    />
                  ) : null}
                  {next.map((status) => (
                    <IconButton
                      key={status}
                      icon={ACTION[status].icon}
                      label={ACTION[status].label}
                      disabled={busyId === listing._id}
                      onClick={() => transition(listing, status)}
                    />
                  ))}
                  <IconButton
                    icon="delete"
                    label="Delete listing"
                    tone="danger"
                    disabled={busyId === listing._id}
                    onClick={() => remove(listing)}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-6">
          <EmptyState
            title={tab ? `No ${tab} listings` : 'You have not listed anything yet'}
            action={<Link to="/agent/listings/new" className="btn-primary">Add your first property</Link>}
          >
            Add a property, submit it for review, and it goes live once a moderator approves it.
          </EmptyState>
        </div>
      )}
      {dialog}
    </div>
  );
};

export default AgentDashboard;
