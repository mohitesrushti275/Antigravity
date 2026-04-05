import { describe, expect, it } from 'vitest';
import {
  ComponentListQuerySchema,
  CreateComponentSchema,
  GenerateSchema,
  PresignSchema,
  SearchQuerySchema,
} from './schemas';

const validUuid = '550e8400-e29b-41d4-a716-446655440000';

describe('ComponentListQuerySchema', () => {
  it('parses minimal query with defaults', () => {
    const r = ComponentListQuerySchema.parse({});
    expect(r.sort).toBe('newest');
    expect(r.page).toBe(1);
    expect(r.limit).toBe(20);
  });

  it('coerces page and limit from strings', () => {
    const r = ComponentListQuerySchema.parse({ page: '2', limit: '50' });
    expect(r.page).toBe(2);
    expect(r.limit).toBe(50);
  });

  it('rejects invalid status enum', () => {
    expect(() =>
      ComponentListQuerySchema.parse({ status: 'unknown' })
    ).toThrow();
  });

  it('rejects limit above 100', () => {
    expect(() => ComponentListQuerySchema.parse({ limit: 101 })).toThrow();
  });
});

describe('CreateComponentSchema', () => {
  it('parses required name and description', () => {
    const r = CreateComponentSchema.parse({
      name: 'Button',
      description: 'A button component',
    });
    expect(r.license).toBe('MIT');
    expect(r.isPublic).toBe(true);
  });

  it('parses optional categoryId as uuid', () => {
    const r = CreateComponentSchema.parse({
      name: 'X',
      description: 'Y',
      categoryId: validUuid,
    });
    expect(r.categoryId).toBe(validUuid);
  });

  it('rejects empty name', () => {
    expect(() =>
      CreateComponentSchema.parse({ name: '', description: 'ok' })
    ).toThrow();
  });

  it('rejects invalid categoryId', () => {
    expect(() =>
      CreateComponentSchema.parse({
        name: 'X',
        description: 'Y',
        categoryId: 'not-a-uuid',
      })
    ).toThrow();
  });
});

describe('SearchQuerySchema', () => {
  it('parses q with defaults', () => {
    const r = SearchQuerySchema.parse({ q: 'react' });
    expect(r.page).toBe(1);
    expect(r.limit).toBe(20);
  });

  it('rejects empty q', () => {
    expect(() => SearchQuerySchema.parse({ q: '' })).toThrow();
  });

  it('rejects limit above 100', () => {
    expect(() =>
      SearchQuerySchema.parse({ q: 'x', limit: 101 })
    ).toThrow();
  });
});

describe('GenerateSchema', () => {
  it('parses minimal valid body', () => {
    const r = GenerateSchema.parse({
      prompt: 'Build a card',
      projectDeps: ['react'],
      framework: 'next',
    });
    expect(r.prompt).toBe('Build a card');
    expect(r.framework).toBe('next');
  });

  it('rejects empty prompt', () => {
    expect(() =>
      GenerateSchema.parse({
        prompt: '',
        projectDeps: [],
        framework: 'vite',
      })
    ).toThrow();
  });

  it('rejects invalid framework', () => {
    expect(() =>
      GenerateSchema.parse({
        prompt: 'hi',
        projectDeps: [],
        framework: 'angular',
      })
    ).toThrow();
  });
});

describe('PresignSchema', () => {
  it('parses valid presign payload', () => {
    const r = PresignSchema.parse({
      componentId: validUuid,
      fileType: 'component',
      contentType: 'text/plain',
      sizeBytes: 1024,
      filename: 'bundle.js',
    });
    expect(r.componentId).toBe(validUuid);
  });

  it('rejects invalid componentId', () => {
    expect(() =>
      PresignSchema.parse({
        componentId: 'bad',
        fileType: 'demo',
        contentType: 'image/png',
        sizeBytes: 1,
        filename: 'a.png',
      })
    ).toThrow();
  });
});
