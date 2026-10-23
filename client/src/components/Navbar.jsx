import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiMenu, FiX } from 'react-icons/fi';
import Logo from './Logo';
import { buttonClasses } from './ui/Button';
import { useAuth } from '../context/AuthContext';

const defaultItems = [
  { label: 'Why SportLinked', href: '/#priorities' },
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'For your role', href: '/#roles' },
  { label: 'Verification', href: '/#verification' },
];

export default function Navbar({ items = defaultItems, actions = null }) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.hash]);

  const isAnchorActive = (href) =>
    Boolean(href?.startsWith('/#')) && location.hash === href.slice(1);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ivory/95 backdrop-blur">
      <div className="page-shell flex h-[72px] items-center justify-between gap-5">
        <Link to="/" className="focus-ring rounded-tile" aria-label="SportLinked home">
          <Logo size="md" />
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {items.map((item) =>
            item.to ? (
              <Link
                key={item.label}
                to={item.to}
                className={`text-sm font-bold transition-colors hover:text-navy ${
                  location.pathname === item.to ? 'nav-link-active text-navy' : 'text-body'
                }`}
              >
                {item.label}
              </Link>
            ) : (
              <a
                key={item.label}
                href={item.href}
                className={`text-sm font-bold transition-colors hover:text-navy ${
                  isAnchorActive(item.href) ? 'nav-link-active text-navy' : 'text-body'
                }`}
              >
                {item.label}
              </a>
            ),
          )}
        </nav>

        <div className="hidden items-center gap-2 sm:flex">
          {actions ||
            (user ? (
              <Link to="/dashboard" className={buttonClasses({ size: 'sm' })}>
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className={buttonClasses({ variant: 'ghost', size: 'sm' })}
                >
                  Log in
                </Link>
                <Link to="/register" className={buttonClasses({ size: 'sm' })}>
                  Join free
                </Link>
              </>
            ))}
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="rounded-full p-2 text-body transition-colors hover:bg-sand hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-track md:hidden"
          aria-expanded={open}
          aria-controls="public-navigation"
          aria-label={open ? 'Close navigation' : 'Open navigation'}
        >
          {open ? <FiX className="h-5 w-5" /> : <FiMenu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <nav
          id="public-navigation"
          aria-label="Mobile navigation"
          className="border-t border-line bg-ivory px-4 py-4 md:hidden"
        >
          <div className="page-shell flex flex-col gap-1 !px-0">
            {items.map((item) =>
              item.to ? (
                <Link
                  key={item.label}
                  to={item.to}
                  className="rounded-tile px-3 py-3 text-sm font-bold text-body hover:bg-sand hover:text-navy"
                >
                  {item.label}
                </Link>
              ) : (
                <a
                  key={item.label}
                  href={item.href}
                  className="rounded-tile px-3 py-3 text-sm font-bold text-body hover:bg-sand hover:text-navy"
                >
                  {item.label}
                </a>
              ),
            )}
            <div className="mt-2 flex gap-2 border-t border-line pt-4">
              {actions ||
                (user ? (
                  <Link
                    to="/dashboard"
                    className={buttonClasses({ size: 'sm', className: 'flex-1' })}
                  >
                    Dashboard
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/login"
                      className={buttonClasses({
                        variant: 'secondary',
                        size: 'sm',
                        className: 'flex-1',
                      })}
                    >
                      Log in
                    </Link>
                    <Link
                      to="/register"
                      className={buttonClasses({ size: 'sm', className: 'flex-1' })}
                    >
                      Join free
                    </Link>
                  </>
                ))}
            </div>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
