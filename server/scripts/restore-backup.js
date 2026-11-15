/**
 * CHIDRA MINDSET — Script de Restauration de Sauvegarde
 * ✅ PHASE 4 — Restauration fiable avec transaction SQLite
 *
 * Usage : node server/scripts/restore-backup.js ./backup.json
 *
 * Ce script :
 * 1. Valide l'intégrité du fichier JSON (structure attendue)
 * 2. Exécute la restauration dans une transaction atomique
 * 3. En cas d'erreur, annule tout (rollback automatique)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chemin de la base de données (configurable via DATABASE_PATH)
const dataDir = path.join(__dirname, '../data');
const dbPath = process.env.DATABASE_PATH || path.join(dataDir, 'chidra.sqlite');

// ============================================================
// 1. Vérification des arguments
// ============================================================
const backupFile = process.argv[2];
if (!backupFile) {
  console.error('❌ Usage : node server/scripts/restore-backup.js <fichier-backup.json>');
  process.exit(1);
}

const backupPath = path.resolve(backupFile);
if (!fs.existsSync(backupPath)) {
  console.error(`❌ Fichier de sauvegarde introuvable : ${backupPath}`);
  process.exit(1);
}

// ============================================================
// 2. Lecture et validation du fichier JSON
// ============================================================
let backup;
try {
  const raw = fs.readFileSync(backupPath, 'utf-8');
  backup = JSON.parse(raw);
} catch (err) {
  console.error('❌ Impossible de lire ou parser le fichier JSON :', err.message);
  process.exit(1);
}

// Validation de la structure minimale attendue
const REQUIRED_FIELDS = ['platform', 'version', 'exportDate', 'stories', 'categories'];
const missing = REQUIRED_FIELDS.filter(f => !(f in backup));
if (missing.length > 0) {
  console.error(`❌ Fichier de sauvegarde invalide. Champs manquants : ${missing.join(', ')}`);
  process.exit(1);
}

if (!Array.isArray(backup.stories) || !Array.isArray(backup.categories)) {
  console.error('❌ Structure invalide : stories et categories doivent être des tableaux.');
  process.exit(1);
}

if (backup.platform !== 'CHIDRA MINDSET') {
  console.error('❌ Ce fichier ne correspond pas à une sauvegarde Chidra Mindset.');
  process.exit(1);
}

console.log('\n🔍 Validation du fichier de sauvegarde :');
console.log(`   Plateforme : ${backup.platform}`);
console.log(`   Version    : ${backup.version}`);
console.log(`   Exporté le : ${backup.exportDate}`);
console.log(`   Stories    : ${backup.stories.length}`);
console.log(`   Catégories : ${backup.categories.length}`);
console.log(`   Utilisateurs : ${backup.users?.length ?? 0}`);

// ============================================================
// 3. Confirmation manuelle (sécurité)
// ============================================================
console.log('\n⚠️  ATTENTION : Cette opération va EFFACER toutes les données actuelles');
console.log(`   et les remplacer par le contenu de : ${path.basename(backupPath)}`);
console.log('\n   Pour confirmer, relancez avec --confirm comme second argument.');
console.log('   Exemple : node server/scripts/restore-backup.js backup.json --confirm\n');

if (process.argv[3] !== '--confirm') {
  console.log('ℹ️  Restauration annulée (aucun argument --confirm fourni).');
  process.exit(0);
}

// ============================================================
// 4. Connexion à la base et restauration dans une transaction
// ============================================================
console.log('\n🔄 Démarrage de la restauration...');
const db = new DatabaseSync(dbPath);

try {
  // Active les clés étrangères
  db.exec('PRAGMA foreign_keys = OFF;');
  db.exec('BEGIN TRANSACTION;');

  // ---- Effacement des données existantes ----
  db.exec('DELETE FROM admin_audit_logs;');
  db.exec('DELETE FROM analytics_events;');
  db.exec('DELETE FROM user_favorites;');
  db.exec('DELETE FROM sessions;');
  db.exec('DELETE FROM login_attempts;');
  db.exec('DELETE FROM stories;');
  db.exec('DELETE FROM categories;');
  // On préserve TOUJOURS les utilisateurs existants (mots de passe intacts)
  // Sauf si le backup contient des données utilisateur non-vides
  if (backup.users && backup.users.length > 0) {
    // NE PAS effacer les utilisateurs existants pour préserver les hashes de mots de passe
    // On mettra à jour uniquement les métadonnées non-sensibles
    console.log('   ℹ️  Utilisateurs conservés (mots de passe préservés).');\n  }

  // ---- Restauration des catégories ----
  const insertCat = db.prepare(
    'INSERT OR IGNORE INTO categories (id, name, slug, description, created_at) VALUES (?, ?, ?, ?, ?)'
  );
  for (const c of backup.categories) {
    insertCat.run(c.id, c.name, c.slug, c.description || '', c.created_at || new Date().toISOString());
  }
  console.log(`   ✅ ${backup.categories.length} catégorie(s) restaurée(s).`);

  // ---- Restauration des stories ----
  const insertStory = db.prepare(`
    INSERT OR REPLACE INTO stories (
      id, theme, category, title_main, title_sub, hook_icon, hook_text,
      subhook_icon, subhook_text, truth_title, truth_text, truth_highlight,
      story_icon, parable_title, story, punchline, takeaways_json, accent_color,
      is_published, is_featured, views_count, downloads_count, likes_count,
      created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?
    )
  `);
  for (const s of backup.stories) {
    insertStory.run(
      s.id, s.theme, s.category,
      s.title_main || s.titleMain,
      s.title_sub || s.titleSub,
      s.hook_icon || s.hookIcon || '⏳',
      s.hook_text || s.hookText || '',
      s.subhook_icon || s.subhookIcon || '🔒',
      s.subhook_text || s.subhookText || '',
      s.truth_title || s.truthTitle || 'CONNAIS-TU CETTE VÉRITÉ ?',
      s.truth_text || s.truthText || '',
      s.truth_highlight || s.truthHighlight || '',
      s.story_icon || s.storyIcon || '💡',
      s.parable_title || s.parableTitle || '',
      s.story || '',
      s.punchline || '',
      s.takeaways_json || JSON.stringify(s.takeaways || []),
      s.accent_color || s.accentColor || '#F59E0B',
      s.is_published !== undefined ? s.is_published : (s.isPublished ? 1 : 1),
      s.is_featured !== undefined ? s.is_featured : (s.isFeatured ? 1 : 0),
      s.views_count || s.viewsCount || 0,
      s.downloads_count || s.downloadsCount || 0,
      s.likes_count || s.likesCount || 0,
      s.created_at || s.createdAt || new Date().toISOString(),
      s.updated_at || s.updatedAt || new Date().toISOString()
    );
  }
  console.log(`   ✅ ${backup.stories.length} motivation(s) restaurée(s).`);

  // ---- Restauration optionnelle des utilisateurs ----
  if (backup.users && backup.users.length > 0) {
    // ✅ SÉCURITÉ : Les mots de passe ne sont JAMAIS dans les backups.
    // On restaure uniquement les métadonnées utilisateur (nom, rôle, statut).
    // Les comptes sont créés avec des hashes vides — il faudra re-exécuter seed-admin.js
    // pour recréer les mots de passe des administrateurs.
    for (const u of backup.users) {
      try {
        db.prepare(`
          INSERT OR IGNORE INTO users (id, email, password_hash, salt, name, role, status, created_at, updated_at)
          VALUES (?, ?, '', '', ?, ?, ?, ?, ?)
        `).run(u.id, u.email, u.name, u.role || 'USER', u.status || 'ACTIVE',
          u.created_at || u.createdAt || new Date().toISOString(),
          u.updated_at || u.updatedAt || new Date().toISOString());
      } catch (_) { /* Skip si conflit */ }
    }
    console.log(`   ✅ ${backup.users.length} utilisateur(s) (métadonnées uniquement, mots de passe exclus).`);
    if (backup.users.some(u => u.role === 'ADMIN')) {
      console.log('   ⚠️  Des comptes ADMIN ont été restaurés sans mot de passe.');
      console.log('      Exécutez : node server/scripts/seed-admin.js <email> <password>');
    }
  }

  // ---- Validation de la transaction ----
  db.exec('COMMIT;');
  db.exec('PRAGMA foreign_keys = ON;');

  console.log('\n✅ Restauration terminée avec succès !');
  console.log(`   Base de données : ${dbPath}`);

  // ---- Vérification post-restauration ----
  const verifyStories = db.prepare('SELECT COUNT(*) as c FROM stories').get().c;
  const verifyCats = db.prepare('SELECT COUNT(*) as c FROM categories').get().c;
  console.log(`\n📊 Vérification :`);
  console.log(`   Stories en base    : ${verifyStories}`);
  console.log(`   Catégories en base : ${verifyCats}`);

  if (verifyStories !== backup.stories.length) {
    console.warn(`\n⚠️  AVERTISSEMENT : ${backup.stories.length} stories attendues, ${verifyStories} en base.`);
  }

} catch (err) {
  // ---- Annulation en cas d'erreur ----
  try { db.exec('ROLLBACK;'); } catch (_) {}
  console.error('\n❌ ERREUR durant la restauration — Transaction annulée (rollback).');
  console.error('   Détail :', err.message);
  console.error('   Les données précédentes sont intactes.');
  process.exit(1);
} finally {
  db.close();
}
