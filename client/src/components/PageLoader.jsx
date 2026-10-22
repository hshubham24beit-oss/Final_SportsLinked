import Logo from './Logo';
import Spinner from './ui/Spinner';

export default function PageLoader({ message = 'Loading your workspace…' }) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 py-16">
      <Logo size="lg" />
      <div
        className="mt-8 flex items-center gap-2.5 text-sm text-ink-muted"
        role="status"
        aria-live="polite"
      >
        <Spinner size="md" />
        <span>{message}</span>
      </div>
    </div>
  );
}
