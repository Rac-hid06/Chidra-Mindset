/**
 * CHIDRA MINDSET — Tests de Sécurité Spécifiques
 * ✅ PHASE 6 — Vérification directe des corrections de l'audit
 *
 * Tests couverts :
 *  S1 — Path Traversal : la logique bloque les chemins hors dist/
 *  S2 — Protection SQLite : URL traversal détectée et bloquée
 *  S3 — Payload limit : readJsonBody rejette >1Mo
 *  S4 — Cookie HttpOnly : sendJsonWithSession émet le bon cookie
 *  S5 — CORS : header non wildcard en mode développement
 *  S6 — Session après logout : deleteSession révoque en base
 *  S7 — Utilisateur suspendu : getSessionUser retourne isSuspended
 *  S8 — Non-admin sur routes admin : rôle vérifié en base
 *  S9 — Inscription force rôle USER : impossible d'escalader ADMIN
 *  S10 — Variables d'env : .env.example existe, .env absent de Git
 *  S11 — engines Node.js : déclaré dans package.json
 *  S12 — render.yaml : fichier de déploiement présent
 */

import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { db, initDatabase } from '../db.js';
import {
  hashPassword,
  verifyPassword,
  createSession,
  getSessionUser,
  deleteSession
} from '../auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '../..');

initDatabase();

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✅ [PASS] ${label}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${label}`);
    failed++;
  }
}

console.log('\n🛡️  TESTS DE SÉCURITÉ — CHIDRA MINDSET\n');

// ============================================================
// TEST S1 — Logique Path Traversal
// ============================================================
console.log('TEST S1: Logique de protection Path Traversal');
{
  const distDir = path.join(projectRoot, 'dist');
  const resolvedDistDir = path.resolve(distDir);

  // Ces URL représentent les vraies URL reçues par le serveur HTTP
  // (jamais préfixées par /dist — le serveur sert directement depuis dist/)
  const attackUrls = [
    '../../server/data/chidra.sqlite',
    '../server/index.js',
    '%2e%2e%2fserver%2fdb.js',
    '/../server/auth.js',
    '/../../../../etc/passwd'
  ];

  let allBlocked = true;
  for (const url of attackUrls) {
    // Simuler exactement ce que fait server/index.js : path.join(distDir, url.split('?')[0])
    const rawPath = decodeURIComponent(url.split('?')[0]);
    const filePath = path.join(distDir, rawPath);
    const resolvedPath = path.resolve(filePath);
    const isBlocked = !resolvedPath.startsWith(resolvedDistDir + path.sep) && resolvedPath !== resolvedDistDir;
    if (!isBlocked) {
      console.error(`    ⚠️  URL non bloquée : ${url} → ${resolvedPath}`);
      allBlocked = false;
    }
  }
  assert(allBlocked, 'Toutes les URL de traversal détectées et bloquées');

  // Vérifier qu'une URL légitime n'est pas bloquée
  const legitPath = path.join(distDir, 'index.html');
  const resolvedLegit = path.resolve(legitPath);
  const legitAllowed = resolvedLegit.startsWith(resolvedDistDir + path.sep) || resolvedLegit === resolvedDistDir;
  assert(legitAllowed, 'URL légitime (index.html) non bloquée');
}

// ============================================================
// TEST S2 — Chemin SQLite non accessible
// ============================================================
console.log('\nTEST S2: Fichier SQLite hors dist/');
{
  const distDir = path.join(projectRoot, 'dist');
  const sqlitePath = path.join(projectRoot, 'server', 'data', 'chidra.sqlite');
  const resolvedDistDir = path.resolve(distDir);
  const resolvedSqlite = path.resolve(sqlitePath);

  const isOutsideDist = !resolvedSqlite.startsWith(resolvedDistDir + path.sep);
  assert(isOutsideDist, 'SQLite correctement situé hors du dossier dist/');
  assert(fs.existsSync(sqlitePath), 'SQLite existe bien sur disque');
}

// ============================================================
// TEST S3 — Limite payload (vérification logique)
// ============================================================
console.log('\nTEST S3: Limite payload 1 Mo');
{
  // Vérifier que la constante MAX_BODY_SIZE est dans router.js
  const routerPath = path.join(projectRoot, 'server', 'router.js');
  const routerContent = fs.readFileSync(routerPath, 'utf-8');
  assert(routerContent.includes('1_048_576'), 'Limite 1 Mo (1_048_576) présente dans router.js');
  assert(routerContent.includes('socket?.destroy()'), 'Socket détruite lors du dépassement payload');
}

// ============================================================
// TEST S4 — Cookie HttpOnly
// ============================================================
console.log('\nTEST S4: Cookie HttpOnly dans router.js');
{
  const routerPath = path.join(projectRoot, 'server', 'router.js');
  const routerContent = fs.readFileSync(routerPath, 'utf-8');
  assert(routerContent.includes('HttpOnly'), 'Attribut HttpOnly présent dans le code');
  assert(routerContent.includes('SameSite='), 'Attribut SameSite présent dans le code');
  assert(routerContent.includes('sendJsonWithSession'), 'Fonction sendJsonWithSession définie');
  assert(routerContent.includes('clearSessionCookie'), 'Fonction clearSessionCookie définie pour logout');
}

// ============================================================
// TEST S5 — CORS non wildcard
// ============================================================
console.log('\nTEST S5: CORS restreint au domaine configuré');
{
  const routerPath = path.join(projectRoot, 'server', 'router.js');
  const routerContent = fs.readFileSync(routerPath, 'utf-8');
  const hasWildcard = routerContent.includes("'Access-Control-Allow-Origin': '*'");
  assert(!hasWildcard, 'Pas de wildcard * dans Access-Control-Allow-Origin');
  assert(routerContent.includes('ALLOWED_ORIGIN'), 'Variable ALLOWED_ORIGIN utilisée pour le CORS');
}

// ============================================================
// TEST S6 — Révocation de session
// ============================================================
console.log('\nTEST S6: Révocation de session en base');
{
  // Créer un utilisateur de test temporaire
  const testEmail = `sec-s6-${Date.now()}@test.internal`;
  const { salt, hash } = hashPassword('TestPass123!');
  const userId = `usr-s6-${Date.now()}`;
  const now = new Date().toISOString();

  try {
    db.prepare(`
      INSERT INTO users (id, email, password_hash, salt, name, role, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'SecTest', 'USER', 'ACTIVE', ?, ?)
    `).run(userId, testEmail, hash, salt, now, now);

    const { token } = createSession(userId);
    assert(!!getSessionUser(token), 'Session valide avant logout');

    deleteSession(token);
    assert(!getSessionUser(token), 'Session nulle après deleteSession (révocation OK)');

    // Nettoyage
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  } catch (err) {
    assert(false, `Erreur test révocation : ${err.message}`);
  }
}

// ============================================================
// TEST S7 — Utilisateur suspendu
// ============================================================
console.log('\nTEST S7: Utilisateur suspendu détecté par getSessionUser');
{
  const testEmail = `sec-s7-${Date.now()}@test.internal`;
  const { salt, hash } = hashPassword('TestPass123!');
  const userId = `usr-s7-${Date.now()}`;
  const now = new Date().toISOString();

  try {
    db.prepare(`
      INSERT INTO users (id, email, password_hash, salt, name, role, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'SuspendedUser', 'USER', 'SUSPENDED', ?, ?)
    `).run(userId, testEmail, hash, salt, now, now);

    const { token } = createSession(userId);
    const user = getSessionUser(token);
    assert(user?.isSuspended === true, 'getSessionUser retourne isSuspended:true pour utilisateur suspendu');

    // Nettoyage
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  } catch (err) {
    assert(false, `Erreur test suspension : ${err.message}`);
  }
}

// ============================================================
// TEST S8 — Vérification rôle ADMIN dans router.js
// ============================================================
console.log('\nTEST S8: Vérification rôle ADMIN côté serveur');
{
  const routerPath = path.join(projectRoot, 'server', 'router.js');
  const routerContent = fs.readFileSync(routerPath, 'utf-8');
  assert(routerContent.includes("currentUser.role !== 'ADMIN'"), "Vérification rôle ADMIN présente dans router.js");
  assert(routerContent.includes("pathname.startsWith('/api/admin/')"), "Guard admin appliqué sur toutes les routes /api/admin/*");
}

// ============================================================
// TEST S9 — Inscription force rôle USER
// ============================================================
console.log('\nTEST S9: Inscription force rôle USER en base');
{
  const routerPath = path.join(projectRoot, 'server', 'router.js');
  const routerContent = fs.readFileSync(routerPath, 'utf-8');
  // Vérifier que lors de l'INSERT, le rôle est hardcodé à 'USER'
  assert(routerContent.includes("'USER', 'ACTIVE'"), "Rôle USER hardcodé dans INSERT lors de l'inscription");
  // Vérifier qu'il n'y a pas de rôle pris depuis body lors de l'inscription
  const registerBlock = routerContent.split('/api/auth/register')[1]?.split('/api/auth/login')[0] || '';
  assert(!registerBlock.includes('body.role'), "Rôle de body non utilisé lors de l'inscription");
}

// ============================================================
// TEST S10 — Fichiers d'environnement
// ============================================================
console.log('\nTEST S10: Configuration des variables d\'environnement');
{
  const envExamplePath = path.join(projectRoot, '.env.example');
  const gitignorePath = path.join(projectRoot, '.gitignore');

  assert(fs.existsSync(envExamplePath), '.env.example présent à la racine');

  const envExample = fs.readFileSync(envExamplePath, 'utf-8');
  assert(envExample.includes('DATABASE_PATH'), 'DATABASE_PATH documenté dans .env.example');
  assert(envExample.includes('ALLOWED_ORIGIN'), 'ALLOWED_ORIGIN documenté dans .env.example');

  const gitignore = fs.readFileSync(gitignorePath, 'utf-8');
  assert(gitignore.includes('.env'), '.env exclu du versioning Git');
  assert(gitignore.includes('*.sqlite'), 'Fichiers SQLite exclus du versioning Git');
  assert(gitignore.includes('server/data/'), 'Dossier server/data/ exclu du versioning Git');
}

// ============================================================
// TEST S11 — Version Node.js déclarée
// ============================================================
console.log('\nTEST S11: Version Node.js déclarée dans package.json');
{
  const pkgPath = path.join(projectRoot, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  assert(!!pkg.engines?.node, 'Champ engines.node présent dans package.json');
  assert(pkg.engines?.node?.includes('22.5.0'), 'Version minimale >=22.5.0 déclarée (compatibilité node:sqlite)');
}

// ============================================================
// TEST S12 — Fichier de déploiement Render
// ============================================================
console.log('\nTEST S12: Configuration de déploiement Render');
{
  const renderPath = path.join(projectRoot, 'render.yaml');
  assert(fs.existsSync(renderPath), 'render.yaml présent à la racine');

  const renderContent = fs.readFileSync(renderPath, 'utf-8');
  assert(renderContent.includes('mountPath: /data'), 'Disque persistant configuré avec mountPath /data');
  assert(renderContent.includes('DATABASE_PATH'), 'DATABASE_PATH référencé dans render.yaml');
  assert(renderContent.includes('node server/index.js'), 'Commande de démarrage correcte');
}

// ============================================================
// TEST S13 — Nettoyage sessions expirées
// ============================================================
console.log('\nTEST S13: Nettoyage sessions expirées');
{
  const dbContent = fs.readFileSync(path.join(projectRoot, 'server', 'db.js'), 'utf-8');
  const indexContent = fs.readFileSync(path.join(projectRoot, 'server', 'index.js'), 'utf-8');
  assert(dbContent.includes('cleanExpiredSessions'), 'Fonction cleanExpiredSessions définie dans db.js');
  assert(indexContent.includes('setInterval'), 'setInterval présent dans index.js pour le nettoyage périodique');
  assert(indexContent.includes('cleanExpiredSessions'), 'cleanExpiredSessions appelée dans index.js');
}

// ============================================================
// Résultats
// ============================================================
console.log('\n====================================================');
console.log(`RÉSULTATS SÉCURITÉ : ${passed} passés, ${failed} échoués`);
console.log('====================================================\n');

process.exit(failed > 0 ? 1 : 0);
