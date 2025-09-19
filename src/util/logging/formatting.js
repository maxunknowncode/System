export const truncate = (value, max = 100) => {
  if (typeof value !== 'string') {
    return value;
  }
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, Math.max(0, max - 1))}…`;
};

export const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && (value.constructor === Object || Object.getPrototypeOf(value) === null);

export const describeDiscordEntity = (entity) => {
  if (!entity) {
    return null;
  }
  if (typeof entity === 'string' || typeof entity === 'number' || typeof entity === 'bigint') {
    return String(entity);
  }
  if (typeof entity === 'boolean') {
    return entity ? 'Ja' : 'Nein';
  }
  if (Array.isArray(entity)) {
    const parts = entity
      .map((item) => describeDiscordEntity(item))
      .filter((part) => Boolean(part));
    return parts.length ? parts.join(', ') : null;
  }
  if (entity.user) {
    const label = describeDiscordEntity(entity.user);
    if (label) {
      return label;
    }
  }
  if (typeof entity.tag === 'string' && entity.id) {
    return `${entity.tag} (${entity.id})`;
  }
  if (typeof entity.username === 'string') {
    const disc = entity.discriminator && entity.discriminator !== '0' ? `#${entity.discriminator}` : '';
    return `${entity.username}${disc}${entity.id ? ` (${entity.id})` : ''}`;
  }
  if (typeof entity.name === 'string') {
    return `${entity.name}${entity.id ? ` (${entity.id})` : ''}`;
  }
  if (typeof entity.code === 'string') {
    return `${entity.code}${entity.id ? ` (${entity.id})` : ''}`;
  }
  if (entity.id) {
    return String(entity.id);
  }
  return null;
};

export const formatValue = (value) => {
  if (value === null) {
    return '—';
  }
  if (value === undefined) {
    return '—';
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? truncate(trimmed, 120) : '—';
  }
  if (typeof value === 'number' || typeof value === 'bigint') {
    return String(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'Ja' : 'Nein';
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    const formatted = value.map((item) => formatValue(item)).filter((item) => item && item !== '—');
    return formatted.length ? truncate(formatted.join(', '), 120) : '—';
  }
  if (typeof value === 'object') {
    const label = describeDiscordEntity(value);
    if (label) {
      return truncate(label, 120);
    }
    if (isPlainObject(value)) {
      try {
        return truncate(JSON.stringify(value), 120);
      } catch {
        return '[Objekt]';
      }
    }
  }
  return truncate(String(value), 120);
};

export const formatMetadataKey = (key) => {
  const spaced = key.replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};
