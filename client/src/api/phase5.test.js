import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('./client', () => ({ default: apiMock }));

const { verificationApi } = await import('./verification.api');
const { reportsApi } = await import('./reports.api');
const { blocksApi } = await import('./blocks.api');
const { adminApi } = await import('./admin.api');

describe('Phase 5 API clients', () => {
  beforeEach(() => {
    Object.values(apiMock).forEach((mock) => mock.mockReset());
  });

  it('uploads private verification evidence as multipart data', () => {
    const file = new File(['%PDF-1.4'], 'result.pdf', { type: 'application/pdf' });
    verificationApi.uploadEvidence(file, 'Official result');

    const [url, body] = apiMock.post.mock.calls[0];
    expect(url).toBe('/verifications/evidence');
    expect(body).toBeInstanceOf(FormData);
    expect(body.get('evidence')).toBe(file);
    expect(body.get('label')).toBe('Official result');
  });

  it('encodes verification and moderation identifiers', () => {
    verificationApi.resubmit('req/1', { statement: 'Updated' });
    verificationApi.adminClaim('req/1');
    verificationApi.adminEvidenceUrl('req/1', 'ev/2');
    reportsApi.adminUpdate('report/1', { status: 'resolved' });
    blocksApi.unblock('user/1');
    adminApi.updateUserStatus('user/1', { status: 'restricted', reason: 'Review' });

    expect(apiMock.post).toHaveBeenCalledWith('/verifications/req%2F1/resubmit', {
      statement: 'Updated',
    });
    expect(apiMock.post).toHaveBeenCalledWith('/admin/verifications/req%2F1/claim');
    expect(apiMock.get).toHaveBeenCalledWith(
      '/admin/verifications/req%2F1/evidence/ev%2F2/url',
    );
    expect(apiMock.patch).toHaveBeenCalledWith('/admin/reports/report%2F1', {
      status: 'resolved',
    });
    expect(apiMock.delete).toHaveBeenCalledWith('/blocks/user%2F1');
    expect(apiMock.patch).toHaveBeenCalledWith('/admin/users/user%2F1/status', {
      status: 'restricted',
      reason: 'Review',
    });
  });

  it('passes report and admin filters as query parameters', () => {
    reportsApi.adminList({ status: 'open', q: '', page: 2 });
    adminApi.listUsers({ role: 'athlete', q: '', page: 1 });

    expect(apiMock.get).toHaveBeenCalledWith('/admin/reports', {
      params: { status: 'open', q: '', page: 2 },
    });
    expect(apiMock.get).toHaveBeenCalledWith('/admin/users', {
      params: { role: 'athlete', q: '', page: 1 },
    });
  });
});
