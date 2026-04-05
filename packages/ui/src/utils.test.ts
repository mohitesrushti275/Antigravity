import { describe, expect, it } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('joins static class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('filters falsy values', () => {
    expect(cn('a', false, 'b', undefined, null, 'c')).toBe('a b c');
  });

  it('merges conflicting Tailwind utilities (later wins)', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('handles array and object inputs from clsx', () => {
    expect(cn(['foo', 'bar'], { baz: true, qux: false })).toBe('foo bar baz');
  });

  it('returns empty string for no arguments', () => {
    expect(cn()).toBe('');
  });

  it('returns single class unchanged', () => {
    expect(cn('solo')).toBe('solo');
  });

  it('trims and deduplicates whitespace', () => {
    expect(cn('  foo  ', '  bar  ')).toBe('foo bar');
  });

  it('handles empty strings gracefully', () => {
    expect(cn('', '', 'valid')).toBe('valid');
  });

  it('handles complex Tailwind merge scenarios', () => {
    // bg-color conflict
    expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');
    // width conflict
    expect(cn('w-full', 'w-1/2')).toBe('w-1/2');
  });

  it('preserves non-conflicting utilities', () => {
    expect(cn('p-4', 'mt-2', 'text-sm')).toBe('p-4 mt-2 text-sm');
  });
});

