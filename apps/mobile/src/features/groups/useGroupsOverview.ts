import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getGroupsApi } from './groupsApi';
import { errorMessage } from './groupFormat';
import type { GroupsOverview } from './types';

/** Loads the user's groups each time the screen comes into focus. */
export function useGroupsOverview() {
  const [overview, setOverview] = useState<GroupsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getGroupsApi()
        .list()
        .then(result => {
          if (cancelled) return;
          setOverview(result);
          setError('');
        })
        .catch(reason => {
          if (!cancelled) setError(errorMessage(reason));
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, []),
  );
  return { overview, loading, error };
}
