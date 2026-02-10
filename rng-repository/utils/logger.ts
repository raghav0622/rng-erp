/**
 * Simple logger utility for the repository
 * Uses console methods when available, otherwise no-op
 */

interface Logger {
  debug: (...args: any[]) => void;
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
}

const noop = () => {};

const createLogger = (): Logger => {
  if (typeof console !== 'undefined') {
    return {
      debug: console.debug?.bind(console) || console.log?.bind(console) || noop,
      info: console.info?.bind(console) || console.log?.bind(console) || noop,
      warn: console.warn?.bind(console) || console.log?.bind(console) || noop,
      error: console.error?.bind(console) || console.log?.bind(console) || noop,
    };
  }
  return {
    debug: noop,
    info: noop,
    warn: noop,
    error: noop,
  };
};

export const globalLogger = createLogger();
