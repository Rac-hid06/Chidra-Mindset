import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initDatabase, cleanExpiredSessions } from './db.js';
import { handleApiRequest } from './router.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

initDatabase();

// ✅ PHASE 2 — Nettoyage des sessions expirées au démarrage + toutes les heures
cleanExpiredSessions();
setInterval(cleanExpiredSessions, 60 * 60 * 1000); // 1 heure

const PORT = process.env.PORT || 5000;
const distDir = path.join(__dirname, '../dist');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  // 1. Routes API
  if (req.url.startsWith('/api')) {
    return handleApiRequest(req, res);
  }

  // 2. Fichiers Statiques (Production)
  if (fs.existsSync(distDir)) {
    let filePath = path.join(distDir, req.url.split('?')[0]);

    // ✅ PROTECTION PATH TRAVERSAL (CWE-22)
    // Résoudre le chemin absolu et vérifier qu'il reste dans dist/
    const resolvedPath = path.resolve(filePath);
    const resolvedDistDir = path.resolve(distDir);
    if (!resolvedPath.startsWith(resolvedDistDir + path.sep) && resolvedPath !== resolvedDistDir) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('403 Interdit');
    }

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(distDir, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    try {
      const content = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': contentType });
      return res.end(content);
    } catch (err) {
      res.writeHead(500);
      return res.end('Erreur serveur');
    }
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<h1>Serveur API Chidra Mindset actif</h1><p>Lancez Vite pour le frontend en mode développement.</p>');
});

server.listen(PORT, () => {
  console.log(`\n🚀 Serveur Chidra Mindset actif sur http://localhost:${PORT}`);
  console.log(`📡 API Backend disponible sur http://localhost:${PORT}/api\n`);
});
