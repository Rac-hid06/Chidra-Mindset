import crypto from 'node:crypto';
import { db } from './db.js';

/**
 * Journalise une action administrative
 */
export function logAdminAction({ adminId, adminEmail, action, targetType, targetId = null, details = {} }) {
  const id = `audit-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO admin_audit_logs (
      id, admin_id, admin_email, action, target_type, target_id, details_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    adminId,
    adminEmail,
    action,
    targetType,
    targetId,
    JSON.stringify(details),
    now
  );
}

/**
 * Récupère les derniers logs d'audit pour le back-office
 */
export function getAuditLogs(limit = 50) {
  const rows = db.prepare(`
    SELECT id, admin_id, admin_email, action, target_type, target_id, details_json, created_at
    FROM admin_audit_logs
    ORDER BY created_at DESC
    LIMIT ?
  `).all(limit);

  return rows.map(r => ({
    ...r,
    details: JSON.parse(r.details_json || '{}')
  }));
}
