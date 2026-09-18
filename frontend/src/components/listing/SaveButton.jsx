import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api/apiClient.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { countsChanged } from '../../hooks/useHeaderCounts.js';

export const SaveButton = ({ listingId, initialSaved = false, onChange, className = '' }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);

  useEffect(() => setSaved(initialSaved), [initialSaved]);

  const toggle = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!user) {
      navigate('/login', { state: { from: window.location.pathname } });
      return;
    }
    if (busy) return;

    // Flipped immediately and rolled back on failure. Waiting for the round
    // trip makes the heart feel broken on a cold-started API.
    const next = !saved;
    setSaved(next);
    setBusy(true);
    try {
      const data = await apiClient.post(`/listings/${listingId}/save`);
      setSaved(data.saved);
      onChange?.(listingId, data.saved);
      countsChanged();
    } catch {
      setSaved(!next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      aria-label={saved ? 'Remove from saved' : 'Save this property'}
      className={`grid h-8 w-8 place-items-center rounded-full bg-white/90 text-dark-700 shadow-sm backdrop-blur-sm transition hover:bg-white hover:text-primary-700 ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true"
        fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21.2l7.7-7.7 1.1-1.1a5.5 5.5 0 0 0 0-7.8Z" />
      </svg>
    </button>
  );
};

export default SaveButton;
