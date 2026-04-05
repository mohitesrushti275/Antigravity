import { describe, expect, it } from 'vitest';
import {
  UpdateComponentSchema,
  ConfirmUploadSchema,
  ReviewSchema,
} from './schemas';

const validUuid = '550e8400-e29b-41d4-a716-446655440000';

// ═══════════════════════════════════════════════════
// UpdateComponentSchema
// ═══════════════════════════════════════════════════

describe('UpdateComponentSchema', () => {
  it('parses empty object (all fields optional)', () => {
    const r = UpdateComponentSchema.parse({});
    expect(r).toEqual({});
  });

  it('parses partial update with name only', () => {
    const r = UpdateComponentSchema.parse({ name: 'Updated Button' });
    expect(r.name).toBe('Updated Button');
  });

  it('parses partial update with multiple fields', () => {
    const r = UpdateComponentSchema.parse({
      name: 'Card',
      description: 'A card component',
      isPublic: false,
    });
    expect(r.isPublic).toBe(false);
  });

  it('rejects name exceeding 100 characters', () => {
    expect(() =>
      UpdateComponentSchema.parse({ name: 'x'.repeat(101) })
    ).toThrow();
  });

  it('rejects description exceeding 500 characters', () => {
    expect(() =>
      UpdateComponentSchema.parse({ description: 'd'.repeat(501) })
    ).toThrow();
  });

  it('rejects empty name string', () => {
    expect(() => UpdateComponentSchema.parse({ name: '' })).toThrow();
  });

  it('parses valid categoryId uuid', () => {
    const r = UpdateComponentSchema.parse({ categoryId: validUuid });
    expect(r.categoryId).toBe(validUuid);
  });

  it('rejects invalid categoryId', () => {
    expect(() =>
      UpdateComponentSchema.parse({ categoryId: 'not-uuid' })
    ).toThrow();
  });
});

// ═══════════════════════════════════════════════════
// ConfirmUploadSchema
// ═══════════════════════════════════════════════════

describe('ConfirmUploadSchema', () => {
  it('parses valid confirm upload payload', () => {
    const r = ConfirmUploadSchema.parse({
      componentId: validUuid,
      fileKeys: [
        { r2Key: 'uploads/abc.js', fileType: 'component' },
        { r2Key: 'uploads/demo.tsx', fileType: 'demo', demoId: validUuid },
      ],
    });
    expect(r.fileKeys).toHaveLength(2);
    expect(r.componentId).toBe(validUuid);
  });

  it('rejects invalid componentId', () => {
    expect(() =>
      ConfirmUploadSchema.parse({
        componentId: 'bad',
        fileKeys: [],
      })
    ).toThrow();
  });

  it('rejects invalid fileType in fileKeys', () => {
    expect(() =>
      ConfirmUploadSchema.parse({
        componentId: validUuid,
        fileKeys: [{ r2Key: 'x', fileType: 'invalid' }],
      })
    ).toThrow();
  });

  it('rejects missing r2Key in fileKeys entry', () => {
    expect(() =>
      ConfirmUploadSchema.parse({
        componentId: validUuid,
        fileKeys: [{ fileType: 'component' }],
      })
    ).toThrow();
  });

  it('parses empty fileKeys array', () => {
    const r = ConfirmUploadSchema.parse({
      componentId: validUuid,
      fileKeys: [],
    });
    expect(r.fileKeys).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════
// ReviewSchema
// ═══════════════════════════════════════════════════

describe('ReviewSchema', () => {
  it('parses approve action', () => {
    const r = ReviewSchema.parse({ action: 'approve' });
    expect(r.action).toBe('approve');
    expect(r.reason).toBeUndefined();
  });

  it('parses reject with reason', () => {
    const r = ReviewSchema.parse({
      action: 'reject',
      reason: 'Does not meet quality standards',
    });
    expect(r.reason).toBe('Does not meet quality standards');
  });

  it('parses all valid actions', () => {
    for (const action of ['approve', 'reject', 'feature', 'unfeature']) {
      const r = ReviewSchema.parse({ action });
      expect(r.action).toBe(action);
    }
  });

  it('rejects invalid action', () => {
    expect(() => ReviewSchema.parse({ action: 'ban' })).toThrow();
  });

  it('rejects missing action', () => {
    expect(() => ReviewSchema.parse({})).toThrow();
  });
});
