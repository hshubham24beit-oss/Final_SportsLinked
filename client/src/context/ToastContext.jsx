import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import ToastViewport from '../components/ui/Toast';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());
  const nextId = useRef(0);

  const dismiss = useCallback((id) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    ({ title, description, variant = 'info', duration = 5000 }) => {
      nextId.current += 1;
      const id = nextId.current;
      setToasts((current) => [...current, { id, title, description, variant }]);

      if (duration !== null) {
        const timer = setTimeout(() => dismiss(id), duration);
        timers.current.set(id, timer);
      }

      return id;
    },
    [dismiss],
  );

  useEffect(() => {
    const activeTimers = timers.current;
    return () => {
      activeTimers.forEach((timer) => clearTimeout(timer));
      activeTimers.clear();
    };
  }, []);

  const value = useMemo(
    () => ({
      toast: push,
      success: (title, description, options) =>
        push({ title, description, variant: 'success', ...options }),
      error: (title, description, options) =>
        push({ title, description, variant: 'error', ...options }),
      info: (title, description, options) =>
        push({ title, description, variant: 'info', ...options }),
      dismiss,
      toasts,
    }),
    [push, dismiss, toasts],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
