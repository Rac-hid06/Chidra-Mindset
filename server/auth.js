import crypto from 'node:crypto';
import { db } from './db.js';

const SESSION_DURATION_DAYS = 14;
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MINUTES = 15;

/**
 * Hache un mot de passe avec scrypt (OWASP standard, résistant aux attaques GPU/ASIC)
 */
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

/**
 * Vérifie un mot de passe en temps constant (Timing-safe)
 */
export function verifyPassword(password, salt, storedHash) {
  try {
    const computedHash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(storedHash, 'hex'));
  } catch (err) {
    return false;
  }
}

/**
 * Vérifie et incrémente les tentatives de connexion (Brute-force protection)
 */
export function checkRateLimit(ip, email) {
  const fifteenMinutesAgo = Date.now() - LOGIN_LOCKOUT_MINUTES * 60 * 1000;
  
  // Nettoie les tentatives obsolètes
  db.prepare('DELETE FROM login_attempts WHERE attempted_at < ?').run(fifteenMinutesAgo);
  
  const count = db.prepare(`
    SELECT COUNT(*) as c FROM login_attempts 
    WHERE (ip = ? OR email = ?) AND attempted_at >= ?
  `).get(ip, email.toLowerCase(), fifteenMinutesAgo).c;

  return count < MAX_LOGIN_ATTEMPTS;
}

export function recordFailedAttempt(ip, email) {
  db.prepare(`
    INSERT INTO login_attempts (ip, email, attempted_at)
    VALUES (?, ?, ?)
  `).run(ip, email.toLowerCase(), Date.now());
}

export function clearFailedAttempts(ip, email) {
  db.prepare('DELETE FROM login_attempts WHERE ip = ? OR email = ?').run(ip, email.toLowerCase());
}

/**
 * Crée une session cryptographiquement sécurisée
 */
export function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

  db.prepare(`
    INSERT INTO sessions (token, user_id, expires_at, created_at)
    VALUES (?, ?, ?, ?)
  `).run(token, userId, expires.toISOString(), now.toISOString());

  return { token, expiresAt: expires.toISOString() };
}

/**
 * Valide une session et retourne l'utilisateur associé
 */
export function getSessionUser(token) {
  if (!token) return null;

  const row = db.prepare(`
    SELECT s.token, s.expires_at, u.id, u.email, u.name, u.role, u.status, u.created_at
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ?
  `).get(token);

  if (!row) return null;

  // Vérifier la date d'expiration
  if (new Date(row.expires_at) < new Date()) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return null;
  }

  // Vérifier si le compte est suspendu
  if (row.status !== 'ACTIVE') {
    return { ...row, isSuspended: true };
  }

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    status: row.status,
    createdAt: row.created_at
  };
}

/**
 * Supprime une session (Déconnexion)
 */
export function deleteSession(token) {
  if (!token) return;
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

/**
 * Extrait le token Bearer d'un en-tête Authorization
 */
export function extractBearerToken(req) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  // Cookie fallback si présent
  const cookieHeader = req.headers['cookie'];
  if (cookieHeader) {
    const match = cookieHeader.match(/chidra_session=([a-f0-9]+)/);
    if (match) return match[1];
  }
  return null;
}
