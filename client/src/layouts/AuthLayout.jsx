import { Link, Outlet } from 'react-router-dom';
import { FiAward, FiShield, FiUsers } from 'react-icons/fi';
import Logo from '../components/Logo';

const points = [
  { icon: FiUsers, label: 'One network for every role' },
  { icon: FiAward, label: 'Each claim verified separately' },
  { icon: FiShield, label: 'Private evidence, by design' },
];

export default function AuthLayout() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-ivory">
      <div className="lane-circles pointer-events-none absolute -left-48 top-1/3 h-[560px] w-[560px] rounded-full opacity-70" />
      <div className="lane-circles pointer-events-none absolute -right-40 -top-32 h-[460px] w-[460px] rounded-full opacity-50" />

      <header className="page-shell relative flex h-20 items-center justify-between gap-4">
        <Link to="/" className="focus-ring rounded-tile" aria-label="SportLinked home">
          <Logo size="md" />
        </Link>
        <Link
          to="/"
          className="text-sm font-bold text-slate transition-colors hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-track"
        >
          Back to home
        </Link>
      </header>

      <main className="relative flex flex-1 items-center justify-center px-4 py-8 sm:px-6 lg:py-12">
        <div className="w-full max-w-lg">
          <div className="surface-card px-5 py-6 sm:px-8 sm:py-8">
            <Outlet />
          </div>

          <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] font-bold text-slate">
            {points.map((point) => {
              const Icon = point.icon;
              return (
                <li key={point.label} className="inline-flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5 text-track" aria-hidden="true" />
                  {point.label}
                </li>
              );
            })}
          </ul>
        </div>
      </main>

      <footer className="relative px-6 pb-6 text-center text-xs text-slate">
        © {new Date().getFullYear()} SportLinked. All rights reserved.
      </footer>
    </div>
  );
}
