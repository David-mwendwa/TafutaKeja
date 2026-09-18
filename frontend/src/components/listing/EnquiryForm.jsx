import { useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient, { errorMessage } from '../../api/apiClient.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Alert from '../ui/Alert.jsx';
import Spinner from '../ui/Spinner.jsx';

export const EnquiryForm = ({ listing }) => {
  const { user } = useAuth();
  const [message, setMessage] = useState(
    `Hi, I am interested in "${listing.title}". Is it still available?`
  );
  const [phone, setPhone] = useState('');
  const [viewing, setViewing] = useState('');
  const [state, setState] = useState({ sending: false, error: '', sent: false });

  const isOwnListing = user && listing.agent?._id === user._id;

  if (!user) {
    return (
      <div className="text-center">
        <p className="text-sm text-dark-600 dark:text-dark-400">
          Sign in to message the agent and keep the conversation in one place.
        </p>
        <Link
          to="/login"
          state={{ from: `/listing/${listing.slug}` }}
          className="btn-primary mt-3 w-full"
        >
          Sign in to enquire
        </Link>
      </div>
    );
  }

  if (isOwnListing) {
    return (
      <p className="text-sm text-dark-600 dark:text-dark-400">
        This is your own listing.{' '}
        <Link to="/agent" className="font-semibold text-primary-700 hover:underline">
          Manage it from My listings
        </Link>
        .
      </p>
    );
  }

  if (state.sent) {
    return (
      <div className="text-center">
        <Alert tone="success">Your message is on its way to the agent.</Alert>
        <Link to="/enquiries" className="btn-outline mt-3 w-full">
          View your messages
        </Link>
      </div>
    );
  }

  const submit = async (event) => {
    event.preventDefault();
    setState({ sending: true, error: '', sent: false });
    try {
      await apiClient.post(`/listings/${listing._id}/enquiries`, {
        message,
        phone: phone || undefined,
        viewingRequestedFor: viewing || undefined,
      });
      setState({ sending: false, error: '', sent: true });
    } catch (err) {
      // A repeat enquiry is appended to the existing thread by the API rather
      // than rejected, so the only errors that land here are real ones.
      setState({ sending: false, error: errorMessage(err, 'Could not send your message'), sent: false });
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <h2 className="font-heading text-base font-bold">Message the agent</h2>

      <Alert>{state.error}</Alert>

      <div>
        <label htmlFor="enquiry-message" className="label">Your message</label>
        <textarea
          id="enquiry-message"
          required
          minLength={10}
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="field text-sm"
        />
      </div>

      <div>
        <label htmlFor="enquiry-phone" className="label">Phone (optional)</label>
        <input
          id="enquiry-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={user.phone || '07xx xxx xxx'}
          className="field text-sm"
        />
      </div>

      <div>
        <label htmlFor="enquiry-viewing" className="label">Preferred viewing date (optional)</label>
        <input
          id="enquiry-viewing"
          type="date"
          value={viewing}
          min={new Date().toISOString().slice(0, 10)}
          onChange={(e) => setViewing(e.target.value)}
          className="field text-sm"
        />
        <p className="mt-1 text-xs text-dark-500">
          This proposes a date. The agent confirms it in their reply. Nothing is booked yet.
        </p>
      </div>

      <button type="submit" disabled={state.sending} className="btn-primary w-full">
        {state.sending ? <Spinner size="sm" className="border-white" /> : 'Send enquiry'}
      </button>
    </form>
  );
};

export default EnquiryForm;
