import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { FiBell, FiLogOut, FiMenu, FiSettings, FiX } from 'react-icons/fi';
import Logo from '../components/Logo';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import VerificationBanner from '../components/VerificationBanner';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { getRoleMeta, getRoleLabel } from '../utils/roles';

function navLinkClasses({ isActive }) {
  return [
    'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600',
    isActive
      ? 'bg-brand-50 text-brand-800'
      : 'text-ink-muted hover:bg-slate-100 hover:text-ink',
  ].join(' ');
}

function SidebarContent({
  user,
  meta,
  onNavigate,
  onLogout,
  isLoggingOut,
  unreadCount,
  onClose = null,
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <Link to="/dashboard" onClick={onNavigate} className="focus-ring rounded-lg">
          <Logo size="md" />
        </Link>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-subtle transition-colors hover:bg-slate-100 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
            aria-label="Close navigation"
          >
            <FiX className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-5">
        <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-subtle">
          Workspace
        </p>
        <div className="mt-2 px-3">
          <Badge variant="brand">{getRoleLabel(user.role)}</Badge>
        </div>

        <nav aria-label="Main navigation" className="mt-6 space-y-1">
          {meta.nav.map((item) => {
            const Icon = item.icon;

            if (item.soon) {
              return (
                <span
                  key={item.label}
                  aria-disabled="true"
                  className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-subtle"
                >
                  <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span className="flex-1">{item.label}</span>
                  <Badge size="sm" variant="neutral">
                    Soon
                  </Badge>
                </span>
              );
            }

            return (
              <NavLink
                key={item.label}
                to={item.to}
                end={item.to === '/dashboard'}
                onClick={onNavigate}
                className={navLinkClasses}
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`h-5 w-5 shrink-0 ${isActive ? 'text-brand-700' : ''}`}
                      aria-hidden="true"
                    />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}

          <NavLink
            to="/notifications"
            onClick={onNavigate}
            className={navLinkClasses}
          >
            <FiBell className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span className="flex-1">Notifications</span>
            {unreadCount > 0 ? (
              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            ) : null}
          </NavLink>
        </nav>
      </div>

      <div className="border-t border-line p-3">
        <NavLink to="/settings" onClick={onNavigate} className={navLinkClasses}>
          <FiSettings className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span>Account settings</span>
        </NavLink>

        <div className="mt-2 flex items-center gap-2.5 rounded-lg border border-line bg-slate-50 px-2.5 py-2">
          <Avatar name={user.name} src={user.avatarUrl} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
            <p className="truncate text-xs text-ink-subtle">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            disabled={isLoggingOut}
            className="rounded-lg p-1.5 text-ink-subtle transition-colors hover:bg-white hover:text-danger-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 disabled:opacity-50"
            aria-label="Sign out"
            title="Sign out"
          >
            <FiLogOut className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const meta = getRoleMeta(user.role);

  useEffect(() => {
    setIsDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isDrawerOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsDrawerOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDrawerOpen]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      toast.success('Signed out', 'Your session has ended.');
    } catch {
      toast.info('Signed out', 'Your local session was cleared.');
    } finally {
      setIsLoggingOut(false);
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-canvas">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 border-r border-line bg-white lg:block">
        <SidebarContent
          user={user}
          meta={meta}
          onLogout={handleLogout}
          isLoggingOut={isLoggingOut}
          unreadCount={unreadCount}
        />
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-white/95 px-4 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="rounded-lg p-2 text-ink-muted transition-colors hover:bg-slate-100 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
            aria-label="Open navigation"
            aria-expanded={isDrawerOpen}
          >
            <FiMenu className="h-5 w-5" aria-hidden="true" />
          </button>

          <Link to="/dashboard" className="focus-ring rounded-lg">
            <Logo size="sm" />
          </Link>

          <div className="flex items-center gap-2">
            <Link
              to="/notifications"
              className="relative rounded-lg p-2 text-ink-muted hover:bg-slate-100 hover:text-ink"
              aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
            >
              <FiBell className="h-5 w-5" aria-hidden="true" />
              {unreadCount > 0 ? (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              ) : null}
            </Link>
            <Link
              to="/settings"
              className="focus-ring rounded-full"
              aria-label="Account settings"
            >
              <Avatar name={user.name} src={user.avatarUrl} size="sm" />
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <VerificationBanner />
          <Outlet />
        </main>
      </div>

      {isDrawerOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-ink/40 animate-fade-in"
            onClick={() => setIsDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-line bg-white shadow-lift animate-slide-up"
          >
            <SidebarContent
              user={user}
              meta={meta}
              onLogout={handleLogout}
              isLoggingOut={isLoggingOut}
              unreadCount={unreadCount}
              onClose={() => setIsDrawerOpen(false)}
              onNavigate={() => setIsDrawerOpen(false)}
            />
          </aside>
        </div>
      ) : null}
    </div>
  );
}
