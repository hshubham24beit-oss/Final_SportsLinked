import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  FiArrowLeft,
  FiBookmark,
  FiCalendar,
  FiCheckCircle,
  FiEdit3,
  FiFileText,
  FiMapPin,
  FiSend,
  FiUsers,
} from 'react-icons/fi';
import Alert from '../components/ui/Alert';
import Badge from '../components/ui/Badge';
import Button, { buttonClasses } from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import PageLoader from '../components/PageLoader';
import Textarea from '../components/ui/Textarea';
import { applicationsApi } from '../api/applications.api';
import { opportunitiesApi } from '../api/opportunities.api';
import { useAuth } from '../hooks/useAuth';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useToast } from '../hooks/useToast';
import { getErrorMessage } from '../utils/apiError';
import { formatDate } from '../utils/format';
import {
  applicationStatusLabel,
  applicationStatusVariant,
  formatDeadline,
  opportunityStatusLabel,
  opportunityStatusVariant,
  opportunityTypeLabel,
} from '../utils/opportunities';

function DetailRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-track" aria-hidden="true" />
      <div>
        <dt className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-slate">{label}</dt>
        <dd className="mt-0.5 text-sm text-navy">{value}</dd>
      </div>
    </div>
  );
}

function ApplyDialog({ open, onClose, opportunity, onApplied }) {
  const toast = useToast();
  const [coverNote, setCoverNote] = useState('');
  const [documents, setDocuments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setCoverNote('');
      setDocuments([]);
      setError('');
    }
  }, [open]);

  const handleFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    setIsUploading(true);
    setError('');
    try {
      for (const file of files) {
        const response = await applicationsApi.uploadDocument(file);
        const uploaded = response.data.data.document;
        setDocuments((current) => [
          ...current,
          {
            ...uploaded,
            label: file.name.replace(/\.[^.]+$/, ''),
          },
        ]);
      }
      toast.success('Document uploaded', 'Set the label to match any required document.');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      event.target.value = '';
      setIsUploading(false);
    }
  };

  const submit = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      const response = await opportunitiesApi.apply(opportunity.id, {
        coverNote: coverNote.trim(),
        documents: documents.map(({ label, name, url, publicId, provider, mimeType, size }) => ({
          label: label.trim(),
          name,
          url,
          publicId,
          provider,
          mimeType,
          size,
        })),
      });
      toast.success('Application submitted', 'You can follow its progress in your tracker.');
      onApplied(response.data.data.application);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Apply for ${opportunity?.title || 'opportunity'}`}
      description="Your verified profile snapshot is submitted with this application."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            isLoading={isSubmitting}
            disabled={isUploading}
            leftIcon={<FiSend className="h-4 w-4" aria-hidden="true" />}
          >
            Submit application
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error ? <Alert variant="error">{error}</Alert> : null}

        <Textarea
          label="Cover note"
          value={coverNote}
          onChange={(event) => setCoverNote(event.target.value)}
          maxLength={2000}
          rows={5}
          hint={`${coverNote.length}/2000 characters. Optional but useful for the reviewer.`}
          placeholder="Share why you are a good fit for this opportunity."
        />

        {opportunity?.requiredDocuments?.length > 0 ? (
          <div className="rounded-tile border border-line bg-sand/70 p-3.5">
            <p className="text-sm font-semibold text-navy">Required documents</p>
            <ul className="mt-1.5 space-y-1 text-xs text-track">
              {opportunity.requiredDocuments.map((label) => (
                <li key={label}>- {label}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-track">
              Upload each document and set its label to match the required name exactly.
            </p>
          </div>
        ) : null}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-navy" htmlFor="application-files">
            Documents
          </label>
          <input
            id="application-files"
            type="file"
            multiple
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFiles}
            disabled={isUploading}
            className="block w-full rounded-tile border border-line-strong bg-white px-3 py-2 text-sm text-navy file:mr-3 file:rounded-tile file:border-0 file:bg-sand file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-track"
          />
          <p className="mt-1.5 text-xs text-slate">PDF, DOC, or DOCX. Up to 10 MB each.</p>
        </div>

        {isUploading ? <p className="text-sm text-body">Uploading document...</p> : null}

        {documents.length > 0 ? (
          <div className="space-y-2">
            {documents.map((document, index) => (
              <div
                key={`${document.url}-${index}`}
                className="flex items-start gap-2 rounded-tile border border-line p-3"
              >
                <FiFileText className="mt-2 h-4 w-4 shrink-0 text-track" aria-hidden="true" />
                <Input
                  label="Document label"
                  value={document.label}
                  onChange={(event) =>
                    setDocuments((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, label: event.target.value } : item,
                      ),
                    )
                  }
                  containerClassName="min-w-0 flex-1"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-6"
                  onClick={() =>
                    setDocuments((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

export default function OpportunityDetail() {
  useDocumentTitle('Opportunity');
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const [opportunity, setOpportunity] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isActioning, setIsActioning] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await opportunitiesApi.get(id);
      setOpportunity(response.data.data.opportunity);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleSave = async () => {
    setIsSaving(true);
    try {
      if (opportunity.saved) {
        await opportunitiesApi.unsave(opportunity.id);
        setOpportunity((current) => ({ ...current, saved: false }));
      } else {
        await opportunitiesApi.save(opportunity.id);
        setOpportunity((current) => ({ ...current, saved: true }));
      }
    } catch (requestError) {
      toast.error('Could not update saved opportunity', getErrorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  };

  const runOwnerAction = async (action) => {
    setIsActioning(true);
    try {
      const response =
        action === 'publish'
          ? await opportunitiesApi.publish(opportunity.id)
          : await opportunitiesApi.close(opportunity.id);
      setOpportunity(response.data.data.opportunity);
      toast.success(
        action === 'publish' ? 'Opportunity published' : 'Opportunity closed',
        response.data.message,
      );
    } catch (requestError) {
      toast.error('Could not update opportunity', getErrorMessage(requestError));
    } finally {
      setIsActioning(false);
    }
  };

  if (isLoading) return <PageLoader message="Loading opportunity..." />;

  if (error || !opportunity) {
    return (
      <div>
        <Alert variant="error" title="Opportunity could not be loaded">
          {error || 'This opportunity may no longer be available.'}
        </Alert>
        <Link to="/opportunities" className={`${buttonClasses({ variant: 'secondary' })} mt-4`}>
          Back to opportunities
        </Link>
      </div>
    );
  }

  const isAthlete = user.role === 'athlete';
  const isOpen = opportunity.status === 'published' && new Date(opportunity.deadline) > new Date();
  const location = [opportunity.location?.city, opportunity.location?.region, opportunity.location?.country]
    .filter(Boolean)
    .join(', ');
  const canApply = isAthlete && isOpen && !opportunity.myApplicationStatus;

  return (
    <div>
      <Link
        to="/opportunities"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-body hover:text-navy"
      >
        <FiArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to opportunities
      </Link>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <section className="rounded-card border border-line bg-white p-6 shadow-card">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="brand">{opportunityTypeLabel(opportunity.type)}</Badge>
              <Badge variant={opportunityStatusVariant(opportunity.status)}>
                {opportunityStatusLabel(opportunity.status)}
              </Badge>
              {opportunity.myApplicationStatus ? (
                <Badge variant={applicationStatusVariant(opportunity.myApplicationStatus)}>
                  {applicationStatusLabel(opportunity.myApplicationStatus)}
                </Badge>
              ) : null}
            </div>
            <h1 className="mt-4 text-3xl leading-tight sm:text-4xl">
              {opportunity.title}
            </h1>
            <p className="mt-1.5 text-sm text-body">
              Published by <span className="font-medium text-navy">{opportunity.publisherName}</span>
            </p>

            <dl className="mt-6 grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
              <DetailRow
                icon={FiCalendar}
                label="Deadline"
                value={formatDeadline(opportunity.deadline)}
              />
              <DetailRow icon={FiMapPin} label="Location" value={location} />
              <DetailRow
                icon={FiUsers}
                label="Sport and positions"
                value={[opportunity.sport, ...(opportunity.positions || [])]
                  .filter(Boolean)
                  .join(' - ')}
              />
              <DetailRow
                icon={FiCheckCircle}
                label="Places available"
                value={String(opportunity.positionsAvailable || 1)}
              />
              {opportunity.eventStartDate ? (
                <DetailRow
                  icon={FiCalendar}
                  label="Event dates"
                  value={
                    opportunity.eventEndDate
                      ? `${formatDate(opportunity.eventStartDate)} to ${formatDate(opportunity.eventEndDate)}`
                      : formatDate(opportunity.eventStartDate)
                  }
                />
              ) : null}
            </dl>
          </section>

          <section className="rounded-card border border-line bg-white p-6 shadow-card">
            <h2 className="font-display text-xl">About this opportunity</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-body">
              {opportunity.description}
            </p>
          </section>

          <section className="rounded-card border border-line bg-white p-6 shadow-card">
            <h2 className="font-display text-xl">Eligibility</h2>
            {opportunity.eligibility?.notes ? (
              <p className="mt-2 whitespace-pre-line text-sm text-body">
                {opportunity.eligibility.notes}
              </p>
            ) : null}
            <ul className="mt-3 space-y-2 text-sm text-body">
              {opportunity.eligibility?.levels?.length ? (
                <li>Athlete levels: {opportunity.eligibility.levels.join(', ')}</li>
              ) : null}
              {opportunity.eligibility?.ageCategories?.length ? (
                <li>Age categories: {opportunity.eligibility.ageCategories.join(', ')}</li>
              ) : null}
              {opportunity.eligibility?.competitionLevels?.length ? (
                <li>Competition levels: {opportunity.eligibility.competitionLevels.join(', ')}</li>
              ) : null}
              {opportunity.eligibility?.minExperienceYears !== undefined ? (
                <li>Minimum experience: {opportunity.eligibility.minExperienceYears} years</li>
              ) : null}
              {opportunity.eligibility?.maxExperienceYears !== undefined ? (
                <li>Maximum experience: {opportunity.eligibility.maxExperienceYears} years</li>
              ) : null}
              {opportunity.eligibility?.requiresVerifiedAchievement ? (
                <li>A verified achievement is required.</li>
              ) : null}
              {!opportunity.eligibility?.levels?.length &&
              !opportunity.eligibility?.ageCategories?.length &&
              !opportunity.eligibility?.competitionLevels?.length &&
              opportunity.eligibility?.minExperienceYears === undefined &&
              opportunity.eligibility?.maxExperienceYears === undefined &&
              !opportunity.eligibility?.requiresVerifiedAchievement &&
              !opportunity.eligibility?.notes ? (
                <li>No additional eligibility requirements were listed.</li>
              ) : null}
            </ul>

            {opportunity.requiredDocuments?.length > 0 ? (
              <>
                <h3 className="mt-5 text-sm font-semibold text-navy">Required documents</h3>
                <ul className="mt-2 space-y-1 text-sm text-body">
                  {opportunity.requiredDocuments.map((label) => (
                    <li key={label}>- {label}</li>
                  ))}
                </ul>
              </>
            ) : null}
          </section>

          {opportunity.contactInstructions ? (
            <section className="rounded-card border border-line bg-white p-6 shadow-card">
              <h2 className="font-display text-xl">Contact instructions</h2>
              <p className="mt-2 whitespace-pre-line text-sm text-body">
                {opportunity.contactInstructions}
              </p>
            </section>
          ) : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-card border border-line bg-white p-5 shadow-card">
            {opportunity.isOwner ? (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-navy">Manage this opportunity</p>
                {opportunity.canEdit ? (
                  <Link
                    to={`/opportunities/${opportunity.id}/edit`}
                    className={buttonClasses({ variant: 'secondary', fullWidth: true, size: 'sm' })}
                  >
                    <FiEdit3 className="h-4 w-4" aria-hidden="true" />
                    Edit listing
                  </Link>
                ) : null}
                <Link
                  to={`/opportunities/${opportunity.id}/applicants`}
                  className={buttonClasses({ fullWidth: true, size: 'sm' })}
                >
                  View applicants
                </Link>
                {opportunity.status === 'draft' ? (
                  <Button
                    fullWidth
                    size="sm"
                    isLoading={isActioning}
                    onClick={() => runOwnerAction('publish')}
                  >
                    Publish opportunity
                  </Button>
                ) : null}
                {opportunity.status === 'published' ? (
                  <Button
                    variant="danger"
                    fullWidth
                    size="sm"
                    isLoading={isActioning}
                    onClick={() => runOwnerAction('close')}
                  >
                    Close opportunity
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="space-y-3">
                {canApply ? (
                  <Button fullWidth onClick={() => setIsApplyOpen(true)}>
                    Apply now
                  </Button>
                ) : null}
                {opportunity.myApplicationStatus ? (
                  <div>
                    <p className="text-sm text-body">Your application status</p>
                    <div className="mt-1.5">
                      <Badge variant={applicationStatusVariant(opportunity.myApplicationStatus)}>
                        {applicationStatusLabel(opportunity.myApplicationStatus)}
                      </Badge>
                    </div>
                    <Link
                      to="/applications"
                      className={`${buttonClasses({ variant: 'secondary', size: 'sm', fullWidth: true })} mt-3`}
                    >
                      Open application tracker
                    </Link>
                  </div>
                ) : null}
                {!isOpen && !opportunity.myApplicationStatus ? (
                  <p className="text-sm text-body">
                    This opportunity is no longer accepting applications.
                  </p>
                ) : null}
                <Button
                  variant="secondary"
                  fullWidth
                  isLoading={isSaving}
                  onClick={toggleSave}
                  leftIcon={<FiBookmark className="h-4 w-4" aria-hidden="true" />}
                >
                  {opportunity.saved ? 'Remove from saved' : 'Save for later'}
                </Button>
              </div>
            )}
          </div>

          <div className="rounded-card border border-line bg-sand/70 p-5 text-sm text-navy">
            <p className="font-semibold">What gets submitted</p>
            <p className="mt-1.5 text-xs leading-relaxed text-track">
              Your profile snapshot is captured at submission time. Later profile edits do not
              change an application already under review.
            </p>
          </div>
        </aside>
      </div>

      {canApply || opportunity.myApplicationStatus ? (
        <ApplyDialog
          open={isApplyOpen}
          onClose={() => setIsApplyOpen(false)}
          opportunity={opportunity}
          onApplied={(application) => {
            setIsApplyOpen(false);
            navigate(`/applications/${application.id}`);
          }}
        />
      ) : null}

      {!opportunity.isOwner && !isAthlete && !isOpen ? (
        <EmptyState
          className="mt-6"
          title="Applications are closed"
          description="This listing is visible for reference but is not accepting new applications."
        />
      ) : null}
    </div>
  );
}
