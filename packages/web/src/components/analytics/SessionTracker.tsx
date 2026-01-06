import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTrackActivity } from '@/hooks/useTrackActivity';
import { useFirebase } from '@/context/firebase-context';

export function SessionTracker() {
  const location = useLocation();
  const { user } = useFirebase();
  const { trackActivity } = useTrackActivity();

  useEffect(() => {
    if (user) {
      // Track page view on route change
      trackActivity('page_view', {
        path: location.pathname,
        search: location.search
      });
    }
  }, [location.pathname, user]); // Search excluded to avoid duplicate tracks on query param changes if not desired

  return null;
}
