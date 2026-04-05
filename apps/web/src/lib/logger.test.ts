import { describe, expect, it, vi, beforeEach } from 'vitest';

// ═══════════════════════════════════════════════════
// Logger Tests
// We test the Logger class in isolation by spying on
// console methods and verifying structured JSON output.
// ═══════════════════════════════════════════════════

// We need to import after vitest setup

async function importLogger() {
  const mod = await import('./logger');
  return mod.logger;
}

describe('Logger', () => {
  let consoleSpy: {
    log: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    debug: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
    };
  });

  it('info() writes structured JSON to console.log', async () => {
    const logger = await importLogger();
    logger.info('test message');

    expect(consoleSpy.log).toHaveBeenCalledTimes(1);
    const output = JSON.parse(consoleSpy.log.mock.calls[0][0] as string);
    expect(output.level).toBe('info');
    expect(output.message).toBe('test message');
    expect(output.service).toBe('21st-web');
    expect(output.timestamp).toBeDefined();
  });

  it('error() writes to console.error', async () => {
    const logger = await importLogger();
    logger.error('something broke', { error: 'details' });

    expect(consoleSpy.error).toHaveBeenCalledTimes(1);
    const output = JSON.parse(consoleSpy.error.mock.calls[0][0] as string);
    expect(output.level).toBe('error');
    expect(output.message).toBe('something broke');
    expect(output.error).toBe('details');
  });

  it('warn() writes to console.warn', async () => {
    const logger = await importLogger();
    logger.warn('caution');

    expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
    const output = JSON.parse(consoleSpy.warn.mock.calls[0][0] as string);
    expect(output.level).toBe('warn');
  });

  it('fatal() writes to console.error', async () => {
    const logger = await importLogger();
    logger.fatal('catastrophe');

    expect(consoleSpy.error).toHaveBeenCalledTimes(1);
    const output = JSON.parse(consoleSpy.error.mock.calls[0][0] as string);
    expect(output.level).toBe('fatal');
  });

  it('strips undefined values from JSON output', async () => {
    const logger = await importLogger();
    logger.info('clean entry');

    const output = JSON.parse(consoleSpy.log.mock.calls[0][0] as string);
    // These optional fields should not be present if not supplied
    expect(output).not.toHaveProperty('traceId');
    expect(output).not.toHaveProperty('userId');
    expect(output).not.toHaveProperty('route');
    expect(output).not.toHaveProperty('statusCode');
  });

  it('includes optional metadata when provided', async () => {
    const logger = await importLogger();
    logger.info('with context', {
      traceId: 'abc-123',
      route: '/api/test',
      method: 'GET',
      statusCode: 200,
      durationMs: 42,
      userId: 'user-1',
    });

    const output = JSON.parse(consoleSpy.log.mock.calls[0][0] as string);
    expect(output.traceId).toBe('abc-123');
    expect(output.route).toBe('/api/test');
    expect(output.method).toBe('GET');
    expect(output.statusCode).toBe(200);
    expect(output.durationMs).toBe(42);
    expect(output.userId).toBe('user-1');
  });

  it('child() logger injects context into all log calls', async () => {
    const logger = await importLogger();
    const child = logger.child({
      traceId: 'trace-456',
      route: '/api/components',
      method: 'POST',
      userId: 'user-2',
    });

    child.info('child message', { extra: 'data' });

    const output = JSON.parse(consoleSpy.log.mock.calls[0][0] as string);
    expect(output.traceId).toBe('trace-456');
    expect(output.route).toBe('/api/components');
    expect(output.method).toBe('POST');
    expect(output.userId).toBe('user-2');
    expect(output.metadata).toEqual({ extra: 'data' });
  });

  it('child() error logger works correctly', async () => {
    const logger = await importLogger();
    const child = logger.child({ traceId: 't1', route: '/api/err' });
    child.error('child error');

    expect(consoleSpy.error).toHaveBeenCalledTimes(1);
    const output = JSON.parse(consoleSpy.error.mock.calls[0][0] as string);
    expect(output.level).toBe('error');
    expect(output.traceId).toBe('t1');
  });

  it('produces valid JSON output', async () => {
    const logger = await importLogger();
    logger.info('json test');

    const raw = consoleSpy.log.mock.calls[0][0] as string;
    expect(() => JSON.parse(raw)).not.toThrow();
  });
});
