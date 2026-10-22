import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { API_BASE_URL, getAccessToken } from '../api/client';
import { useAuth } from '../hooks/useAuth';

const SocketContext = createContext(null);

function socketUrl() {
  return API_BASE_URL.replace(/\/api\/v1\/?$/, '');
}

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setSocket(null);
      setConnected(false);
      return undefined;
    }

    const instance = io(socketUrl(), {
      withCredentials: true,
      auth: (callback) => callback({ token: getAccessToken() }),
    });

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    instance.on('connect', handleConnect);
    instance.on('disconnect', handleDisconnect);
    setSocket(instance);

    return () => {
      instance.off('connect', handleConnect);
      instance.off('disconnect', handleDisconnect);
      instance.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [user?.id]);

  const value = useMemo(() => ({ socket, connected }), [socket, connected]);

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used inside a SocketProvider');
  }
  return context;
}
