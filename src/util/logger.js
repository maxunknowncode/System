/*
### Zweck: Einfacher Logger mit LOG_LEVEL zur einheitlichen Konsolen-Ausgabe.
*/
import { inspect } from 'node:util';

const levels = ['debug', 'info', 'warn', 'error'];
const current = process.env.LOG_LEVEL?.toLowerCase() || 'info';
const currentIndex = levels.indexOf(current);
const transports = new Set();

const createEntry = (level, args) => ({
  level,
  args,
  timestamp: new Date(),
});

const notifyTransports = (entry) => {
  for (const transport of transports) {
    Promise.resolve()
      .then(() => transport(entry))
      .catch((err) => {
        console.error('[logger] Log transport failed:', err);
      });
  }
};

const formatValue = (value) => {
  if (value instanceof Error) {
    return value.stack ?? `${value.name}: ${value.message}`;
  }
  if (typeof value === 'string') {
    return value;
  }
  return inspect(value, { depth: 3, colors: false });
};

function log(level, ...args) {
  if (levels.indexOf(level) >= currentIndex) {
    console[level](...args);
    notifyTransports(createEntry(level, args));
  }
}

export const logger = {
  debug: (...args) => log('debug', ...args),
  info: (...args) => log('info', ...args),
  warn: (...args) => log('warn', ...args),
  error: (...args) => log('error', ...args),
};

export const logLevels = levels;

export const formatLogArgs = (args) => args.map(formatValue);

export function registerLogTransport(handler) {
  if (typeof handler !== 'function') {
    throw new TypeError('Log transport must be a function');
  }
  transports.add(handler);
  return () => transports.delete(handler);
}
