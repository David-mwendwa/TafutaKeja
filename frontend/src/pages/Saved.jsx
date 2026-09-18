import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient, { errorMessage } from '../api/apiClient.js';
import usePageMeta from '../hooks/usePageMeta.js';
import ListingCard from '../components/listing/ListingCard.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Alert from '../components/ui/Alert.jsx';
import Spinner from '../components/ui/Spinner.jsx';

const NoteEditor = ({ listingId, note, onSaved }) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(note || '');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await apiClient.patch(`/saved/${listingId}/note`, { note: value });
      onSaved(value);
      setEditing(false);
    } catch {
      // Left in edit mode with the text intact, so nothing typed is lost.
    } finally {
      setBusy(false);
    }
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="mt-2 w-full rounded-lg bg-secondary-50 px-3 py-2 text-left text-xs text-secondary-900 hover:bg-secondary-100"
      >
        {note || <span className="text-dark-500">Add a private note…</span>}
      </button>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      <label className="sr-only" htmlFor={`note-${listingId}`}>Private note</label>
      <textarea
        id={`note-${listingId}`}
        rows={2}
        maxLength={300}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="field text-xs"
        placeholder="Only you can see this"
      />
      <div className="flex gap-2">
        <button type="button" onClick={save} disabled={busy} className="btn-primary flex-1 !py-1.5 text-xs">
          Save note
        </button>
        <button type="button" onClick={() => setEditing(false)} className="btn-outline !py-1.5 text-xs">
          Cancel
        </button>
      </div>
    </div>
  );
};

export const Saved = () => {
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  usePageMeta({ title: 'Saved properties', robots: 'noindex, follow' });

  useEffect(() => {
    apiClient
      .get('/saved')
      .then((data) => setSaved(data.saved || []))
      .catch((err) => setError(errorMessage(err, 'Could not load your saved properties')))
      .finally(() => setLoading(false));
  }, []);

  const onSavedChange = (listingId, isSaved) => {
    // Unsaving from this page removes the card — leaving a hollow outline of
    // something no longer saved is just confusing.
    if (!isSaved) setSaved((rows) => rows.filter((r) => r.listing._id !== listingId));
  };

  if (loading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="container py-10">
      <h1 className="font-heading text-3xl font-extrabold">Saved properties</h1>
      <p className="mt-1 text-sm text-dark-600 dark:text-dark-400">
        {saved.length} {saved.length === 1 ? 'property' : 'properties'} on your shortlist.
      </p>

      <Alert className="mt-4">{error}</Alert>

      <div className="mt-6">
        {saved.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {saved.map((row) => (
              <div key={row._id}>
                <ListingCard
                  listing={{ ...row.listing, saved: true }}
                  onSavedChange={onSavedChange}
                />
                <NoteEditor
                  listingId={row.listing._id}
                  note={row.note}
                  onSaved={(note) =>
                    setSaved((rows) =>
                      rows.map((r) => (r._id === row._id ? { ...r, note } : r))
                    )
                  }
                />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Nothing saved yet"
            action={<Link to="/listings" className="btn-primary">Browse properties</Link>}
          >
            Tap the heart on any property to keep it here, with a private note to yourself.
          </EmptyState>
        )}
      </div>
    </div>
  );
};

export default Saved;
