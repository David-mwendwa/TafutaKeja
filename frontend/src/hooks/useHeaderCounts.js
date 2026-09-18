import { useCallback, useEffect, useState } from 'react';
import apiClient from '../api/apiClient.js';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * Fired by anything that changes a number the header badges show, so the badge
 * updates without a navigation. Saving a property from a browse card is the
 * case that matters: nothing else on the page moves, and a heart that fills
 * while the counter beside it stays put reads as a failed save.
 */
export const COUNTS_CHANGED_EVENT = 'tafutakeja:counts-changed';

export const countsChanged = () => {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(COUNTS_CHANGED_EVENT));
};

const EMPTY = { saved: 0, unread: 0 };

/**
 * The saved and unread totals behind the header's two badges.
 *
 * Signed out there is nothing to count and no request is made. A failure is
 * swallowed to zero rather than surfaced — a badge is decoration on top of
 * navigation that works regardless, and an error banner because a counter could
 * not be fetched would be louder than the thing it counts.
 */
export const useHeaderCounts = () => {
  const { user } = useAuth();
  const [counts, setCounts] = useState(EMPTY);

  const refresh = useCallback(() => {
    if (!user) {
      setCounts(EMPTY);
      return;
    }
    apiClient
      .get('/users/me/counts')
      .then((data) => setCounts({ saved: data.saved || 0, unread: data.unread || 0 }))
      .catch(() => setCounts(EMPTY));
  }, [user]);

  useEffect(() => {
    refresh();
    window.addEventListener(COUNTS_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(COUNTS_CHANGED_EVENT, refresh);
  }, [refresh]);

  return counts;
};

export default useHeaderCounts;
