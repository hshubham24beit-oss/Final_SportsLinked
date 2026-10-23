import { Link } from 'react-router-dom';
import Logo from './Logo';

const platformLinks = [
  { label: 'Why SportLinked', href: '/#priorities' },
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'Your role', href: '/#roles' },
  { label: 'Verification', href: '/#verification' },
];

const joinLinks = [
  { label: 'Athlete sign-up', to: '/register?role=athlete' },
  { label: 'Coach sign-up', to: '/register?role=coach' },
  { label: 'Recruiter sign-up', to: '/register?role=recruiter' },
];

export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-navy text-ivory">
      <div className="lane-circles-gold pointer-events-none absolute -right-40 -top-52 h-[520px] w-[520px] rounded-full opacity-60" />
      <div className="page-shell relative py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Logo size="md" variant="onDark" />
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-ivory/70">
              Professional networking and talent discovery for athletes, coaches, recruiters, and
              sports organisations.
            </p>
          </div>

          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-gold">
              Platform
            </p>
            <ul className="mt-4 space-y-3 text-sm">
              {platformLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-ivory/70 transition-colors hover:text-ivory focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-gold">
              Get started
            </p>
            <ul className="mt-4 space-y-3 text-sm">
              {joinLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="text-ivory/70 transition-colors hover:text-ivory focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-gold">
              Account
            </p>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <Link
                  to="/login"
                  className="text-ivory/70 transition-colors hover:text-ivory focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                >
                  Log in
                </Link>
              </li>
              <li>
                <Link
                  to="/register"
                  className="text-ivory/70 transition-colors hover:text-ivory focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
                >
                  Create an account
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-ivory/15 pt-5 text-xs text-ivory/55 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} SportLinked. All rights reserved.</p>
          <p>Built for credible sporting careers.</p>
        </div>
      </div>
    </footer>
  );
}
