import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiBell, FiCheck, FiInbox } from 'react-icons/fi';
import Alert from '../components/ui/Alert';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import Pagination from '../components/ui/Pagination';
import { notificationsApi } from '../api/notifications.api';
import { useNotifications } from '../context/NotificationContext';
import { useSocket } from '../context/SocketContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useToast } from '../hooks/useToast';
import { getErrorMessage } from '../utils/apiError';
import { formatDate } from '../utils/format';

const PAGE_SIZE = 20;

export default function Notifications() {
  useDocumentTitle('Notifications');
  const toast = useToast();
  const { markRead, markAllRead, refresh } = useNotifications();
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [meta, setMeta] = useState({ page: 1, total: 0, totalPages: 0 });
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await notificationsApi.list({ page, limit: PAGE_SIZE });
      setNotifications(response.data.data.notifications || []);
      setMeta(
        response.data.meta || { page, limit: PAGE_SIZE, total: 0, totalPages: 0 },
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!socket) {
      return undefined;
    }
    const handleNotification = () => {
      load();
    };
    socket.on('notification:new', handleNotification);
    return () => socket.off('notification:new', handleNotification);
  }, [load, socket]);

  const handleMarkRead = async (notification) => {
    if (notification.readAt) return;
    try {
      await markRead(notification.id);
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item,
        ),
      );
    } catch (requestError) {
      toast.error('Could not mark notification as read', getErrorMessage(requestError));
    }
  };

  const handleMarkAll = async () => {
    setIsMarkingAll(true);
    try {
      await markAllRead();
      setNotifications((current) =>
        current.map((item) => ({ ...item, readAt: item.readAt || new Date().toISOString() })),
      );
      toast.success('All notifications marked as read');
    } catch (requestError) {
      toast.error('Could not update notifications', getErrorMessage(requestError));
    } finally {
      setIsMarkingAll(false);
      refresh();
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Activity</p>
          <h1 className="mt-2 text-3xl leading-tight sm:text-4xl">
            <span className="display-emphasis">Notifications.</span>
          </h1>
          <p className="mt-1.5 text-sm text-body">
            Network activity, application updates, and recruitment news relevant to you.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          isLoading={isMarkingAll}
          onClick={handleMarkAll}
          disabled={notifications.every((item) => item.readAt)}
          leftIcon={<FiCheck className="h-4 w-4" aria-hidden="true" />}
        >
          Mark all as read
        </Button>
      </div>

      {error ? (
        <Alert variant="error" title="Notifications could not be loaded" className="mt-5">
          {error}
        </Alert>
      ) : null}

      {isLoading ? (
        <p className="mt-6 text-sm text-body">Loading notifications...</p>
      ) : null}

      {!isLoading && notifications.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={FiInbox}
          title="No notifications"
          description="Updates about your applications and opportunities will appear here."
        />
      ) : null}

      {!isLoading && notifications.length > 0 ? (
        <div className="mt-5 overflow-hidden rounded-card border border-line bg-white shadow-card">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`flex gap-3 border-b border-line p-4 last:border-b-0 ${
                notification.readAt ? 'bg-white' : 'bg-sand/40'
              }`}
            >
              <span
                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                  notification.readAt
                    ? 'bg-sand text-slate'
                    : 'bg-sand-deep text-track'
                }`}
              >
                <FiBell className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-navy">{notification.title}</p>
                  {!notification.readAt ? (
                    <Badge size="sm" variant="brand">
                      New
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-0.5 text-sm leading-relaxed text-body">
                  {notification.message}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <span className="text-xs text-slate">
                    {formatDate(notification.createdAt)}
                  </span>
                  {notification.link ? (
                    <Link
                      to={notification.link}
                      onClick={() => handleMarkRead(notification)}
                      className="text-xs font-semibold text-track underline-offset-4 hover:underline"
                    >
                      Open
                    </Link>
                  ) : null}
                  {!notification.readAt ? (
                    <button
                      type="button"
                      onClick={() => handleMarkRead(notification)}
                      className="text-xs font-medium text-body underline-offset-4 hover:text-navy hover:underline"
                    >
                      Mark as read
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <Pagination page={meta.page} totalPages={meta.totalPages} onChange={setPage} />
    </div>
  );
}
