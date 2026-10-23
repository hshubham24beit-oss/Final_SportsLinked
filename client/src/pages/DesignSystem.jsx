import { useState } from 'react';
import {
  FiAward,
  FiBell,
  FiCheckCircle,
  FiFlag,
  FiPlus,
  FiShield,
  FiTrendingUp,
  FiUsers,
} from 'react-icons/fi';
import Logo, { LogoMark } from '../components/Logo';
import Alert from '../components/ui/Alert';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/Card';
import Checkbox from '../components/ui/Checkbox';
import Chip from '../components/ui/Chip';
import EmptyState from '../components/ui/EmptyState';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Pagination from '../components/ui/Pagination';
import ProgressBar from '../components/ui/ProgressBar';
import ProgressRing from '../components/ui/ProgressRing';
import Select from '../components/ui/Select';
import Skeleton, { SkeletonCard, SkeletonText } from '../components/ui/Skeleton';
import StatCard from '../components/ui/StatCard';
import TagInput from '../components/ui/TagInput';
import Textarea from '../components/ui/Textarea';
import Timeline from '../components/ui/Timeline';
import ToastViewport from '../components/ui/Toast';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const swatches = [
  { name: 'Ivory', value: 'bg-ivory', hex: '#FBF5EC', border: true },
  { name: 'Sand', value: 'bg-sand', hex: '#F6EEDF' },
  { name: 'Sand deep', value: 'bg-sand-deep', hex: '#F1E9DA' },
  { name: 'Line', value: 'bg-line', hex: '#EADFCF' },
  { name: 'Line strong', value: 'bg-line-strong', hex: '#DCCFB9' },
  { name: 'Navy', value: 'bg-navy', hex: '#14213D' },
  { name: 'Slate', value: 'bg-slate', hex: '#6B6F7B' },
  { name: 'Body', value: 'bg-body', hex: '#4A5468' },
  { name: 'Track', value: 'bg-track', hex: '#C8442B' },
  { name: 'Gold', value: 'bg-gold', hex: '#E9B44C' },
  { name: 'Verified', value: 'bg-verified', hex: '#1F6B44' },
  { name: 'Pending', value: 'bg-pending', hex: '#8A5F0A' },
];

const selectOptions = [
  { value: 'athlete', label: 'Athlete' },
  { value: 'coach', label: 'Coach' },
  { value: 'recruiter', label: 'Recruiter' },
];

const timelineItems = [
  {
    id: '1',
    title: 'National championship',
    subtitle: 'First place · 400m',
    meta: '2025',
    description: 'Result reviewed against the official event record.',
    current: false,
  },
  {
    id: '2',
    title: 'Regional selection',
    subtitle: 'Selected squad',
    meta: '2024',
    description: 'Experience listed by the athlete and awaiting review.',
    current: true,
  },
];

function Section({ id, eyebrow, title, description, children }) {
  return (
    <section id={id} className="scroll-mt-28 border-t border-line py-12 first:border-t-0 first:pt-0">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-2 text-2xl sm:text-3xl">{title}</h2>
      {description ? <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate">{description}</p> : null}
      <div className="mt-7">{children}</div>
    </section>
  );
}

export default function DesignSystem() {
  useDocumentTitle('Design system');
  const [modalOpen, setModalOpen] = useState(false);
  const [page, setPage] = useState(2);
  const [tags, setTags] = useState(['Sprint', 'Relay']);
  const [toasts, setToasts] = useState([]);
  const [checked, setChecked] = useState(true);

  const showToast = () => {
    setToasts([{ id: Date.now(), variant: 'success', title: 'Changes saved', description: 'Your profile is up to date.' }]);
  };

  return (
    <div className="min-h-screen bg-ivory">
      <header className="border-b border-line bg-sand/50">
        <div className="page-shell py-12 lg:py-16">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <Logo size="md" />
              <p className="eyebrow mt-8">SportLinked foundations</p>
              <h1 className="mt-2 text-4xl leading-tight sm:text-5xl">
                Track and Field <span className="display-emphasis">design system.</span>
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-body">
                Warm editorial surfaces, crisp Manrope interface text, and a track-red accent
                reserved for action and emphasis. Every verification state remains distinct.
              </p>
            </div>
            <Badge variant="brand">v1.0</Badge>
          </div>
        </div>
      </header>

      <main className="page-shell py-10 lg:py-14">
        <Section
          id="identity"
          eyebrow="Identity"
          title="Logo"
          description="The track mark uses a navy square, an ivory S, a gold starting point, and a track-red finish."
        >
          <div className="grid gap-4 md:grid-cols-3">
            <div className="surface-card flex min-h-44 items-center justify-center p-6">
              <Logo size="lg" />
            </div>
            <div className="flex min-h-44 items-center justify-center rounded-card bg-navy p-6">
              <Logo size="lg" variant="onDark" />
            </div>
            <div className="surface-card flex min-h-44 flex-col items-center justify-center gap-4 p-6">
              <LogoMark className="h-16 w-16" />
              <span className="text-xs font-bold text-slate">Standalone mark / favicon</span>
            </div>
          </div>
        </Section>

        <Section
          id="colour"
          eyebrow="Colour"
          title="Palette"
          description="Gold is an accent and a surface, never small text on ivory. Track red carries primary action."
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {swatches.map((swatch) => (
              <div key={swatch.name} className={`overflow-hidden rounded-tile border border-line ${swatch.border ? 'bg-white' : 'bg-white'}`}>
                <div className={`h-20 ${swatch.value}`} />
                <div className="border-t border-line px-3 py-2.5">
                  <p className="text-xs font-extrabold text-navy">{swatch.name}</p>
                  <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate">{swatch.hex}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section id="type" eyebrow="Typography" title="Editorial headings, practical interface">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="surface-card p-6">
              <p className="eyebrow">Fraunces · 500/600</p>
              <p className="mt-4 font-display text-4xl leading-tight text-navy sm:text-5xl">
                Credible careers start here.
              </p>
              <p className="mt-4 font-display text-2xl font-medium italic text-track">
                The right connections.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-slate">
                Headings use Fraunces with -0.02em tracking. Italics are reserved for emphasis inside
                a statement.
              </p>
            </div>
            <div className="surface-card p-6">
              <p className="eyebrow">Manrope · 500–800</p>
              <p className="mt-4 text-sm leading-relaxed text-body">
                Body copy stays direct and readable. Interface labels are bold, compact, and
                confident. Use sentence case for most controls.
              </p>
              <p className="mt-5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-track">
                Eyebrow / overline
              </p>
              <p className="mt-3 text-3xl font-extrabold tracking-tight text-navy">
                Aa 0123456789
              </p>
              <p className="mt-2 font-display text-3xl text-navy">Aa 0123456789</p>
            </div>
          </div>
        </Section>

        <Section id="buttons" eyebrow="Controls" title="Buttons" description="Pill controls with a 44px minimum target and a visible track focus ring.">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <Button>Primary action</Button>
              <Button variant="dark">Dark action</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Delete</Button>
              <Button variant="link">Link action</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
              <Button isLoading>Saving</Button>
              <Button disabled>Disabled</Button>
              <Button leftIcon={<FiPlus className="h-4 w-4" />}>With icon</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3 rounded-tile bg-navy p-4">
              <Button variant="gold">Gold on navy</Button>
              <Button variant="onDark">Outline on navy</Button>
            </div>
          </div>
        </Section>

        <Section id="status" eyebrow="Status" title="Badges, chips, and alerts" description="Identity, qualifications, and each achievement get their own status. No blanket verified label.">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge variant="neutral">Unverified</Badge>
              <Badge variant="brand">In review</Badge>
              <Badge variant="success" dot>Verified</Badge>
              <Badge variant="warning" dot>Pending</Badge>
              <Badge variant="danger">Rejected</Badge>
              <Badge variant="info">Suggestion</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Chip active count={8}>All results</Chip>
              <Chip count={4}>Sprint</Chip>
              <Chip count={2}>Relay</Chip>
              <Chip onRemove={() => {}}>Removable chip</Chip>
              <Chip active onClick={() => {}} count={12}>Interactive</Chip>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Alert variant="info" title="Suggestion only">
                This summary is a suggestion and must be reviewed before publishing.
              </Alert>
              <Alert variant="success" title="Verified separately">
                Identity verification does not verify qualifications or achievements.
              </Alert>
              <Alert variant="warning" title="Review required">
                A document upload starts a review. It does not verify the claim automatically.
              </Alert>
              <Alert variant="error" title="Could not save">
                Check your connection and try again. Your draft remains on this device.
              </Alert>
            </div>
          </div>
        </Section>

        <Section id="forms" eyebrow="Forms" title="Inputs and selection" description="Labels are always visible; errors are announced and paired with the field.">
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="surface-card space-y-5 p-6">
              <Input label="Full name" placeholder="e.g. Alex Morgan" hint="Use the name on your official records." />
              <Input label="Email address" type="email" placeholder="you@example.com" error="Enter a valid email address." />
              <Select label="Primary role" options={selectOptions} placeholder="Choose a role" />
              <Textarea label="Short biography" rows={3} placeholder="Describe your focus and experience." />
            </div>
            <div className="surface-card space-y-5 p-6">
              <Input label="Search" startIcon={<FiUsers className="h-4 w-4" />} placeholder="Search athletes" />
              <TagInput
                label="Specialities"
                value={tags}
                onChange={setTags}
                hint="Press Enter after each item."
              />
              <Checkbox
                label="Keep my evidence private"
                description="Reviewers see only the evidence needed for the specific claim."
                checked={checked}
                onChange={(event) => setChecked(event.target.checked)}
              />
              <div className="rounded-tile border border-dashed border-line-strong bg-sand/60 p-4 text-xs leading-relaxed text-slate">
                Disabled input state:
                <div className="mt-2">
                  <Input disabled value="Read only" aria-label="Disabled example" />
                </div>
              </div>
            </div>
          </div>
        </Section>

        <Section id="data" eyebrow="Data display" title="Cards, stats, and progress">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="Profile completion" value="82%" detail="Add two more achievements to finish." icon={<FiTrendingUp className="h-5 w-5" />} />
            <StatCard label="Unread notifications" value="12" detail="Three need your review." icon={<FiBell className="h-5 w-5" />} tone="navy" />
            <StatCard label="Verified items" value="3" detail="Each item was reviewed separately." icon={<FiShield className="h-5 w-5" />} tone="verified" />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <Card>
              <CardHeader>
                <CardTitle>Card anatomy</CardTitle>
                <CardDescription>White surface, 20px radius, line border, and a low soft shadow.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="inner-tile p-4">
                    <p className="text-xs font-extrabold uppercase tracking-[0.1em] text-slate">Inner tile</p>
                    <p className="mt-2 text-sm text-body">Use sand surfaces inside a white card for metadata.</p>
                  </div>
                  <div className="rounded-tile border border-line bg-white p-4">
                    <p className="text-xs font-extrabold uppercase tracking-[0.1em] text-slate">Quiet panel</p>
                    <p className="mt-2 text-sm text-body">Use white-on-white separation with a border only.</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2">
                <Badge variant="success">Reviewed</Badge>
                <Badge variant="warning">Awaiting review</Badge>
              </CardFooter>
            </Card>

            <div className="surface-card flex flex-col items-center justify-center gap-6 p-6">
              <ProgressRing value={82} />
              <div className="w-full space-y-4">
                <ProgressBar value={82} label="Profile completion" />
                <ProgressBar value={54} label="Verification progress" tone="success" />
              </div>
            </div>
          </div>
        </Section>

        <Section id="timeline" eyebrow="Chronology" title="Timeline and avatars">
          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <Card className="p-6">
              <p className="eyebrow">Gold spine</p>
              <h3 className="mt-2 text-xl">Achievements remain separate</h3>
              <Timeline className="mt-5" items={timelineItems} />
            </Card>
            <Card className="p-6">
              <p className="eyebrow">People</p>
              <h3 className="mt-2 text-xl">Avatar sizes</h3>
              <div className="mt-5 flex flex-wrap items-end gap-4">
                <Avatar name="Alex Morgan" size="xs" />
                <Avatar name="Alex Morgan" size="sm" />
                <Avatar name="Alex Morgan" size="md" />
                <Avatar name="Alex Morgan" size="lg" />
                <Avatar name="Alex Morgan" size="xl" />
                <Avatar name="Alex Morgan" size="2xl" />
              </div>
              <p className="mt-5 text-sm leading-relaxed text-slate">
                Initials fall back to a sand surface. Large profile images receive a white ring.
              </p>
            </Card>
          </div>
        </Section>

        <Section id="states" eyebrow="States" title="Loading, empty, and pagination">
          <div className="grid gap-4 lg:grid-cols-3">
            <SkeletonCard />
            <div className="surface-card p-5">
              <Skeleton className="h-10 w-10" rounded="rounded-full" />
              <SkeletonText className="mt-4" lines={4} />
              <div className="mt-5 flex gap-2">
                <Skeleton className="h-9 w-24" rounded="rounded-full" />
                <Skeleton className="h-9 w-20" rounded="rounded-full" />
              </div>
            </div>
            <EmptyState
              icon={FiFlag}
              title="No achievements yet"
              description="Add an achievement and submit it for separate review."
              action={<Button size="sm">Add achievement</Button>}
            />
          </div>
          <div className="surface-card mt-4">
            <Pagination page={page} totalPages={7} onChange={setPage} />
          </div>
        </Section>

        <Section id="overlays" eyebrow="Overlays" title="Modal and toast">
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setModalOpen(true)}>Open modal</Button>
            <Button variant="secondary" onClick={showToast}>Show toast</Button>
          </div>
          <Modal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Review this claim"
            description="Check the evidence and choose a status for this specific item only."
            footer={
              <>
                <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button onClick={() => setModalOpen(false)}>Confirm review</Button>
              </>
            }
          >
            <div className="space-y-3">
              <Alert variant="info" title="Evidence is private">
                Signed links expire quickly and are only shown to assigned reviewers.
              </Alert>
              <div className="inner-tile p-4">
                <p className="text-sm font-extrabold text-navy">Claim</p>
                <p className="mt-1 text-sm text-body">National championship · First place · 400m</p>
              </div>
            </div>
          </Modal>
          <ToastViewport toasts={toasts} onDismiss={(id) => setToasts((current) => current.filter((toast) => toast.id !== id))} />
        </Section>

        <Section id="iconography" eyebrow="Iconography" title="Line icons">
          <div className="surface-card flex flex-wrap gap-4 p-6">
            {[FiAward, FiBell, FiCheckCircle, FiFlag, FiPlus, FiShield, FiTrendingUp, FiUsers].map((Icon, index) => (
              <span key={index} className="flex h-11 w-11 items-center justify-center rounded-full bg-sand text-navy">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
            ))}
          </div>
        </Section>
      </main>
    </div>
  );
}
