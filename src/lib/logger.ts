/**
 * Simple structured logger that suppresses verbose output in production.
 * In development, logs are printed to stdout.
 * In production, only errors and warnings are logged.
 */

const isDev = process.env.NODE_ENV !== "production";

export const log = {
  info: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
  warn: (...args: unknown[]) => {
    console.warn(...args);
  },
  error: (...args: unknown[]) => {
    console.error(...args);
  },
  /** Always logs regardless of environment — for critical operational messages */
  always: (...args: unknown[]) => {
    console.log(...args);
  },
};
