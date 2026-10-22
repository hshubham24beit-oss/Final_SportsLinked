import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiArrowRight,
  FiAward,
  FiBriefcase,
  FiCheck,
  FiCheckCircle,
  FiCompass,
  FiMenu,
  FiShield,
  FiUser,
  FiUsers,
  FiX,
} from 'react-icons/fi';
import Logo from '../components/Logo';
import Badge from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { buttonClasses } from '../components/ui/Button';
import { ROLE_OPTIONS } from '../utils/roles';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const priorities = [
  {
    icon: FiCompass,
    title: 'Athlete discovery',
    description:
      'Find athletes by sport, position, location, and evidence-backed credentials — not just by follower count.',
  },
  {
    icon: FiAward,
    title: 'Credible achievements',
    description:
      'Every profile separates self-reported information from what has actually been reviewed and verified.',
  },
  {
    icon: FiBriefcase,
    title: 'Opportunity recruitment',
    description:
      'Recruiters and sports organisations share real opportunities with athletes who are ready to be found.',
  },
];

const credibilityRows = [
  { label: 'Identity', detail: 'Reviewed separately' },
  { label: 'Qualifications', detail: 'Reviewed separately' },
  { label: 'Achievements', detail: 'Reviewed separately' },
];

export default function Landing() {
  useDocumentTitle('Where sporting careers connect');
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur">
        <div className="page-shell flex h-16 items-center justify-between gap-4">
          <Link to="/" className="focus-ring rounded-lg" aria-label="SportLinked home">
            <Logo size="md" />
          </Link>

          <nav className="hidden items-center gap-7 md:flex" aria-label="Primary">
            <a
              href="#priorities"
              className="text-sm font-medium text-ink-muted transition-colors hover:text-ink"
            >
              Why SportLinked
            </a>
            <a
              href="#roles"
              className="text-sm font-medium text-ink-muted transition-colors hover:text-ink"
            >
              For your role
            </a>
            <a
              href="#verification"
              className="text-sm font-medium text-ink-muted transition-colors hover:text-ink"
            >
              Verification
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className={buttonClasses({ variant: 'ghost', size: 'sm', className: 'hidden sm:inline-flex' })}
            >
              Sign in
            </Link>
            <Link to="/register" className={buttonClasses({ size: 'sm' })}>
              Join SportLinked
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="ml-1 rounded-lg p-2 text-ink-muted transition-colors hover:bg-slate-100 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 md:hidden"
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
              aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
            >
              {menuOpen ? (
                <FiX className="h-5 w-5" aria-hidden="true" />
              ) : (
                <FiMenu className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {menuOpen ? (
          <nav
            id="mobile-navigation"
            aria-label="Mobile navigation"
            className="border-t border-line bg-white px-4 py-3 md:hidden"
          >
            <div className="flex flex-col gap-1">
              <a
                href="#priorities"
                onClick={closeMenu}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-muted hover:bg-slate-50 hover:text-ink"
              >
                Why SportLinked
              </a>
              <a
                href="#roles"
                onClick={closeMenu}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-muted hover:bg-slate-50 hover:text-ink"
              >
                For your role
              </a>
              <a
                href="#verification"
                onClick={closeMenu}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-muted hover:bg-slate-50 hover:text-ink"
              >
                Verification
              </a>
              <Link
                to="/login"
                onClick={closeMenu}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-muted hover:bg-slate-50 hover:text-ink sm:hidden"
              >
                Sign in
              </Link>
            </div>
          </nav>
        ) : null}
      </header>

      <main>
        <section className="border-b border-line bg-white">
          <div className="page-shell grid items-center gap-12 py-14 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16 lg:py-24">
            <div>
              <Badge variant="brand">The professional network for sport</Badge>
              <h1 className="mt-5 max-w-2xl text-4xl font-semibold leading-[1.1] tracking-tight text-ink sm:text-5xl lg:text-[3.4rem]">
                Credible sporting careers start with the right connections.
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-muted">
                SportLinked connects athletes, coaches, and recruiters around verified achievements,
                genuine discovery, and real opportunities — not empty follower counts.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/register"
                  className={buttonClasses({ size: 'lg', className: 'w-full sm:w-auto' })}
                >
                  Create your profile
                  <FiArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  to="/login"
                  className={buttonClasses({
                    variant: 'secondary',
                    size: 'lg',
                    className: 'w-full sm:w-auto',
                  })}
                >
                  Sign in
                </Link>
              </div>

              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2.5 text-sm text-ink-muted">
                {['Role-based workspace', 'Separate verification status', 'Private evidence handling'].map(
                  (item) => (
                    <li key={item} className="inline-flex items-center gap-2">
                      <FiCheck className="h-4 w-4 text-brand-600" aria-hidden="true" />
                      {item}
                    </li>
                  ),
                )}
              </ul>
            </div>

            <div className="mx-auto w-full max-w-md">
              <Card className="overflow-hidden">
                <div className="flex items-center justify-between gap-3 border-b border-line bg-slate-50/70 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-ink-muted">
                      <FiUser className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-ink">Athlete profile</p>
                      <p className="text-xs text-ink-subtle">Credibility at a glance</p>
                    </div>
                  </div>
                  <Badge variant="brand">Verified separately</Badge>
                </div>

                <div className="space-y-2.5 px-5 py-5">
                  {credibilityRows.map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between gap-3 rounded-lg border border-line px-3.5 py-3"
                    >
                      <div className="flex items-center gap-2.5">
                        <FiShield className="h-4 w-4 text-brand-600" aria-hidden="true" />
                        <span className="text-sm font-medium text-ink">{row.label}</span>
                      </div>
                      <span className="text-xs text-ink-subtle">{row.detail}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-brand-100 bg-brand-50 px-5 py-4">
                  <p className="flex items-start gap-2 text-xs leading-relaxed text-brand-800">
                    <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    Uploading a document never verifies a claim automatically. Each item shows
                    exactly what was reviewed.
                  </p>
                </div>
              </Card>

              <div className="mt-4 flex items-start gap-3 rounded-xl border border-line bg-white p-4 shadow-card">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-ink-muted">
                  <FiCompass className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">Discovery that respects evidence</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
                    Athletes are found for what they have shown, not only for who they know.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="priorities" className="scroll-mt-20 border-b border-line bg-canvas">
          <div className="page-shell py-16 lg:py-20">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">
                Three priorities
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Everything supports discovery, credibility, and opportunity.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-ink-muted">
                SportLinked is not another general social feed. Its core is helping the right people
                find each other with information they can trust.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {priorities.map((priority) => {
                const Icon = priority.icon;
                return (
                  <Card key={priority.title} className="p-6">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-brand-100 bg-brand-50 text-brand-700">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h3 className="mt-5 text-base font-semibold text-ink">{priority.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                      {priority.description}
                    </p>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        <section id="roles" className="scroll-mt-20 border-b border-line bg-white">
          <div className="page-shell py-16 lg:py-20">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">
                  One network, clear roles
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                  A workspace built around what you do.
                </h2>
                <p className="mt-4 text-base leading-relaxed text-ink-muted">
                  Sign up with your role and only see the tools that matter to you. Role and
                  ownership checks are enforced in the product, not just hidden in the interface.
                </p>
              </div>
              <Link
                to="/register"
                className={buttonClasses({ variant: 'secondary', size: 'md' })}
              >
                Choose your role
                <FiArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {ROLE_OPTIONS.map((role) => {
                const Icon = role.icon;
                return (
                  <Card key={role.value} className="flex flex-col p-6">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-slate-50 text-ink-muted">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div>
                        <h3 className="text-base font-semibold text-ink">{role.label}</h3>
                        <p className="text-xs font-medium text-brand-700">{role.tagline}</p>
                      </div>
                    </div>
                    <p className="mt-4 flex-1 text-sm leading-relaxed text-ink-muted">
                      {role.description}
                    </p>
                    <Link
                      to={`/register?role=${role.value}`}
                      className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 transition-colors hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                    >
                      Join as {role.label.toLowerCase()}
                      <FiArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        <section id="verification" className="scroll-mt-20 border-b border-line bg-canvas">
          <div className="page-shell grid gap-10 py-16 lg:grid-cols-2 lg:items-center lg:py-20">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">
                A higher standard
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Verification you can actually read.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-ink-muted">
                A single generic “verified” tick hides too much. SportLinked treats identity,
                qualifications, and achievements as separate claims, each with its own status.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-ink-muted">
                {[
                  'Private evidence stays private — accessed through short-lived signed links.',
                  'Uploading a document starts a review; it never verifies a claim by itself.',
                  'Generated or assisted content must be reviewed and approved by the user before it is published.',
                ].map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <FiCheckCircle
                      className="mt-0.5 h-4 w-4 shrink-0 text-brand-600"
                      aria-hidden="true"
                    />
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Card className="p-6">
              <div className="flex items-center gap-3 border-b border-line pb-5">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink text-white">
                  <FiShield className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-ink">Verification record</h3>
                  <p className="text-sm text-ink-muted">Each item stands on its own.</p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {credibilityRows.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between gap-4 rounded-lg border border-line bg-slate-50/60 px-4 py-3"
                  >
                    <span className="text-sm font-medium text-ink">{row.label}</span>
                    <Badge variant="warning">Review required</Badge>
                  </div>
                ))}
              </div>

              <p className="mt-5 flex items-start gap-2 rounded-lg bg-brand-50 px-4 py-3 text-xs leading-relaxed text-brand-800">
                <FiUsers className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                Reviewers see only the evidence needed for the specific claim they are assessing.
              </p>
            </Card>
          </div>
        </section>

        <section className="bg-white">
          <div className="page-shell py-16 lg:py-20">
            <div className="rounded-2xl border border-line bg-brand-50/60 px-6 py-10 text-center sm:px-12">
              <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
                Start with a profile that means something.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-ink-muted">
                Join as an athlete, coach, or recruiter and help raise the standard for how sporting
                careers connect.
              </p>
              <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  to="/register"
                  className={buttonClasses({ size: 'lg', className: 'w-full sm:w-auto' })}
                >
                  Create your account
                  <FiArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  to="/login"
                  className={buttonClasses({
                    variant: 'secondary',
                    size: 'lg',
                    className: 'w-full sm:w-auto',
                  })}
                >
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-white">
        <div className="page-shell grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <Logo size="md" />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-muted">
              Professional networking and talent discovery for athletes, coaches, recruiters, and
              sports organisations.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-subtle">
              Platform
            </p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <a href="#priorities" className="text-ink-muted transition-colors hover:text-ink">
                  Why SportLinked
                </a>
              </li>
              <li>
                <a href="#roles" className="text-ink-muted transition-colors hover:text-ink">
                  For your role
                </a>
              </li>
              <li>
                <a href="#verification" className="text-ink-muted transition-colors hover:text-ink">
                  Verification
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-subtle">
              Get started
            </p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link
                  to="/register?role=athlete"
                  className="text-ink-muted transition-colors hover:text-ink"
                >
                  Athlete sign-up
                </Link>
              </li>
              <li>
                <Link
                  to="/register?role=coach"
                  className="text-ink-muted transition-colors hover:text-ink"
                >
                  Coach sign-up
                </Link>
              </li>
              <li>
                <Link
                  to="/register?role=recruiter"
                  className="text-ink-muted transition-colors hover:text-ink"
                >
                  Recruiter sign-up
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-ink-muted transition-colors hover:text-ink">
                  Sign in
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-line">
          <div className="page-shell flex flex-col gap-2 py-5 text-xs text-ink-subtle sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} SportLinked. All rights reserved.</p>
            <p>Built for credible sporting careers.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
