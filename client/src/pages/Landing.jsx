import { Link } from 'react-router-dom';
import {
  FiArrowRight,
  FiAward,
  FiBriefcase,
  FiCheck,
  FiCheckCircle,
  FiCompass,
  FiShield,
} from 'react-icons/fi';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import Badge from '../components/ui/Badge';
import { buttonClasses } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { ROLE_OPTIONS } from '../utils/roles';

const priorities = [
  {
    icon: FiCompass,
    number: '01',
    title: 'Athlete discovery',
    description:
      'Find athletes by sport, position, location, and evidence-backed credentials, not follower count.',
  },
  {
    icon: FiAward,
    number: '02',
    title: 'Credible achievements',
    description:
      'Every profile separates self-reported information from what has actually been reviewed and verified.',
  },
  {
    icon: FiBriefcase,
    number: '03',
    title: 'Real opportunity',
    description:
      'Recruiters and sports organisations share genuine opportunities with athletes who are ready to be found.',
  },
];

const credibilityRows = [
  { label: 'Identity', detail: 'Separate status' },
  { label: 'Qualifications', detail: 'Separate status' },
  { label: 'Achievements', detail: 'Separate status' },
];

const howItWorks = [
  {
    number: '01',
    title: 'Build your profile',
    description:
      'Add your role, sport or organisation, location, and the record you want to be known for.',
  },
  {
    number: '02',
    title: 'Submit evidence',
    description:
      'Identity, qualifications, and achievements are reviewed as separate claims, each with its own status.',
  },
  {
    number: '03',
    title: 'Find the right fit',
    description:
      'Discover athletes, join teams, or publish opportunities through a role-based workspace.',
  },
];

export default function Landing() {
  useDocumentTitle('Where sporting careers connect');
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-ivory">
      <Navbar />

      <main>
        <section className="relative overflow-hidden border-b border-line">
          <div className="lane-circles pointer-events-none absolute -right-64 -top-52 h-[760px] w-[760px] rounded-full opacity-70" />
          <div className="page-shell relative grid items-center gap-12 py-14 lg:grid-cols-[1.04fr_0.96fr] lg:gap-16 lg:py-24">
            <div>
              <p className="eyebrow">The professional network for sport</p>
              <h1 className="mt-5 max-w-2xl text-4xl leading-[1.04] sm:text-5xl lg:text-[4.1rem]">
                Credible careers start with the{' '}
                <span className="display-emphasis">right connections.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-body">
                SportLinked brings athletes, coaches, and recruiters together around verified
                achievements, genuine discovery, and real opportunity.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to={user ? '/dashboard' : '/register'}
                  className={buttonClasses({ size: 'lg', className: 'w-full sm:w-auto' })}
                >
                  {user ? 'Go to dashboard' : 'Create your profile'}
                  <FiArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  to={user ? '/feed' : '/login'}
                  className={buttonClasses({
                    variant: 'secondary',
                    size: 'lg',
                    className: 'w-full sm:w-auto',
                  })}
                >
                  {user ? 'Open your feed' : 'Sign in'}
                </Link>
              </div>

              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2.5 text-sm font-semibold text-body">
                {[
                  'Role-based workspace',
                  'Separate verification status',
                  'Private evidence handling',
                ].map((item) => (
                  <li key={item} className="inline-flex items-center gap-2">
                    <FiCheck className="h-4 w-4 text-track" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative mx-auto w-full max-w-md">
              <div className="surface-card overflow-hidden">
                <div className="flex items-center justify-between gap-3 border-b border-line bg-sand px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full border border-line-strong bg-white text-track">
                      <FiAward className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="font-display font-display text-xl">
                        Athlete profile
                      </p>
                      <p className="text-xs font-semibold text-slate">Credibility at a glance</p>
                    </div>
                  </div>
                  <Badge variant="brand">Separate status</Badge>
                </div>

                <div className="space-y-2.5 px-5 py-5">
                  {credibilityRows.map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between gap-3 rounded-tile border border-line px-3.5 py-3"
                    >
                      <div className="flex items-center gap-2.5">
                        <FiShield className="h-4 w-4 text-track" aria-hidden="true" />
                        <span className="text-sm font-bold text-navy">{row.label}</span>
                      </div>
                      <span className="text-xs font-semibold text-slate">{row.detail}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-line bg-sand px-5 py-4">
                  <p className="flex items-start gap-2 text-xs leading-relaxed text-body">
                    <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-verified" aria-hidden="true" />
                    Uploading a document never verifies a claim automatically. Each item shows
                    exactly what was reviewed.
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-start gap-3 rounded-tile border border-line bg-white p-4 shadow-card">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy text-ivory">
                  <FiCompass className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-extrabold text-navy">Discovery that respects evidence</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate">
                    Found for what you have shown, not only for who you know.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="priorities" className="scroll-mt-24 border-b border-line bg-sand/45">
          <div className="page-shell py-16 lg:py-20">
            <div className="max-w-2xl">
              <p className="eyebrow">Three priorities</p>
              <h2 className="mt-3 text-3xl leading-tight sm:text-4xl">
                Everything supports discovery, credibility, and{' '}
                <span className="display-emphasis">opportunity.</span>
              </h2>
              <p className="mt-4 text-base leading-relaxed text-body">
                SportLinked is not another general social feed. Its core is helping the right people
                find each other with information they can trust.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {priorities.map((priority) => {
                const Icon = priority.icon;
                return (
                  <article key={priority.title} className="surface-card p-6">
                    <div className="flex items-center justify-between">
                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-track/10 text-track">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span className="font-display text-2xl font-semibold text-line-strong">
                        {priority.number}
                      </span>
                    </div>
                    <h3 className="mt-5 text-xl">{priority.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate">{priority.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="roles" className="scroll-mt-24 border-b border-line bg-ivory">
          <div className="page-shell py-16 lg:py-20">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div className="max-w-2xl">
                <p className="eyebrow">One network, clear roles</p>
                <h2 className="mt-3 text-3xl leading-tight sm:text-4xl">
                  A workspace built around what{' '}
                  <span className="display-emphasis">you do.</span>
                </h2>
                <p className="mt-4 text-base leading-relaxed text-body">
                  {user
                    ? 'Your workspace is shaped by your role, with ownership checks enforced in the product, not just hidden in the interface.'
                    : 'Join with your role and see only the tools that matter to you. Role and ownership checks are enforced in the product, not just hidden in the interface.'}
                </p>
              </div>
              <Link
                to={user ? '/dashboard' : '/register'}
                className={buttonClasses({ variant: 'secondary', size: 'md' })}
              >
                {user ? 'Go to dashboard' : 'Choose your role'}
                <FiArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {ROLE_OPTIONS.map((role) => {
                const Icon = role.icon;
                return (
                  <article key={role.value} className="surface-card flex flex-col p-6">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-tile border border-line bg-sand text-navy">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div>
                        <h3 className="text-xl">{role.label}</h3>
                        <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-track">
                          {role.tagline}
                        </p>
                      </div>
                    </div>
                    <p className="mt-4 flex-1 text-sm leading-relaxed text-slate">
                      {role.description}
                    </p>
                    <Link
                      to={user ? '/dashboard' : `/register?role=${role.value}`}
                      className="mt-5 inline-flex items-center gap-1.5 text-sm font-extrabold text-track transition-colors hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-track"
                    >
                      {user ? 'Open your workspace' : `Join as ${role.label.toLowerCase()}`}
                      <FiArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-24 border-b border-line bg-ivory">
          <div className="page-shell py-16 lg:py-20">
            <div className="max-w-2xl">
              <p className="eyebrow">How it works</p>
              <h2 className="mt-3 text-3xl leading-tight sm:text-4xl">
                From profile to opportunity in{' '}
                <span className="display-emphasis">three steps.</span>
              </h2>
              <p className="mt-4 text-base leading-relaxed text-body">
                A clear record makes it easier for the right people to find each other without
                guessing what has actually been reviewed.
              </p>
            </div>

            <ol className="mt-10 grid gap-4 md:grid-cols-3">
              {howItWorks.map((step) => (
                <li
                  key={step.number}
                  className="rounded-card border border-line bg-white p-6 shadow-card"
                >
                  <span className="font-display text-4xl font-semibold text-line-strong">
                    {step.number}
                  </span>
                  <h3 className="mt-4 text-xl">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate">{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="verification" className="scroll-mt-24 border-b border-line bg-sand/45">
          <div className="page-shell grid gap-10 py-16 lg:grid-cols-2 lg:items-center lg:py-20">
            <div>
              <p className="eyebrow">A higher standard</p>
              <h2 className="mt-3 text-3xl leading-tight sm:text-4xl">
                Verification you can actually{' '}
                <span className="display-emphasis">read.</span>
              </h2>
              <p className="mt-4 text-base leading-relaxed text-body">
                A single generic “verified” tick hides too much. SportLinked treats identity,
                qualifications, and achievements as separate claims, each with its own status.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-body">
                {[
                  'Private evidence stays private, accessed through short-lived signed links.',
                  'Uploading a document starts a review; it never verifies a claim by itself.',
                  'Assisted content must be reviewed and approved before it is published.',
                ].map((item) => (
                  <li key={item} className="flex gap-2.5">
                    <FiCheckCircle
                      className="mt-0.5 h-4 w-4 shrink-0 text-verified"
                      aria-hidden="true"
                    />
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative overflow-hidden rounded-card bg-navy p-6 shadow-card sm:p-8">
              <div className="lane-circles-gold pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full" />
              <div className="relative flex items-center gap-3 border-b border-ivory/15 pb-5">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ivory text-navy">
                  <FiShield className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-xl text-ivory">Verification record</h3>
                  <p className="text-sm text-ivory/65">Each item stands on its own.</p>
                </div>
              </div>

              <div className="relative mt-5 space-y-3">
                {credibilityRows.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between gap-4 rounded-tile border border-ivory/15 bg-ivory/5 px-4 py-3"
                  >
                    <span className="text-sm font-bold text-ivory">{row.label}</span>
                    <Badge variant="warning">Review required</Badge>
                  </div>
                ))}
              </div>

              <p className="relative mt-5 flex items-start gap-2 rounded-tile border border-gold/25 bg-gold/10 px-4 py-3 text-xs leading-relaxed text-ivory/85">
                <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
                Reviewers see only the evidence needed for the specific claim they are assessing.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-ivory">
          <div className="page-shell py-16 lg:py-20">
            <div className="relative overflow-hidden rounded-card bg-navy px-6 py-12 text-center sm:px-12">
              <div className="lane-circles-gold pointer-events-none absolute -bottom-56 -left-36 h-[520px] w-[520px] rounded-full opacity-80" />
              <div className="relative">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-gold">
                  Start with substance
                </p>
                <h2 className="mx-auto mt-3 max-w-2xl text-3xl leading-tight text-ivory sm:text-4xl">
                  Build a profile that <span className="italic text-gold">means something.</span>
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-ivory/70">
                  {user
                    ? 'Return to your workspace to keep building credible connections and finding the right opportunities.'
                    : 'Join as an athlete, coach, or recruiter and help raise the standard for how sporting careers connect.'}
                </p>
                <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                  <Link
                    to={user ? '/dashboard' : '/register'}
                    className={buttonClasses({
                      variant: 'gold',
                      size: 'lg',
                      className: 'w-full sm:w-auto',
                    })}
                  >
                    {user ? 'Go to dashboard' : 'Create your account'}
                    <FiArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <Link
                    to={user ? '/opportunities' : '/login'}
                    className={buttonClasses({
                      variant: 'onDark',
                      size: 'lg',
                      className: 'w-full sm:w-auto',
                    })}
                  >
                    {user ? 'Browse opportunities' : 'Sign in'}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
