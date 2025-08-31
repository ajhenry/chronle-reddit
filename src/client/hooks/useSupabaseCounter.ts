import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Counter, CounterInsert, RedditUser } from '../../shared/types/supabase';

interface CounterState {
  count: number;
  loading: boolean;
  error: string | null;
}

interface UseSupabaseCounterProps {
  postId: string;
  redditUser: RedditUser | null;
}

export const useSupabaseCounter = ({ postId, redditUser }: UseSupabaseCounterProps) => {
  const [state, setState] = useState<CounterState>({
    count: 0,
    loading: true,
    error: null,
  });

  // Fetch or create initial counter data
  useEffect(() => {
    const fetchCounter = async () => {
      if (!redditUser) {
        setState((prev) => ({ ...prev, loading: false }));
        return;
      }

      try {
        // Try to get existing counter for this post and user
        const { data, error } = await supabase
          .from('counters')
          .select('*')
          .eq('post_id', postId)
          .eq('user_id', redditUser.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          // PGRST116 is "not found"
          throw error;
        }

        if (data) {
          setState({ count: data.count, loading: false, error: null });
        } else {
          // Create new counter if it doesn't exist
          const newCounter: CounterInsert = {
            post_id: postId,
            user_id: redditUser.id,
            count: 0,
          };

          const { data: insertedData, error: insertError } = await supabase
            .from('counters')
            .insert(newCounter)
            .select()
            .single();

          if (insertError) throw insertError;

          setState({ count: insertedData.count, loading: false, error: null });
        }
      } catch (err) {
        console.error('Failed to fetch/create counter:', err);
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load counter',
        }));
      }
    };

    void fetchCounter();
  }, [postId, redditUser]);

  const updateCounter = useCallback(
    async (increment: boolean) => {
      if (!redditUser) {
        setState((prev) => ({ ...prev, error: 'User not authenticated' }));
        return;
      }

      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const newCount = increment ? state.count + 1 : Math.max(0, state.count - 1);

        const { error } = await supabase
          .from('counters')
          .update({
            count: newCount,
            updated_at: new Date().toISOString(),
          })
          .eq('post_id', postId)
          .eq('user_id', redditUser.id);

        if (error) throw error;

        setState((prev) => ({ ...prev, count: newCount, loading: false }));
      } catch (err) {
        console.error('Failed to update counter:', err);
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to update counter',
        }));
      }
    },
    [postId, redditUser, state.count]
  );

  const increment = useCallback(() => updateCounter(true), [updateCounter]);
  const decrement = useCallback(() => updateCounter(false), [updateCounter]);

  return {
    ...state,
    increment,
    decrement,
    canDecrement: state.count > 0,
  };
};
