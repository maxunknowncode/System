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

const splitSegmentValue = (value) => {
  if (Array.isArray(value)) {
    return value.flatMap((item) => splitSegmentValue(item));
  }

  if (value == null) {
    return [];
  }

  if (typeof value === 'string') {
    return value
      .split(':')
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
  }

  const stringValue = String(value).trim();
  return stringValue ? [stringValue] : [];
};

const normaliseSegments = (segments) => {
  if (segments == null) {
    return [];
  }
  return splitSegmentValue(segments);
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

const formatArguments = (args) => {
  const list = Array.isArray(args) ? args : [];
  return list.map(formatValue);
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

const createLoggerInstance = (inputContext = {}) => {
  const baseSegments = normaliseSegments(inputContext?.segments ?? []);
  const baseMetadata = inputContext?.metadata;
  const normalizedContext = {
    segments: [...baseSegments],
    metadata: baseMetadata,
  };

  const call = (level) => (...args) => {
    if (levels.indexOf(level) < currentIndex) {
      return;
    }

    const rawArgs = args;
    const formattedArgs = formatArguments(rawArgs);
    const argsWithPrefix = applyPrefix(normalizedContext.segments, formattedArgs);
    const consoleMethod = typeof console[level] === 'function' ? console[level] : console.log;
    consoleMethod(...argsWithPrefix);

    // Wichtig: entry mit korrekten rawArgs **und** context erstellen
    notifyTransports(createEntry(level, argsWithPrefix, rawArgs, normalizedContext));
  };

  const withPrefix = (prefix, metadata) => {
    const additionalSegments = splitSegmentValue(prefix);
    const segments = [...normalizedContext.segments, ...additionalSegments];
    const combinedMetadata = mergeMetadata(normalizedContext.metadata, metadata);
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

export const formatLogArgs = (args) => formatArguments(args);

export function registerLogTransport(handler) {
  if (typeof handler !== 'function') {
    throw new TypeError('Log transport must be a function');
  }
  transports.add(handler);
  return () => transports.delete(handler);
}
