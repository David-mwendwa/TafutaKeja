import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient, { errorMessage } from '../api/apiClient.js';
import { useAuth } from '../context/AuthContext.jsx';
import usePageMeta from '../hooks/usePageMeta.js';
import { responsiveImage, PLACEHOLDER } from '../lib/images.js';
import { timeAgo } from '../lib/format.js';
import { StatusBadge } from '../components/ui/Badge.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Alert from '../components/ui/Alert.jsx';
import Spinner from '../components/ui/Spinner.jsx';

export const Enquiries = () => {
  const { isAgent, isAdmin } = useAuth();
  // Agents land on what people have asked them; everyone else on what they
  // have asked. An enquiry is addressed to a listing's agent, so a moderator
  // receives none — but an admin may still hold listings, so the switch stays
  // offered to them even though it is not where they start.
  const [box, setBox] = useState(isAgent ? 'received' : 'sent');
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  usePageMeta({ title: 'Messages', robots: 'noindex, follow' });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiClient
      .get('/enquiries', { params: { box } })
      .then((data) => {
        if (!cancelled) setEnquiries(data.enquiries || []);
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err, 'Could not load your messages'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [box]);

  return (
    <div className="container max-w-3xl py-10">
      <h1 className="font-heading text-3xl font-extrabold">Messages</h1>

      {isAgent || isAdmin ? (
        <div className="mt-4 flex gap-2">
          {[
            ['received', 'Enquiries received'],
            ['sent', 'Sent by me'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setBox(value)}
              aria-pressed={box === value}
              className={`chip ${box === value ? 'chip-active' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      <Alert className="mt-4">{error}</Alert>

      {loading ? (
        <div className="grid min-h-[30vh] place-items-center">
          <Spinner size="lg" />
        </div>
      ) : enquiries.length ? (
        <ul className="mt-6 space-y-3">
          {enquiries.map((enquiry) => {
            const cover = enquiry.listing?.images?.[0];
            const unread = box === 'received' ? !enquiry.readByAgent : !enquiry.readBySender;
            const other = box === 'received' ? enquiry.sender : enquiry.agent;
            const last = enquiry.replies?.[enquiry.replies.length - 1];

            return (
              <li key={enquiry._id}>
                <Link
                  to={`/enquiries/${enquiry._id}`}
                  className="card flex gap-4 p-3 transition-shadow hover:shadow-card-hover"
                >
                  <img
                    {...(cover ? responsiveImage(cover.url, '80px') : { src: PLACEHOLDER })}
                    alt=""
                    loading="lazy"
                    width="80"
                    height="60"
                    className="h-[60px] w-20 shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold">
                        {enquiry.listing?.title || 'Property removed'}
                      </p>
                      {unread ? (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-secondary-500" aria-label="Unread" />
                      ) : null}
                    </div>
                    <p className="truncate text-xs text-dark-500">
                      {other?.agencyName || other?.name}
                    </p>
                    <p className="mt-1 line-clamp-1 text-xs text-dark-600 dark:text-dark-400">
                      {last?.body || enquiry.message}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <StatusBadge status={enquiry.status === 'new' ? 'pending' : 'published'} />
                    <p className="mt-1 text-xs text-dark-500">{timeAgo(enquiry.updatedAt)}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          title={box === 'received' ? 'No enquiries yet' : 'You have not messaged anyone yet'}
          action={<Link to="/listings" className="btn-primary">Browse properties</Link>}
        >
          {box === 'received'
            ? isAgent
              ? 'When somebody asks about one of your properties, the conversation appears here.'
              : 'Enquiries are addressed to whoever is letting or selling the property, so this box stays empty unless you are listing something.'
            : 'Find a property you like and message the agent. The thread will show up here.'}
        </EmptyState>
      )}
    </div>
  );
};

export default Enquiries;
