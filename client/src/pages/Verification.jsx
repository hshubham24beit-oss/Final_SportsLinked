import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiAward,
  FiCheckCircle,
  FiClock,
  FiExternalLink,
  FiFileText,
  FiPlus,
  FiRefreshCw,
  FiShield,
  FiUpload,
} from 'react-icons/fi';
import Alert from '../components/ui/Alert';
import Badge from '../components/ui/Badge';
import Button, { buttonClasses } from '../components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import PageLoader from '../components/PageLoader';
import Select from '../components/ui/Select';
import Textarea from '../components/ui/Textarea';
import { verificationApi } from '../api/verification.api';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useToast } from '../hooks/useToast';
import { getErrorMessage } from '../utils/apiError';
import { formatDate } from '../utils/format';
import {
  VERIFICATION_TYPE_OPTIONS,
  achievementStatusLabel,
  achievementStatusVariant,
  verificationStatusLabel,
  verificationStatusVariant,
  verificationTypeLabel,
} from '../utils/verification';

function latestByType(requests, type) {
  return requests.find((request) => request.type === type) || null;
}

function SummaryCard({ title, status, description, actionLabel, onAction }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink">{title}</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-muted">{description}</p>
          </div>
          <Badge variant={verificationStatusVariant(status)}>
            {verificationStatusLabel(status)}
          </Badge>
        </div>
        {actionLabel ? (
          <Button
            variant="secondary"
            size="sm"
            className="mt-4"
            onClick={onAction}
            leftIcon={<FiShield className="h-4 w-4" aria-hidden="true" />}
          >
            {actionLabel}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function VerificationFormModal({
  open,
  onClose,
  initialType = 'identity',
  achievementId = '',
  request = null,
  achievements = [],
  onSaved,
}) {
  const toast = useToast();
  const isResubmit = Boolean(request);
  const [type, setType] = useState(request?.type || initialType);
  const [selectedAchievement, setSelectedAchievement] = useState(
    request?.achievement?.id || achievementId,
  );
  const [qualificationName, setQualificationName] = useState(
    request?.qualification?.name || '',
  );
  const [qualificationIssuer, setQualificationIssuer] = useState(
    request?.qualification?.issuer || '',
  );
  const [qualificationYear, setQualificationYear] = useState(
    request?.qualification?.year || '',
  );
  const [statement, setStatement] = useState(request?.statement || '');
  const [officialLink, setOfficialLink] = useState(request?.officialLinks?.[0]?.url || '');
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!isResubmit && type === 'achievement' && !selectedAchievement) {
      setError('Choose an achievement to verify.');
      return;
    }
    if (!isResubmit && type === 'qualification' && (!qualificationName || !qualificationIssuer)) {
      setError('Add the qualification name and issuing organization.');
      return;
    }
    if (!isResubmit && !file && !officialLink.trim()) {
      setError('Upload private evidence or add an official verification link.');
      return;
    }

    setIsSubmitting(true);
    try {
      let evidenceId = null;
      if (file) {
        const uploaded = await verificationApi.uploadEvidence(
          file,
          type === 'achievement' ? 'Achievement evidence' : `${type} evidence`,
        );
        evidenceId = uploaded.data.data.evidence.id;
      }

      const officialLinks = officialLink.trim()
        ? [{ url: officialLink.trim(), label: 'Official verification link' }]
        : [];

      if (isResubmit) {
        const payload = { statement };
        if (evidenceId) {
          payload.evidenceIds = [evidenceId];
        }
        if (officialLink.trim()) {
          payload.officialLinks = officialLinks;
        }
        await verificationApi.resubmit(request.id, payload);
      } else {
        const payload = {
          type,
          statement,
          officialLinks,
        };
        if (evidenceId) {
          payload.evidenceIds = [evidenceId];
        }
        if (type === 'achievement') {
          payload.achievementId = selectedAchievement;
        }
        if (type === 'qualification') {
          payload.qualification = {
            name: qualificationName,
            issuer: qualificationIssuer,
            year: qualificationYear ? Number(qualificationYear) : undefined,
            officialUrl: officialLink.trim(),
          };
        }
        await verificationApi.submit(payload);
      }

      toast.success(
        isResubmit ? 'Request resubmitted' : 'Verification requested',
        'Private evidence is visible only to you and authorised reviewers.',
      );
      onSaved();
      onClose();
    } catch (requestError) {
      const message = getErrorMessage(requestError);
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isResubmit ? 'Resubmit verification' : 'Request verification'}
      description="Evidence is stored privately and available only through short-lived signed links."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="verification-request-form"
            isLoading={isSubmitting}
            leftIcon={<FiUpload className="h-4 w-4" aria-hidden="true" />}
          >
            {isResubmit ? 'Resubmit request' : 'Submit for review'}
          </Button>
        </>
      }
    >
      <form id="verification-request-form" className="space-y-4" onSubmit={handleSubmit}>
        {error ? (
          <Alert variant="error" title="Could not submit request">
            {error}
          </Alert>
        ) : null}

        {!isResubmit ? (
          <Select
            label="Verification type"
            value={type}
            onChange={(event) => setType(event.target.value)}
            options={VERIFICATION_TYPE_OPTIONS}
            required
          />
        ) : (
          <div className="rounded-lg border border-line bg-slate-50 p-3 text-sm">
            <span className="font-medium text-ink">{verificationTypeLabel(request.type)}</span>
            {request.achievement?.title ? (
              <span className="text-ink-muted"> - {request.achievement.title}</span>
            ) : null}
          </div>
        )}

        {type === 'achievement' && !request ? (
          <Select
            label="Achievement"
            value={selectedAchievement}
            onChange={(event) => setSelectedAchievement(event.target.value)}
            options={achievements.map((achievement) => ({
              value: achievement.id,
              label: `${achievement.title} (${achievementStatusLabel(
                achievement.requestStatus === 'requested' ||
                  achievement.requestStatus === 'under_review'
                  ? 'pending'
                  : achievement.verificationStatus,
              )})`,
            }))}
            placeholder="Choose an achievement"
            required
          />
        ) : null}

        {type === 'qualification' && !request ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Qualification name"
              value={qualificationName}
              onChange={(event) => setQualificationName(event.target.value)}
              placeholder="e.g. Level 3 Athletics Coaching"
              required
            />
            <Input
              label="Issuing organization"
              value={qualificationIssuer}
              onChange={(event) => setQualificationIssuer(event.target.value)}
              placeholder="e.g. National Athletics Federation"
              required
            />
            <Input
              label="Year awarded"
              type="number"
              min="1900"
              max="2100"
              value={qualificationYear}
              onChange={(event) => setQualificationYear(event.target.value)}
              containerClassName="sm:col-span-2"
            />
          </div>
        ) : null}

        <Textarea
          label="Statement"
          value={statement}
          onChange={(event) => setStatement(event.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="Explain what is being verified and where reviewers can confirm it."
        />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink" htmlFor="verification-evidence">
            Private evidence
          </label>
          <input
            id="verification-evidence"
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
            className="block w-full rounded-lg border border-line-strong bg-white p-2 text-sm text-ink file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-brand-700"
          />
          <p className="mt-1.5 text-xs text-ink-subtle">
            One image, PDF, DOC, or DOCX file up to 10 MB. Existing evidence stays attached when
            resubmitting.
          </p>
        </div>

        <Input
          label="Official verification link"
          type="url"
          value={officialLink}
          onChange={(event) => setOfficialLink(event.target.value)}
          placeholder="https://official-results.example.com/result"
          hint="Optional if private evidence is attached. Links are shown only to reviewers."
        />
      </form>
    </Modal>
  );
}

export default function Verification() {
  const toast = useToast();
  useDocumentTitle('Verification');
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const response = await verificationApi.getMine();
      setData(response.data.data);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openEvidence = async (request, evidence) => {
    try {
      const response = await verificationApi.evidenceUrl(request.id, evidence.id);
      const url = response.data.data.evidence.url;
      const tab = window.open('', '_blank');
      if (tab) {
        tab.opener = null;
        tab.location.href = url;
      } else {
        toast.info('Popup blocked', 'Allow popups to open the private evidence link.');
      }
    } catch (requestError) {
      toast.error('Could not open evidence', getErrorMessage(requestError));
    }
  };

  if (isLoading) {
    return <PageLoader message="Loading verification requests..." />;
  }

  if (error) {
    return (
      <Alert variant="error" title="Verification could not be loaded">
        {error}
      </Alert>
    );
  }

  const requests = data?.requests || [];
  const achievements = data?.achievements || [];
  const identityRequest = latestByType(requests, 'identity');
  const qualificationRequest = latestByType(requests, 'qualification');
  const summary = data?.summary || { identity: null, qualifications: [] };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Verification</h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink-muted">
            Request identity, qualification, or achievement verification. Each approved item is
            shown separately on your profile, and private evidence is never publicly exposed.
          </p>
        </div>
        <Button
          onClick={() => setModal({ key: Date.now(), type: 'identity' })}
          leftIcon={<FiPlus className="h-4 w-4" aria-hidden="true" />}
        >
          Request verification
        </Button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <SummaryCard
          title="Identity"
          status={identityRequest?.status || 'unverified'}
          description="Confirms the account belongs to the named person."
          actionLabel={identityRequest?.status === 'verified' ? null : 'Verify identity'}
          onAction={() => setModal({ key: Date.now(), type: 'identity' })}
        />
        <SummaryCard
          title="Qualifications"
          status={qualificationRequest?.status || 'unverified'}
          description={`${summary.qualifications.length} approved qualification${
            summary.qualifications.length === 1 ? '' : 's'
          } on your public profile.`}
          actionLabel="Add qualification"
          onAction={() => setModal({ key: Date.now(), type: 'qualification' })}
        />
      </div>

      {summary.identity || summary.qualifications.length > 0 ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Approved public verifications</CardTitle>
            <CardDescription>
              These records are shown on your public profile with their own individual badges.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {summary.identity ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-line p-3">
                <div>
                  <p className="text-sm font-medium text-ink">Identity</p>
                  <p className="text-xs text-ink-subtle">
                    Verified {formatDate(summary.identity.verifiedAt)}
                  </p>
                </div>
                <Badge variant="success" size="sm">
                  <FiCheckCircle className="h-3 w-3" aria-hidden="true" />
                  Verified
                </Badge>
              </div>
            ) : null}
            {summary.qualifications.map((qualification) => (
              <div
                key={qualification.requestId}
                className="flex items-center justify-between gap-3 rounded-lg border border-line p-3"
              >
                <div>
                  <p className="text-sm font-medium text-ink">{qualification.name}</p>
                  <p className="text-xs text-ink-subtle">
                    {[qualification.issuer, qualification.year].filter(Boolean).join(' - ')}
                  </p>
                </div>
                <Badge variant="success" size="sm">
                  <FiCheckCircle className="h-3 w-3" aria-hidden="true" />
                  Verified
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Achievements</CardTitle>
            <CardDescription>Verification is granted per achievement, never automatically.</CardDescription>
          </CardHeader>
          <CardContent>
            {achievements.length === 0 ? (
              <EmptyState
                icon={FiAward}
                title="No achievements yet"
                description="Add an achievement from your profile before requesting verification."
                action={
                  <Link to="/profile/edit" className={buttonClasses({ size: 'sm' })}>
                    Add an achievement
                  </Link>
                }
              />
            ) : (
              <div className="space-y-2.5">
                {achievements.map((achievement) => {
                  const isActive = ['requested', 'under_review'].includes(
                    achievement.requestStatus,
                  );
                  const isVerified = achievement.verificationStatus === 'verified';
                  const canRequest = !isActive && !isVerified;
                  return (
                    <div
                      key={achievement.id}
                      className="flex flex-col gap-2 rounded-lg border border-line p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">{achievement.title}</p>
                        <p className="truncate text-xs text-ink-subtle">
                          {[achievement.sport, achievement.date && formatDate(achievement.date)]
                            .filter(Boolean)
                            .join(' - ')}
                        </p>
                        <Badge
                          className="mt-1.5"
                          size="sm"
                          variant={achievementStatusVariant(achievement.verificationStatus)}
                        >
                          {achievementStatusLabel(achievement.verificationStatus)}
                        </Badge>
                      </div>
                      {canRequest ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            setModal({
                              key: Date.now(),
                              type: 'achievement',
                              achievementId: achievement.id,
                            })
                          }
                        >
                          {achievement.verificationStatus === 'unverified'
                            ? 'Request verification'
                            : 'Try again'}
                        </Button>
                      ) : (
                        <Badge variant={isVerified ? 'success' : 'info'} size="sm">
                          {!isVerified ? (
                            <FiClock className="h-3 w-3" aria-hidden="true" />
                          ) : (
                            <FiCheckCircle className="h-3 w-3" aria-hidden="true" />
                          )}
                          {isVerified ? 'Verified' : 'In review'}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Request history</CardTitle>
            <CardDescription>Decisions, reviewer notes, and private evidence.</CardDescription>
          </CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <EmptyState
                icon={FiFileText}
                title="No requests yet"
                description="Submit evidence to start the verification process."
              />
            ) : (
              <div className="space-y-3">
                {requests.map((request) => (
                  <article key={request.id} className="rounded-lg border border-line p-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-ink">
                          {verificationTypeLabel(request.type)}
                          {request.achievement?.title ? ` - ${request.achievement.title}` : ''}
                          {request.qualification?.name ? ` - ${request.qualification.name}` : ''}
                        </p>
                        <p className="mt-0.5 text-xs text-ink-subtle">
                          Submitted {formatDate(request.submittedAt)}
                        </p>
                      </div>
                      <Badge variant={verificationStatusVariant(request.status)} size="sm">
                        {verificationStatusLabel(request.status)}
                      </Badge>
                    </div>

                    {request.reason ? (
                      <p className="mt-2 rounded-md bg-slate-50 p-2 text-xs leading-relaxed text-ink-muted">
                        Reviewer note: {request.reason}
                      </p>
                    ) : null}

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {request.evidence.map((evidence) => (
                        <button
                          key={evidence.id}
                          type="button"
                          onClick={() => openEvidence(request, evidence)}
                          className="inline-flex items-center gap-1.5 rounded-md border border-line bg-white px-2 py-1 text-xs font-medium text-ink-muted hover:bg-slate-50"
                        >
                          <FiExternalLink className="h-3 w-3" aria-hidden="true" />
                          {evidence.originalName}
                        </button>
                      ))}
                      {['rejected', 'expired'].includes(request.status) ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            setModal({ key: Date.now(), type: request.type, request })
                          }
                          leftIcon={<FiRefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
                        >
                          Resubmit
                        </Button>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {modal ? (
        <VerificationFormModal
          key={modal.key}
          open
          onClose={() => setModal(null)}
          initialType={modal.type}
          achievementId={modal.achievementId}
          request={modal.request}
          achievements={achievements}
          onSaved={load}
        />
      ) : null}
    </div>
  );
}
