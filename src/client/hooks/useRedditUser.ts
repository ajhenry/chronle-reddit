import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../lib/utils';

// Reddit user type
export interface RedditUser {
  id: string;
  handle: string;
  created_at: string;
  updated_at: string;
  last_seen_at: string;
}

interface RedditUserState {
  user: RedditUser | null;
  loading: boolean;
  error: string | null;
}

export const useRedditUser = () => {
  const [state, setState] = useState<RedditUserState>({
    user: null,
    loading: true,
    error: null,
  });

  // Sync user with server when component mounts
  useEffect(() => {
    const syncUser = async () => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        const response = await apiFetch('/api/sync-user', {
          method: 'POST',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to sync user');
        }

        const data = await response.json();

        if (data.status === 'success') {
          setState({
            user: data.user,
            loading: false,
            error: null,
          });
        } else {
          throw new Error('Unexpected response from sync endpoint');
        }
      } catch (err) {
        console.error('Failed to sync Reddit user:', err);
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to sync user',
        }));
      }
    };

    void syncUser();
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const response = await apiFetch('/api/sync-user', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to sync user');
      }

      const data = await response.json();

      if (data.status === 'success') {
        setState({
          user: data.user,
          loading: false,
          error: null,
        });
      } else {
        throw new Error('Unexpected response from sync endpoint');
      }
    } catch (err) {
      console.error('Failed to refresh Reddit user:', err);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to refresh user',
      }));
    }
  }, []);

  return {
    ...state,
    refreshUser,
    isAuthenticated: !!state.user,
  };
};
