import crypto from 'node:crypto';
import { db, initDatabase } from '../db.js';
import { hashPassword } from '../auth.js';

initDatabase();

const args = process.argv.slice(2);
const email = args[0] || process.env.ADMIN_EMAIL;
const password = args[1] || process.env.ADMIN_PASSWORD;
const name = args[2] || process.env.ADMIN_NAME || 'Administrateur Chidra';

if (!email || !password) {
  console.error('\n❌ Erreur : Veuillez fournir un email et un mot de passe.');
  console.log('Usage: node server/scripts/seed-admin.js <email> <password> [nom]');
  console.log('Exemple: node server/scripts/seed-admin.js admin@chidramindset.com MotDePasseSecurise2026! "Fondateur Chidra"\n');
  process.exit(1);
}

if (password.length < 8) {
  console.error('❌ Le mot de passe doit comporter au moins 8 caractères.');
  process.exit(1);
}

const existing = db.prepare('SELECT id, email, role FROM users WHERE email = ?').get(email.toLowerCase());
const { salt, hash } = hashPassword(password);
const now = new Date().toISOString();

if (existing) {
  // Met à jour en rôle ADMIN
  db.prepare(`
    UPDATE users 
    SET password_hash = ?, salt = ?, role = 'ADMIN', status = 'ACTIVE', updated_at = ?
    WHERE id = ?
  `).run(hash, salt, now, existing.id);

  console.log(`\n✅ L'utilisateur "${email}" existant a été promu au rôle ADMIN avec succès !`);
  console.log(`ID : ${existing.id}`);
  console.log(`Rôle : ADMIN\n`);
} else {
  // Crée le nouvel administrateur
  const id = `usr-admin-${Date.now()}`;
  db.prepare(`
    INSERT INTO users (id, email, password_hash, salt, name, role, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'ADMIN', 'ACTIVE', ?, ?)
  `).run(id, email.toLowerCase(), hash, salt, name, now, now);

  console.log(`\n✅ Compte Administrateur Chidra Mindset créé avec succès côté serveur !`);
  console.log(`ID : ${id}`);
  console.log(`Email : ${email}`);
  console.log(`Nom : ${name}`);
  console.log(`Rôle : ADMIN\n`);
}
