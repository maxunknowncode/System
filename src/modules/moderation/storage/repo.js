import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { logger } from '../../../util/logging/logger.js';
import { STATUS } from '../constants.js';

const repoLogger = logger.withPrefix('moderation:repo');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL missing for moderation repository');
}

const pool = new Pool({ connectionString });

const schemaPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'schema.sql');

const initialisePromise = (async () => {
  const sql = await readFile(schemaPath, 'utf8');
  await pool.query(sql);
  repoLogger.info('Schema initialised.');
})();

async function ready() {
  await initialisePromise;
}

export async function createCase({
  id,
  guildId,
  userId,
  moderatorId,
  actionType,
  reasonCodes = [],
  customReason = null,
}) {
  await ready();
  const result = await pool.query(
    `INSERT INTO moderation_actions (id, guild_id, user_id, moderator_id, action_type, reason_codes, custom_reason)
     VALUES ($1, $2, $3, $4, $5, $6::text[], $7)
     RETURNING *`,
    [id, guildId, userId, moderatorId, actionType, reasonCodes, customReason]
  );
  return mapRow(result.rows[0]);
}

export async function getCaseById(id) {
  await ready();
  const result = await pool.query('SELECT * FROM moderation_actions WHERE id = $1', [id]);
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

export async function updateCaseDuration(id, { endTs, permanent }) {
  await ready();
  const result = await pool.query(
    `UPDATE moderation_actions
     SET end_ts = $2, permanent = $3, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, endTs, permanent]
  );
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

export async function updateCaseReasonCodes(id, reasonCodes) {
  await ready();
  const result = await pool.query(
    `UPDATE moderation_actions
     SET reason_codes = $2::text[], updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, reasonCodes]
  );
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

export async function updateCaseCustomReason(id, customReason) {
  await ready();
  const result = await pool.query(
    `UPDATE moderation_actions
     SET custom_reason = $2, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, customReason]
  );
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

export async function updateCaseReasonText(id, reasonText) {
  await ready();
  const result = await pool.query(
    `UPDATE moderation_actions
     SET reason_text = $2, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, reasonText]
  );
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

export async function updateCaseStatus(id, status, { startTs, endTs, permanent } = {}) {
  await ready();
  const result = await pool.query(
    `UPDATE moderation_actions
     SET status = $2,
         start_ts = COALESCE($3, start_ts),
         end_ts = COALESCE($4, end_ts),
         permanent = COALESCE($5, permanent),
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, status, startTs, endTs, permanent]
  );
  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

export async function updateCaseDM(id, dmOk) {
  await ready();
  await pool.query(
    `UPDATE moderation_actions
     SET dm_ok = $2, updated_at = NOW()
     WHERE id = $1`,
    [id, dmOk]
  );
}

export async function updateCaseAudit(id, auditId) {
  await ready();
  await pool.query(
    `UPDATE moderation_actions
     SET audit_id = $2, updated_at = NOW()
     WHERE id = $1`,
    [id, auditId]
  );
}

export async function markCaseFailed(id) {
  await ready();
  await pool.query(
    `UPDATE moderation_actions
     SET status = $2, updated_at = NOW()
     WHERE id = $1`,
    [id, STATUS.FAILED]
  );
}

export async function findDueToLift(limit = 20) {
  await ready();
  const result = await pool.query(
    `SELECT * FROM moderation_actions
     WHERE status = $1
       AND end_ts IS NOT NULL
       AND end_ts <= NOW()
     ORDER BY end_ts ASC
     LIMIT $2`,
    [STATUS.ACTIVE, limit]
  );
  return result.rows.map(mapRow);
}

export async function markLifted(id) {
  await ready();
  await pool.query(
    `UPDATE moderation_actions
     SET status = $2, updated_at = NOW()
     WHERE id = $1`,
    [id, STATUS.LIFTED]
  );
}

export async function closePool() {
  await pool.end();
}

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    guildId: row.guild_id,
    userId: row.user_id,
    moderatorId: row.moderator_id,
    actionType: row.action_type,
    reasonCodes: row.reason_codes ?? [],
    reasonText: row.reason_text ?? null,
    customReason: row.custom_reason ?? null,
    startTs: row.start_ts ? new Date(row.start_ts) : null,
    endTs: row.end_ts ? new Date(row.end_ts) : null,
    permanent: Boolean(row.permanent),
    auditId: row.audit_id ?? null,
    dmOk: Boolean(row.dm_ok),
    status: row.status,
    createdAt: row.created_at ? new Date(row.created_at) : null,
    updatedAt: row.updated_at ? new Date(row.updated_at) : null,
  };
}
