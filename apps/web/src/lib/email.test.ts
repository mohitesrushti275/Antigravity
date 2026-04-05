import { describe, expect, it, vi } from 'vitest';

// ═══════════════════════════════════════════════════
// Email Template Tests
// Mock Resend so importing email.ts doesn't require
// a real RESEND_API_KEY environment variable.
// ═══════════════════════════════════════════════════

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: vi.fn().mockResolvedValue({ id: 'mock-id' }) },
  })),
}));

import {
  componentApprovedEmail,
  componentRejectedEmail,
} from './email';

describe('componentApprovedEmail', () => {
  const result = componentApprovedEmail('My Button', 'https://21st.dev/s/my-button');

  it('generates a subject with the component name', () => {
    expect(result.subject).toContain('My Button');
    expect(result.subject).toContain('approved');
  });

  it('generates HTML body with the component name', () => {
    expect(result.html).toContain('My Button');
  });

  it('generates HTML body with the URL link', () => {
    expect(result.html).toContain('https://21st.dev/s/my-button');
  });

  it('includes a call-to-action link', () => {
    expect(result.html).toContain('href=');
    expect(result.html).toContain('View Component');
  });
});

describe('componentRejectedEmail', () => {
  const result = componentRejectedEmail('Bad Widget', 'Quality standards not met');

  it('generates a subject with the component name', () => {
    expect(result.subject).toContain('Bad Widget');
  });

  it('generates HTML body with the rejection reason', () => {
    expect(result.html).toContain('Quality standards not met');
  });

  it('includes the component name in body', () => {
    expect(result.html).toContain('Bad Widget');
  });

  it('mentions the possibility of resubmission', () => {
    expect(result.html).toContain('resubmit');
  });
});
