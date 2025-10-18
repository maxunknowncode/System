export function normaliseId(value) {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return null;
}

function getRoleCollection(member) {
  const roles = member?.roles;
  if (!roles) {
    return null;
  }

  if (typeof roles.cache?.has === 'function') {
    return roles.cache;
  }

  if (typeof roles.has === 'function') {
    return roles;
  }

  if (Array.isArray(roles)) {
    return new Set(roles.map((role) => (typeof role === 'string' ? role : role?.id)).filter(Boolean));
  }

  return null;
}

export function hasRole(member, roleId) {
  const id = normaliseId(roleId);
  if (!member || !id) {
    return false;
  }

  const collection = getRoleCollection(member);
  if (!collection || typeof collection.has !== 'function') {
    return false;
  }

  return collection.has(id);
}

export function hasAnyRole(member, roleIds) {
  if (!Array.isArray(roleIds) || roleIds.length === 0) {
    return false;
  }

  return roleIds.some((roleId) => hasRole(member, roleId));
}
