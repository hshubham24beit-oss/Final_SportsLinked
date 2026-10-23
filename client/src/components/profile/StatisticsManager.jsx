import { useState } from 'react';
import { FiBarChart2, FiEdit2, FiPlus, FiTrash2 } from 'react-icons/fi';
import Alert from '../ui/Alert';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import { statisticsApi } from '../../api/statistics.api';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage, getFieldErrors } from '../../utils/apiError';
import { formatDate } from '../../utils/format';
import { emptyStatistic, toDateInput } from '../../utils/profile';

export default function StatisticsManager({ statistics, setStatistics, visibility }) {
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyStatistic());
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyStatistic());
    setErrors({});
    setServerError('');
    setIsOpen(true);
  };

  const openEdit = (statistic) => {
    setEditingId(statistic.id);
    setForm({
      metric: statistic.metric || '',
      value: statistic.value ?? '',
      unit: statistic.unit || '',
      date: toDateInput(statistic.date),
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setServerError('');

    const localErrors = {};
    if (!form.metric.trim()) localErrors.metric = 'Add a metric name.';
    if (form.value === '' || !Number.isFinite(Number(form.value))) {
      localErrors.value = 'Enter a numeric value.';
    }
    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      return;
    }

    const payload = {
      metric: form.metric.trim(),
      value: Number(form.value),
      unit: form.unit.trim(),
      ...(form.date ? { date: form.date } : {}),
    };

    setIsSaving(true);
    try {
      const response = editingId
        ? await statisticsApi.update(editingId, payload)
        : await statisticsApi.create(payload);
      const saved = response.data.data.statistic;

      setStatistics((current) =>
        editingId
          ? current.map((item) => (item.id === editingId ? saved : item))
          : [...current, saved],
      );
      setIsOpen(false);
      toast.success(
        editingId ? 'Statistic updated' : 'Statistic added',
        editingId ? 'Your changes are saved.' : 'The statistic is now on your profile.',
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
      await statisticsApi.remove(deleteTarget.id);
      setStatistics((current) => current.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast.success('Statistic removed', 'It is no longer part of your profile.');
    } catch (error) {
      toast.error('Could not remove the statistic', getErrorMessage(error));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-navy">Statistics</h2>
            <Badge size="sm" variant={visibility === 'public' ? 'success' : 'neutral'}>
              {visibility === 'public' ? 'Public section' : 'Restricted section'}
            </Badge>
          </div>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-body">
            Add measurable performance data. Statistics are shown only when this section is visible
            to the viewer.
          </p>
        </div>
        <Button
          size="sm"
          onClick={openCreate}
          leftIcon={<FiPlus className="h-4 w-4" aria-hidden="true" />}
        >
          Add statistic
        </Button>
      </div>

      <div className="mt-5">
        {statistics.length === 0 ? (
          <EmptyState
            icon={FiBarChart2}
            title="No statistics yet"
            description="Add a performance metric such as season wins, appearances, or a measurable result."
            action={
              <Button size="sm" variant="secondary" onClick={openCreate}>
                Add your first statistic
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {statistics.map((statistic) => (
              <article
                key={statistic.id}
                className="rounded-card border border-line bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium uppercase tracking-[0.08em] text-slate">
                      {statistic.metric}
                    </p>
                    <p className="mt-1 text-2xl font-semibold tracking-tight text-navy">
                      {statistic.value}
                      {statistic.unit ? (
                        <span className="ml-1 text-sm font-medium text-body">
                          {statistic.unit}
                        </span>
                      ) : null}
                    </p>
                    {statistic.date ? (
                      <p className="mt-1 text-xs text-slate">{formatDate(statistic.date)}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(statistic)}
                      className="rounded-tile p-2 text-slate transition-colors hover:bg-sand hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-track"
                      aria-label={`Edit ${statistic.metric}`}
                    >
                      <FiEdit2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(statistic)}
                      className="rounded-tile p-2 text-slate transition-colors hover:bg-danger-50 hover:text-danger-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-track"
                      aria-label={`Delete ${statistic.metric}`}
                    >
                      <FiTrash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={isOpen}
        onClose={closeModal}
        title={editingId ? 'Edit statistic' : 'Add statistic'}
        description="Statistics are embedded in your athlete profile and follow its visibility setting."
        footer={
          <>
            <Button variant="secondary" size="md" onClick={closeModal} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" form="statistic-form" size="md" isLoading={isSaving}>
              {editingId ? 'Save changes' : 'Add statistic'}
            </Button>
          </>
        }
      >
        <form id="statistic-form" onSubmit={handleSubmit} className="space-y-4">
          {serverError ? <Alert variant="error">{serverError}</Alert> : null}
          <Input
            label="Metric"
            value={form.metric}
            onChange={(event) => setField('metric', event.target.value)}
            error={errors.metric}
            placeholder="e.g. Season wins"
            maxLength={120}
            required
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Value"
              type="number"
              step="any"
              value={form.value}
              onChange={(event) => setField('value', event.target.value)}
              error={errors.value}
              placeholder="e.g. 8"
              required
            />
            <Input
              label="Unit"
              value={form.unit}
              onChange={(event) => setField('unit', event.target.value)}
              error={errors.unit}
              placeholder="e.g. races"
              maxLength={30}
            />
            <Input
              label="Date"
              type="date"
              value={form.date}
              onChange={(event) => setField('date', event.target.value)}
              error={errors.date}
              containerClassName="sm:col-span-2"
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => (isDeleting ? null : setDeleteTarget(null))}
        title="Remove this statistic?"
        description={
          deleteTarget ? `“${deleteTarget.metric}” will be removed from your profile.` : undefined
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
            <Button variant="danger" size="md" onClick={handleDelete} isLoading={isDeleting}>
              Remove statistic
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-body">This cannot be undone.</p>
      </Modal>
    </div>
  );
}
