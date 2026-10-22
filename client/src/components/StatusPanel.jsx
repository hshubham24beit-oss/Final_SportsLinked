import { Link } from 'react-router-dom';
import Logo from './Logo';

export default function StatusPanel({ code, title, description, actions = null }) {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <div className="page-shell flex h-16 items-center">
        <Link to="/" className="focus-ring rounded-lg" aria-label="SportLinked home">
          <Logo size="sm" />
        </Link>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md rounded-2xl border border-line bg-white p-7 text-center shadow-card sm:p-9">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">
            {code}
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{description}</p>
          {actions ? <div className="mt-7">{actions}</div> : null}
        </div>
      </div>
    </div>
  );
}
