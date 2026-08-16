import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export const useRealtimeSubscription = (
  channelName: string,
  tables: string[],
  onChange: () => void
) => {
  useEffect(() => {
    if (!channelName || tables.length === 0) return;

    let channel = supabase.channel(channelName);

    tables.forEach((table) => {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => {
          onChange();
        }
      );
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelName, JSON.stringify(tables), onChange]);
};
