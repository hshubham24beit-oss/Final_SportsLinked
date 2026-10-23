import { Link } from 'react-router-dom';
import Logo from './Logo';

export default function StatusPanel({ code, title, description, actions = null }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-ivory">
      <div className="lane-circles pointer-events-none absolute -right-44 -top-32 h-[520px] w-[520px] rounded-full opacity-60" />
      <div className="page-shell relative flex h-20 items-center">
        <Link to="/" className="focus-ring rounded-tile" aria-label="SportLinked home">
          <Logo size="sm" />
        </Link>
      </div>

      <div className="relative flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md rounded-card border border-line bg-white p-7 text-center shadow-card sm:p-9">
          <p className="eyebrow">{code}</p>
          <h1 className="mt-3 text-3xl">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate">{description}</p>
          {actions ? <div className="mt-7">{actions}</div> : null}
        </div>
      </div>
    </div>
  );
}
