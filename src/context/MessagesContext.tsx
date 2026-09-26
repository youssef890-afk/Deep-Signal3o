import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface MessagesContextValue {
  unreadCount: number;
  refreshUnread: () => Promise<void>;
}

const MessagesContext = createContext<MessagesContextValue>({
  unreadCount: 0,
  refreshUnread: async () => {},
});

export function MessagesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnread = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .is('read_at', null);
    setUnreadCount(count ?? 0);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    refreshUnread();

    const channel = supabase
      .channel(`unread-${user.id}-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => { refreshUnread(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, refreshUnread]);

  return (
    <MessagesContext.Provider value={{ unreadCount, refreshUnread }}>
      {children}
    </MessagesContext.Provider>
  );
}

export function useMessages() {
  return useContext(MessagesContext);
}
