import { Link, Outlet } from 'react-router-dom';
import { FiAward, FiShield, FiUsers } from 'react-icons/fi';
import Logo from '../components/Logo';

const points = [
  {
    icon: FiUsers,
    title: 'Built for every side of sport',
    description: 'Athletes, coaches, and recruiters share one professional network.',
  },
  {
    icon: FiAward,
    title: 'Credibility comes first',
    description: 'Achievements and qualifications are presented with clear verification status.',
  },
  {
    icon: FiShield,
    title: 'Private by design',
    description: 'Verification evidence stays private and is never published automatically.',
  },
];

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-canvas">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <aside className="relative hidden overflow-hidden border-r border-line bg-brand-50/50 px-10 py-10 lg:flex lg:flex-col lg:justify-between xl:px-14">
          <div>
            <Link to="/" className="focus-ring inline-flex rounded-lg">
              <Logo size="md" />
            </Link>

            <div className="mt-16 max-w-md">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">
                The professional network for sport
              </p>
              <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-ink xl:text-4xl">
                Build a sporting career on credible connections.
              </h1>
              <p className="mt-4 text-base leading-relaxed text-ink-muted">
                SportLinked brings discovery, verified achievements, and recruitment into one
                focused workspace.
              </p>
            </div>

            <ul className="mt-12 space-y-5">
              {points.map((point) => {
                const Icon = point.icon;
                return (
                  <li key={point.title} className="flex gap-3.5">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-brand-100 bg-white text-brand-700">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-ink">{point.title}</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-ink-muted">
                        {point.description}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <p className="mt-10 text-xs leading-relaxed text-ink-subtle">
            SportLinked · Professional networking and talent discovery for sport
          </p>
        </aside>

        <main className="flex min-h-screen flex-col">
          <div className="flex items-center justify-between px-4 py-4 sm:px-6 lg:hidden">
            <Link to="/" className="focus-ring inline-flex rounded-lg">
              <Logo size="sm" />
            </Link>
            <Link
              to="/"
              className="text-sm font-medium text-ink-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
            >
              Back to home
            </Link>
          </div>

          <div className="flex flex-1 items-start justify-center px-4 pb-10 pt-4 sm:px-6 sm:pt-8 lg:items-center lg:px-12 lg:py-12">
            <div className="w-full max-w-md animate-fade-in">
              <Outlet />
            </div>
          </div>

          <footer className="px-6 pb-6 text-center text-xs text-ink-subtle lg:px-12 lg:text-left">
            © {new Date().getFullYear()} SportLinked. All rights reserved.
          </footer>
        </main>
      </div>
    </div>
  );
}
