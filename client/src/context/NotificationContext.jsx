import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { notificationsApi } from '../api/notifications.api';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from './SocketContext';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const { socket, connected } = useSocket();
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return 0;
    }
    try {
      const response = await notificationsApi.unreadCount();
      const count = response.data.data.count || 0;
      setUnreadCount(count);
      return count;
    } catch {
      return 0;
    }
  }, [user]);

  useEffect(() => {
    refresh();
    if (!user) {
      return undefined;
    }
    const timer = window.setInterval(refresh, 60000);
    return () => window.clearInterval(timer);
  }, [refresh, user]);

  useEffect(() => {
    if (!socket) {
      return undefined;
    }
    const handleNotification = () => {
      setUnreadCount((count) => count + 1);
    };
    socket.on('notification:new', handleNotification);
    return () => socket.off('notification:new', handleNotification);
  }, [socket]);

  useEffect(() => {
    if (connected) {
      refresh();
    }
  }, [connected, refresh]);

  const markRead = useCallback(
    async (notificationId) => {
      await notificationsApi.markRead(notificationId);
      setUnreadCount((count) => Math.max(0, count - 1));
    },
    [],
  );

  const markAllRead = useCallback(async () => {
    await notificationsApi.markAllRead();
    setUnreadCount(0);
  }, []);

  const value = useMemo(
    () => ({ unreadCount, refresh, markRead, markAllRead }),
    [unreadCount, refresh, markRead, markAllRead],
  );

  return (
    <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used inside a NotificationProvider');
  }
  return context;
}
