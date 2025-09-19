/*
### Zweck: Einfacher Logger mit LOG_LEVEL zur einheitlichen Konsolen-Ausgabe.
*/
import { inspect } from 'node:util';

const levels = ['debug', 'info', 'warn', 'error'];
const current = process.env.LOG_LEVEL?.toLowerCase() || 'info';
const currentIndex = levels.indexOf(current);
const transports = new Set();

const cloneMetadata = (metadata) => {
  if (metadata == null) {
    return undefined;
  }
  return { ...metadata };
};

const buildContextPayload = (context) => {
  const segments = context?.segments ?? [];
  const label = segments.length ? segments.join(':') : undefined;
  return {
    segments: [...segments],
    label,
    text: label ? `[${label}]` : undefined,
    metadata: cloneMetadata(context?.metadata),
  };
};

const createEntry = (level, args, rawArgs, context) => ({
  level,
  args,
  rawArgs,
  timestamp: new Date(),
  context: buildContextPayload(context),
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

const applyPrefix = (segments, args) => {
  if (!segments?.length) {
    return args;
  }

  const label = segments.join(':');
  const prefix = `[${label}]`;
  if (args.length === 0) {
    return [prefix];
  }

  const [first, ...rest] = args;
  if (typeof first === 'string') {
    const suffix = first.length ? ` ${first}` : '';
    return [`${prefix}${suffix}`, ...rest];
  }

  return [prefix, ...args];
};

const mergeMetadata = (parentMetadata, metadata) => {
  const isObject = (value) => value && typeof value === 'object';

  if (!isObject(parentMetadata) && !isObject(metadata)) {
    return undefined;
  }

  if (!isObject(parentMetadata)) {
    return { ...metadata };
  }

  if (!isObject(metadata)) {
    return { ...parentMetadata };
  }

  return { ...parentMetadata, ...metadata };
};

const createLoggerInstance = (context) => {
  const call = (level) => (...args) => {
    if (levels.indexOf(level) < currentIndex) {
      return;
    }

    const rawArgs = args;
    const argsWithPrefix = applyPrefix(context.segments, rawArgs);
    console[level](...argsWithPrefix);
    notifyTransports(createEntry(level, argsWithPrefix, rawArgs, context));
  };

  const withPrefix = (prefix, metadata) => {
    const trimmed = typeof prefix === 'string' ? prefix.trim() : '';
    const segments = trimmed ? [...context.segments, trimmed] : [...context.segments];
    const combinedMetadata = mergeMetadata(context.metadata, metadata);
    return createLoggerInstance({ segments, metadata: combinedMetadata });
  };

  return {
    debug: call('debug'),
    info: call('info'),
    warn: call('warn'),
    error: call('error'),
    withPrefix,
  };
};

export const logger = createLoggerInstance({ segments: [], metadata: undefined });

export const createLoggerContext = (prefix, metadata) => logger.withPrefix(prefix, metadata);

export const logLevels = levels;

export const formatLogArgs = (args) => args.map(formatValue);

export function registerLogTransport(handler) {
  if (typeof handler !== 'function') {
    throw new TypeError('Log transport must be a function');
  }
  transports.add(handler);
  return () => transports.delete(handler);
}
