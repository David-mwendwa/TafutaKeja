import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import apiClient, { errorMessage } from '../api/apiClient.js';
import { useAuth } from '../context/AuthContext.jsx';
import usePageMeta from '../hooks/usePageMeta.js';
import { responsiveImage, PLACEHOLDER } from '../lib/images.js';
import { priceLabel, timeAgo, longDate } from '../lib/format.js';
import Alert from '../components/ui/Alert.jsx';
import Spinner from '../components/ui/Spinner.jsx';

export const EnquiryThread = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [enquiry, setEnquiry] = useState(null);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  usePageMeta({ title: 'Conversation', robots: 'noindex, follow' });

  useEffect(() => {
    apiClient
      .get(`/enquiries/${id}`)
      .then((data) => setEnquiry(data.enquiry))
      .catch((err) => setError(errorMessage(err, 'Could not open that conversation')))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' });
  }, [enquiry?.replies?.length]);

  const send = async (event) => {
    event.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    try {
      const data = await apiClient.post(`/enquiries/${id}/replies`, { body: reply });
      setEnquiry(data.enquiry);
      setReply('');
    } catch (err) {
      setError(errorMessage(err, 'Could not send your reply'));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error && !enquiry) {
    return (
      <div className="container py-16 text-center">
        <h1 className="font-heading text-2xl font-extrabold">Conversation not found</h1>
        <p className="mt-2 text-dark-600 dark:text-dark-400">{error}</p>
        <Link to="/enquiries" className="btn-primary mt-6">Back to messages</Link>
      </div>
    );
  }

  const listing = enquiry.listing;
  const cover = listing?.images?.[0];
  // The opening message is the sender's; `author` on a reply says who wrote it.
  const senderId = enquiry.sender?._id || enquiry.sender;
  const messages = [
    { _id: 'opening', author: senderId, body: enquiry.message, createdAt: enquiry.createdAt },
    ...(enquiry.replies || []),
  ];
  const isMine = (authorId) => String(authorId?._id || authorId) === String(user._id);

  return (
    <div className="container max-w-3xl py-10">
      <Link to="/enquiries" className="text-sm text-primary-700 hover:underline dark:text-primary-300">
        ← All messages
      </Link>

      {listing ? (
        <div className="card mt-4 flex items-center gap-4 p-3">
          <img
            {...(cover ? responsiveImage(cover.url, '96px') : { src: PLACEHOLDER })}
            alt=""
            width="96"
            height="72"
            className="h-[72px] w-24 shrink-0 rounded-lg object-cover"
          />
          <div className="min-w-0 flex-1">
            <Link to={`/listing/${listing.slug}`} className="block truncate font-semibold hover:text-primary-700">
              {listing.title}
            </Link>
            <p className="text-sm text-dark-600 dark:text-dark-400">
              {listing.location?.area} · {priceLabel(listing)}
            </p>
          </div>
        </div>
      ) : (
        <Alert tone="info" className="mt-4">This property has been removed.</Alert>
      )}

      {enquiry.viewingRequestedFor ? (
        <Alert tone="info" className="mt-4">
          A viewing was proposed for {longDate(enquiry.viewingRequestedFor)}. Confirm the time in
          the thread. Nothing is booked automatically.
        </Alert>
      ) : null}

      <Alert className="mt-4">{error}</Alert>

      <ul className="mt-6 space-y-3">
        {messages.map((message) => {
          const mine = isMine(message.author);
          return (
            <li key={message._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                  mine
                    ? 'rounded-br-sm bg-primary-700 text-white'
                    : 'rounded-bl-sm bg-white text-dark-800 shadow-card dark:bg-dark-900 dark:text-dark-100'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.body}</p>
                <p className={`mt-1 text-[11px] ${mine ? 'text-primary-200' : 'text-dark-500'}`}>
                  {timeAgo(message.createdAt)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      <div ref={endRef} />

      <form onSubmit={send} className="card mt-6 space-y-3 p-4">
        <label htmlFor="reply" className="label">Reply</label>
        <textarea
          id="reply"
          rows={3}
          required
          maxLength={2000}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          className="field text-sm"
          placeholder="Type your reply…"
        />
        <button type="submit" disabled={sending || !reply.trim()} className="btn-primary">
          {sending ? <Spinner size="sm" className="border-white" /> : 'Send reply'}
        </button>
      </form>
    </div>
  );
};

export default EnquiryThread;
