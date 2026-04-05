// ═══════════════════════════════════════════════════
// STRUCTURED LOGGER — Production-grade JSON logging
// Used across all API routes and background jobs.
// Outputs structured JSON that integrates with
// Vercel Log Drains → Logtail/Axiom/Datadog.
// ═══════════════════════════════════════════════════

type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

interface LogEntry {
  level: LogLevel;
  message: string;
  traceId?: string;
  service?: string;
  route?: string;
  method?: string;
  statusCode?: number;
  durationMs?: number;
  userId?: string;
  error?: string;
  stack?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

class Logger {
  private service: string;

  constructor(service = "21st-web") {
    this.service = service;
  }

  private log(level: LogLevel, message: string, data?: Partial<Omit<LogEntry, "level" | "message" | "timestamp" | "service">>) {
    const entry: LogEntry = {
      level,
      message,
      service: this.service,
      timestamp: new Date().toISOString(),
      ...data,
    };

    // Strip undefined fields for clean JSON
    const clean = Object.fromEntries(
      Object.entries(entry).filter(([, v]) => v !== undefined)
    );

    const json = JSON.stringify(clean);

    switch (level) {
      case "error":
      case "fatal":
        console.error(json);
        break;
      case "warn":
        console.warn(json);
        break;
      case "debug":
        if (process.env.NODE_ENV !== "production") console.debug(json);
        break;
      default:
        console.log(json);
    }
  }

  debug(message: string, data?: Partial<Omit<LogEntry, "level" | "message" | "timestamp" | "service">>) {
    this.log("debug", message, data);
  }

  info(message: string, data?: Partial<Omit<LogEntry, "level" | "message" | "timestamp" | "service">>) {
    this.log("info", message, data);
  }

  warn(message: string, data?: Partial<Omit<LogEntry, "level" | "message" | "timestamp" | "service">>) {
    this.log("warn", message, data);
  }

  error(message: string, data?: Partial<Omit<LogEntry, "level" | "message" | "timestamp" | "service">>) {
    this.log("error", message, data);
  }

  fatal(message: string, data?: Partial<Omit<LogEntry, "level" | "message" | "timestamp" | "service">>) {
    this.log("fatal", message, data);
  }

  /**
   * Create a child logger scoped to a specific route/request.
   * Automatically attaches traceId and route to all subsequent log calls.
   */
  child(context: { traceId: string; route: string; method?: string; userId?: string }) {
    return {
      debug: (msg: string, data?: Record<string, unknown>) => this.debug(msg, { ...context, metadata: data }),
      info:  (msg: string, data?: Record<string, unknown>) => this.info(msg, { ...context, metadata: data }),
      warn:  (msg: string, data?: Record<string, unknown>) => this.warn(msg, { ...context, metadata: data }),
      error: (msg: string, data?: Record<string, unknown>) => this.error(msg, { ...context, metadata: data }),
      fatal: (msg: string, data?: Record<string, unknown>) => this.fatal(msg, { ...context, metadata: data }),
    };
  }
}

// Singleton export
export const logger = new Logger();

// ═══════════════════════════════════════════════════
// ALERT RULES DOCUMENTATION
// These alert thresholds should be configured in your
// monitoring platform (Sentry, Vercel, or Logtail):
//
// | Alert                  | Condition                     |
// |------------------------|-------------------------------|
// | High error rate        | 5xx > 1% over 5 min           |
// | Auth failure spike     | 401s > 50/min                 |
// | Rate limit storm       | 429s > 200/min                |
// | Generation failure     | CANNOT_GENERATE > 10%         |
// | DB slow query          | p99 > 500ms                   |
// | Cron failure           | Non-200 from cron endpoint    |
// | Sentry unhandled       | New issue volume > 10/hour    |
// ═══════════════════════════════════════════════════
