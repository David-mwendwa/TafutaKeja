import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient, { errorMessage } from '../../api/apiClient.js';
import usePageMeta from '../../hooks/usePageMeta.js';
import useConfirm from '../../hooks/useConfirm.jsx';
import { responsiveImage, PLACEHOLDER } from '../../lib/images.js';
import { priceLabel, timeAgo, titleCase } from '../../lib/format.js';
import { StatusBadge } from '../../components/ui/Badge.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import IconButton from '../../components/ui/IconButton.jsx';

const TABS = ['pending', 'published', 'rejected', 'draft'];

const RejectDialog = ({ listing, reasons, onCancel, onConfirm }) => {
  const [reason, setReason] = useState(reasons?.[0] || '');
  const [detail, setDetail] = useState('');

  return (
    <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
      <label htmlFor={`reason-${listing._id}`} className="label text-red-900">
        Why is this being rejected?
      </label>
      <select
        id={`reason-${listing._id}`}
        className="field text-sm"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      >
        {(reasons || []).map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>

      {reason === 'Other' ? (
        <textarea
          rows={2}
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder="Tell the agent what needs fixing"
          className="field mt-2 text-sm"
        />
      ) : null}

      <p className="mt-2 text-xs text-red-800">The agent sees this on their dashboard.</p>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className="btn-primary !bg-red-700 !py-1.5 text-xs hover:!bg-red-800"
          onClick={() => onConfirm(reason === 'Other' ? detail || 'Other' : reason)}
        >
          Confirm rejection
        </button>
        <button type="button" onClick={onCancel} className="btn-outline !py-1.5 text-xs">
          Cancel
        </button>
      </div>
    </div>
  );
};

export const AdminQueue = () => {
  const [tab, setTab] = useState('pending');
  const [listings, setListings] = useState([]);
  const [counts, setCounts] = useState({});
  const [reasons, setReasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const { confirm, dialog } = useConfirm();

  usePageMeta({ title: 'Moderation queue', robots: 'noindex, follow' });

  useEffect(() => {
    apiClient
      .get('/listings/meta')
      .then((d) => setReasons(d.meta.moderationReasons || []))
      .catch(() => setReasons([]));
  }, []);

  const load = () => {
    setLoading(true);
    apiClient
      .get('/admin/queue', { params: { status: tab, limit: 30 } })
      .then((data) => {
        setListings(data.listings || []);
        setCounts(data.counts || {});
      })
      .catch((err) => setError(errorMessage(err, 'Could not load the queue')))
      .finally(() => setLoading(false));
  };

  useEffect(load, [tab]);

  const decide = async (listing, status, reason) => {
    // Rejection has its own dialog — it collects the reason, which is the same
    // deliberate stop. Approving had none at all, and it is the click that puts
    // an advert in front of the public.
    if (status === 'published') {
      const ok = await confirm({
        title: 'Publish this listing?',
        body: `"${listing.title}" goes live on the public site and into the sitemap straight away.`,
        confirmLabel: 'Publish it',
      });
      if (!ok) return;
    }

    setBusyId(listing._id);
    setError('');
    try {
      await apiClient.patch(`/listings/${listing._id}/status`, { status, reason });
      setRejecting(null);
      load();
    } catch (err) {
      setError(errorMessage(err, 'Could not update that listing'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="container py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-extrabold">Moderation queue</h1>
          <p className="mt-1 text-sm text-dark-600 dark:text-dark-400">
            Oldest first. The listings whose agents have waited longest.
          </p>
        </div>
        <Link to="/admin" className="btn-outline">Back to admin</Link>
      </header>

      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            aria-pressed={tab === value}
            className={`chip ${tab === value ? 'chip-active' : ''}`}
          >
            {titleCase(value)}
            {counts[value] ? ` (${counts[value]})` : ''}
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
            return (
              <li key={listing._id} className="card p-4">
                <div className="flex flex-col gap-4 sm:flex-row">
                  <img
                    {...(cover ? responsiveImage(cover.url, '160px') : { src: PLACEHOLDER })}
                    alt=""
                    loading="lazy"
                    width="160"
                    height="120"
                    className="h-28 w-full shrink-0 rounded-lg object-cover sm:w-40"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={listing.status} />
                      <span className="text-xs text-dark-500">
                        submitted {timeAgo(listing.updatedAt)}
                      </span>
                    </div>

                    <Link
                      to={`/listing/${listing.slug}`}
                      className="mt-1.5 block truncate font-semibold hover:text-primary-700"
                    >
                      {listing.title}
                    </Link>
                    <p className="text-sm text-dark-600 dark:text-dark-400">
                      {priceLabel(listing)} · {listing.location?.area}, {listing.location?.county} ·{' '}
                      {titleCase(listing.propertyType)} ·{' '}
                      {listing.images?.length || 0}{' '}
                      {listing.images?.length === 1 ? 'photo' : 'photos'}
                    </p>
                    <p className="mt-1 text-xs text-dark-500">
                      {listing.agent?.agencyName || listing.agent?.name}
                      {listing.agent?.verified ? ' · verified' : ' · not verified'} ·{' '}
                      {listing.agent?.email}
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm text-dark-600 dark:text-dark-400">
                      {listing.description}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-start gap-1.5 sm:justify-end">
                    {listing.status === 'pending' ? (
                      <>
                        <IconButton
                          icon="approve"
                          label="Approve and publish"
                          tone="primary"
                          disabled={busyId === listing._id}
                          onClick={() => decide(listing, 'published')}
                        />
                        <IconButton
                          icon="reject"
                          label="Reject with a reason"
                          tone="danger"
                          disabled={busyId === listing._id}
                          onClick={() => setRejecting(rejecting === listing._id ? null : listing._id)}
                        />
                      </>
                    ) : null}
                    <IconButton
                      to={`/listing/${listing.slug}`}
                      icon="view"
                      label="Preview the listing"
                    />
                  </div>
                </div>

                {rejecting === listing._id ? (
                  <RejectDialog
                    listing={listing}
                    reasons={reasons}
                    onCancel={() => setRejecting(null)}
                    onConfirm={(reason) => decide(listing, 'rejected', reason)}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-6">
          <EmptyState title={`Nothing ${tab}`}>
            {tab === 'pending'
              ? 'The queue is clear. Every submitted listing has been reviewed.'
              : `No listings are currently ${tab}.`}
          </EmptyState>
        </div>
      )}

      {dialog}
    </div>
  );
};

export default AdminQueue;
