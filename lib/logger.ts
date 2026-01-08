/**
 * Structured Logger for browser-safe instrumentation.
 * Provides centralized logging with proper levels and no side effects in production.
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
  context?: string;
}

export interface LoggerConfig {
  minLevel?: LogLevel;
  enableConsole?: boolean;
  enableStorage?: boolean;
  maxStoredEntries?: number;
}

class Logger {
  private config: Required<LoggerConfig>;
  private entries: LogEntry[] = [];
  private isProduction = process.env.NODE_ENV === 'production';

  constructor(config: LoggerConfig = {}) {
    this.config = {
      minLevel: config.minLevel ?? (this.isProduction ? LogLevel.WARN : LogLevel.DEBUG),
      enableConsole: config.enableConsole ?? true,
      enableStorage: config.enableStorage ?? !this.isProduction,
      maxStoredEntries: config.maxStoredEntries ?? 1000,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const configLevel = levels.indexOf(this.config.minLevel);
    const logLevel = levels.indexOf(level);
    return logLevel >= configLevel;
  }

  private getTimestamp(): string {
    return new Date().toISOString();
  }

  private formatMessage(level: LogLevel, message: string): string {
    const emoji = {
      [LogLevel.DEBUG]: '🐛',
      [LogLevel.INFO]: 'ℹ️',
      [LogLevel.WARN]: '⚠️',
      [LogLevel.ERROR]: '🚨',
    };
    return `${emoji[level]} [${level}] [${this.getTimestamp()}] ${message}`;
  }

  private log(
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>,
    context?: string,
  ) {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      metadata,
      context,
    };

    if (this.config.enableStorage) {
      this.entries.push(entry);
      if (this.entries.length > this.config.maxStoredEntries) {
        this.entries.shift();
      }
    }

    if (this.config.enableConsole) {
      const formattedMessage = this.formatMessage(level, message);
      const consoleMethod = {
        [LogLevel.DEBUG]: console.debug,
        [LogLevel.INFO]: console.info,
        [LogLevel.WARN]: console.warn,
        [LogLevel.ERROR]: console.error,
      }[level];

      if (metadata) {
        // Serialize metadata to ensure it's visible in all environments
        try {
          const serialized = JSON.stringify(metadata, null, 2);
          consoleMethod(formattedMessage, serialized);
        } catch {
          // Fallback if metadata can't be stringified
          consoleMethod(formattedMessage, metadata);
        }
      } else {
        consoleMethod(formattedMessage);
      }
    }
  }

  debug(message: string, metadata?: Record<string, unknown>, context?: string) {
    this.log(LogLevel.DEBUG, message, metadata, context);
  }

  info(message: string, metadata?: Record<string, unknown>, context?: string) {
    this.log(LogLevel.INFO, message, metadata, context);
  }

  warn(message: string, metadata?: Record<string, unknown>, context?: string) {
    this.log(LogLevel.WARN, message, metadata, context);
  }

  error(message: string, metadata?: Record<string, unknown>, context?: string) {
    this.log(LogLevel.ERROR, message, metadata, context);
  }

  getEntries(limit?: number): LogEntry[] {
    if (!limit) return [...this.entries];
    return this.entries.slice(-limit);
  }

  clear() {
    this.entries = [];
  }

  exportLogs(): string {
    return this.entries
      .map(
        (e) =>
          `[${e.timestamp.toISOString()}] ${e.level}: ${e.message}${
            e.metadata ? ` ${JSON.stringify(e.metadata)}` : ''
          }`,
      )
      .join('\n');
  }
}

// Global logger instance
const globalLogger = new Logger({
  enableConsole: true,
  enableStorage: true,
});

export { globalLogger };
