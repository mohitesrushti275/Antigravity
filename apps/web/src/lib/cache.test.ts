import { describe, expect, it, vi } from 'vitest';

// ═══════════════════════════════════════════════════
// CacheKeys & CacheTTL Tests
// We mock the Redis module so importing cache.ts
// doesn't fail when UPSTASH_REDIS_REST env vars
// are missing (as in CI test environments).
// ═══════════════════════════════════════════════════

vi.mock('@upstash/redis', () => ({
  Redis: {
    fromEnv: () => ({
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
    }),
  },
}));

import { CacheKeys, CacheTTL } from './cache';

describe('CacheKeys', () => {
  it('featured() returns static key', () => {
    expect(CacheKeys.featured()).toBe('components:featured');
  });

  it('popular() returns static key', () => {
    expect(CacheKeys.popular()).toBe('components:popular');
  });

  it('categories() returns static key', () => {
    expect(CacheKeys.categories()).toBe('categories:all');
  });

  it('component() returns id-scoped key', () => {
    expect(CacheKeys.component('abc-123')).toBe('component:abc-123');
  });

  it('component() includes the full id', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    expect(CacheKeys.component(uuid)).toContain(uuid);
  });

  it('search() returns base64-encoded key', () => {
    const key = CacheKeys.search('react button');
    expect(key).toMatch(/^search:/);
    // Should not contain the raw query
    expect(key).not.toContain('react button');
  });

  it('search() produces deterministic keys', () => {
    const key1 = CacheKeys.search('hello');
    const key2 = CacheKeys.search('hello');
    expect(key1).toBe(key2);
  });

  it('search() produces different keys for different queries', () => {
    const key1 = CacheKeys.search('react');
    const key2 = CacheKeys.search('vue');
    expect(key1).not.toBe(key2);
  });

  it('componentSource() returns id-scoped key', () => {
    expect(CacheKeys.componentSource('xyz')).toBe('component:source:xyz');
  });
});

describe('CacheTTL', () => {
  it('has positive FEATURED TTL', () => {
    expect(CacheTTL.FEATURED).toBeGreaterThan(0);
  });

  it('has positive POPULAR TTL', () => {
    expect(CacheTTL.POPULAR).toBeGreaterThan(0);
  });

  it('has positive COMPONENT TTL', () => {
    expect(CacheTTL.COMPONENT).toBeGreaterThan(0);
  });

  it('COMPONENT TTL is longer than FEATURED TTL', () => {
    expect(CacheTTL.COMPONENT).toBeGreaterThan(CacheTTL.FEATURED);
  });

  it('SEARCH TTL is shorter than COMPONENT TTL', () => {
    expect(CacheTTL.SEARCH).toBeLessThan(CacheTTL.COMPONENT);
  });

  it('all TTL values are in seconds (reasonable range)', () => {
    const values = Object.values(CacheTTL);
    for (const ttl of values) {
      expect(ttl).toBeGreaterThanOrEqual(60);    // at least 1 min
      expect(ttl).toBeLessThanOrEqual(86400);    // at most 1 day
    }
  });
});
