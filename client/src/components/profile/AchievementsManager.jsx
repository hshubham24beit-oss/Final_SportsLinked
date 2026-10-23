import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiAward,
  FiCpu,
  FiEdit2,
  FiExternalLink,
  FiPlus,
  FiTrash2,
} from 'react-icons/fi';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import EmptyState from '../ui/EmptyState';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import Textarea from '../ui/Textarea';
import { achievementApi } from '../../api/achievement.api';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage, getFieldErrors } from '../../utils/apiError';
import { formatDate } from '../../utils/format';
import {
  emptyAchievement,
  getAchievementVerificationMeta,
  toDateInput,
} from '../../utils/profile';

function sortAchievements(items) {
  return [...items].sort((left, right) => {
    const leftDate = left.date ? new Date(left.date).getTime() : 0;
    const rightDate = right.date ? new Date(right.date).getTime() : 0;
    return rightDate - leftDate;
  });
}

export default function AchievementsManager({ achievements, setAchievements }) {
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyAchievement());
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyAchievement());
    setErrors({});
    setServerError('');
    setIsOpen(true);
  };

  const openEdit = (achievement) => {
    setEditingId(achievement.id);
    setForm({
      title: achievement.title || '',
      sport: achievement.sport || '',
      competition: achievement.competition || '',
      result: achievement.result || '',
      date: toDateInput(achievement.date),
      description: achievement.description || '',
      evidenceRefs:
        achievement.evidenceRefs && achievement.evidenceRefs.length > 0
          ? achievement.evidenceRefs.map((item) => ({
              url: item.url || '',
              label: item.label || '',
            }))
          : [{ url: '', label: '' }],
    });
    setErrors({});
    setServerError('');
    setIsOpen(true);
  };

  const closeModal = () => {
    if (isSaving) return;
    setIsOpen(false);
  };

  const setField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setServerError('');
  };

  const setEvidence = (index, key, value) => {
    setForm((current) => ({
      ...current,
      evidenceRefs: current.evidenceRefs.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    }));
    setErrors((current) => ({ ...current, [`evidenceRefs.${index}.${key}`]: undefined }));
    setServerError('');
  };

  const addEvidence = () => {
    if (form.evidenceRefs.length >= 10) return;
    setForm((current) => ({
      ...current,
      evidenceRefs: [...current.evidenceRefs, { url: '', label: '' }],
    }));
  };

  const removeEvidence = (index) => {
    setForm((current) => ({
      ...current,
      evidenceRefs:
        current.evidenceRefs.length === 1
          ? [{ url: '', label: '' }]
          : current.evidenceRefs.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setServerError('');

    const localErrors = {};
    if (!form.title.trim()) localErrors.title = 'Add an achievement title.';
    if (!form.sport.trim()) localErrors.sport = 'Add the sport for this achievement.';
    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      return;
    }

    const payload = {
      title: form.title.trim(),
      sport: form.sport.trim(),
      competition: form.competition.trim(),
      result: form.result.trim(),
      description: form.description.trim(),
      ...(form.date ? { date: form.date } : {}),
      evidenceRefs: form.evidenceRefs
        .filter((item) => item.url.trim())
        .map((item) => ({ url: item.url.trim(), label: item.label.trim() })),
    };

    setIsSaving(true);
    try {
      const response = editingId
        ? await achievementApi.update(editingId, payload)
        : await achievementApi.create(payload);
      const saved = response.data.data.achievement;

      setAchievements((current) =>
        sortAchievements(
          editingId
            ? current.map((item) => (item.id === editingId ? saved : item))
            : [saved, ...current],
        ),
      );
      setIsOpen(false);
      toast.success(
        editingId ? 'Achievement updated' : 'Achievement added',
        editingId
          ? 'Your changes are saved.'
          : 'The achievement is now part of your profile.',
      );
    } catch (error) {
      setServerError(getErrorMessage(error));
      const fieldErrors = getFieldErrors(error);
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await achievementApi.remove(deleteTarget.id);
      setAchievements((current) => current.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast.success('Achievement removed', 'It is no longer part of your profile.');
    } catch (error) {
      toast.error('Could not remove the achievement', getErrorMessage(error));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-navy">Achievements</h2>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-body">
            Add results, competitions, and awards. Evidence links stay private, and only
            achievements marked verified by SportLinked show a verified badge.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/ai?tab=content&kind=achievement"
            className="inline-flex h-9 items-center gap-1.5 rounded-tile border border-line-strong bg-white px-3 text-sm font-semibold text-navy transition-colors hover:bg-sand/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-track"
          >
            <FiCpu className="h-4 w-4" aria-hidden="true" />
            Draft with AI
          </Link>
          <Button
            size="sm"
            onClick={openCreate}
            leftIcon={<FiPlus className="h-4 w-4" aria-hidden="true" />}
          >
            Add achievement
          </Button>
        </div>
      </div>

      <div className="mt-5">
        {achievements.length === 0 ? (
          <EmptyState
            icon={FiAward}
            title="No achievements yet"
            description="Add a verified or self-reported achievement to give your profile more context."
            action={
              <Button size="sm" variant="secondary" onClick={openCreate}>
                Add your first achievement
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {achievements.map((achievement) => {
              const verification = getAchievementVerificationMeta(
                achievement.verificationStatus,
              );
              return (
                <article
                  key={achievement.id}
                  className="rounded-card border border-line bg-white p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-navy">{achievement.title}</h3>
                        <Badge size="sm" variant={verification.variant}>
                          {verification.label}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-body">
                        {[achievement.sport, achievement.competition, achievement.result]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                      {achievement.date ? (
                        <p className="mt-1 text-xs text-slate">
                          {formatDate(achievement.date)}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(achievement)}
                        className="rounded-tile p-2 text-slate transition-colors hover:bg-sand hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-track"
                        aria-label={`Edit ${achievement.title}`}
                      >
                        <FiEdit2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(achievement)}
                        className="rounded-tile p-2 text-slate transition-colors hover:bg-danger-50 hover:text-danger-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-track"
                        aria-label={`Delete ${achievement.title}`}
                      >
                        <FiTrash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {achievement.description ? (
                    <p className="mt-3 text-sm leading-relaxed text-body">
                      {achievement.description}
                    </p>
                  ) : null}

                  {achievement.evidenceRefs && achievement.evidenceRefs.length > 0 ? (
                    <div className="mt-3 border-t border-line pt-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate">
                        Private evidence
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        {achievement.evidenceRefs.map((evidence, index) => (
                          <a
                            key={`${evidence.url}-${index}`}
                            href={evidence.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-track underline-offset-4 hover:underline"
                          >
                            {evidence.label || `Evidence ${index + 1}`}
                            <FiExternalLink className="h-3 w-3" aria-hidden="true" />
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        open={isOpen}
        onClose={closeModal}
        size="lg"
        title={editingId ? 'Edit achievement' : 'Add achievement'}
        description="Only verified achievements display a verified badge. Evidence is never shown publicly."
        footer={
          <>
            <Button variant="secondary" size="md" onClick={closeModal} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="achievement-form"
              size="md"
              isLoading={isSaving}
            >
              {editingId ? 'Save changes' : 'Add achievement'}
            </Button>
          </>
        }
      >
        <form id="achievement-form" onSubmit={handleSubmit} className="space-y-4">
          {serverError ? <Alert variant="error">{serverError}</Alert> : null}

          <Alert variant="info">
            Evidence links are kept private. A separate SportLinked review is required before an
            achievement can be marked verified.
          </Alert>

          <Input
            label="Achievement title"
            value={form.title}
            onChange={(event) => setField('title', event.target.value)}
            error={errors.title}
            placeholder="e.g. State 100m champion"
            maxLength={160}
            required
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Sport"
              value={form.sport}
              onChange={(event) => setField('sport', event.target.value)}
              error={errors.sport}
              placeholder="e.g. Athletics"
              maxLength={80}
              required
            />
            <Input
              label="Date"
              type="date"
              value={form.date}
              onChange={(event) => setField('date', event.target.value)}
              error={errors.date}
            />
            <Input
              label="Competition or event"
              value={form.competition}
              onChange={(event) => setField('competition', event.target.value)}
              error={errors.competition}
              placeholder="e.g. State Championships"
              maxLength={160}
            />
            <Input
              label="Result"
              value={form.result}
              onChange={(event) => setField('result', event.target.value)}
              error={errors.result}
              placeholder="e.g. Gold"
              maxLength={160}
            />
          </div>
          <Textarea
            label="Description"
            rows={3}
            value={form.description}
            onChange={(event) => setField('description', event.target.value)}
            error={errors.description}
            placeholder="Add context about the achievement."
            maxLength={2000}
          />

          <div className="rounded-tile border border-line p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-navy">Private evidence links</p>
                <p className="mt-0.5 text-xs text-body">
                  Add links to certificates, results, or other supporting material.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={addEvidence}
                disabled={form.evidenceRefs.length >= 10}
                leftIcon={<FiPlus className="h-3.5 w-3.5" aria-hidden="true" />}
              >
                Add
              </Button>
            </div>

            <div className="mt-3 space-y-2">
              {form.evidenceRefs.map((evidence, index) => (
                <div key={index} className="grid gap-2 sm:grid-cols-[1fr_180px_auto]">
                  <Input
                    aria-label={`Evidence URL ${index + 1}`}
                    placeholder="https://..."
                    value={evidence.url}
                    onChange={(event) => setEvidence(index, 'url', event.target.value)}
                    error={errors[`evidenceRefs.${index}.url`]}
                  />
                  <Input
                    aria-label={`Evidence label ${index + 1}`}
                    placeholder="e.g. Certificate"
                    value={evidence.label}
                    onChange={(event) => setEvidence(index, 'label', event.target.value)}
                    error={errors[`evidenceRefs.${index}.label`]}
                  />
                  <button
                    type="button"
                    onClick={() => removeEvidence(index)}
                    className="self-start rounded-tile p-2.5 text-slate transition-colors hover:bg-danger-50 hover:text-danger-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-track"
                    aria-label={`Remove evidence ${index + 1}`}
                  >
                    <FiTrash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => (isDeleting ? null : setDeleteTarget(null))}
        title="Remove this achievement?"
        description={
          deleteTarget
            ? `“${deleteTarget.title}” will be removed from your profile.`
            : undefined
        }
        footer={
          <>
            <Button
              variant="secondary"
              size="md"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="md"
              onClick={handleDelete}
              isLoading={isDeleting}
            >
              Remove achievement
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-body">
          Private evidence links are removed with the achievement record. This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
