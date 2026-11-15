import crypto from 'node:crypto';
import { db } from './db.js';
import { 
  hashPassword, 
  verifyPassword, 
  checkRateLimit, 
  recordFailedAttempt, 
  clearFailedAttempts,
  createSession, 
  getSessionUser, 
  deleteSession, 
  extractBearerToken 
} from './auth.js';
import { recordEvent, getAnalyticsSummary } from './analytics.js';
import { logAdminAction, getAuditLogs } from './audit.js';

/**
 * Lit le corps JSON d'une requête HTTP (limite 1 Mo)
 */
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    const MAX_BODY_SIZE = 1_048_576; // 1 Mo

    req.on('data', chunk => {
      body += chunk;
      if (body.length > MAX_BODY_SIZE) {
        // Détruire la connexion pour éviter le déni de service
        req.socket?.destroy();
        reject(new Error('Payload trop volumineux (max 1 Mo).'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

/**
 * Réponse utilitaire JSON
 */
function sendJson(res, statusCode, data) {
  // ✅ CORS restreint au domaine configuré (pas de wildcard '*')
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';

  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Vary': 'Origin'
  });
  res.end(JSON.stringify(data));
}

/**
 * ✅ PHASE 3 — Réponse avec cookie de session HttpOnly (sécurisé contre XSS)
 * Émet simultanément le token dans le corps JSON (rétro-compatibilité Bearer)
 * et dans un cookie HttpOnly (protection XSS pour les navigateurs modernes).
 */
function sendJsonWithSession(res, statusCode, data, token, expiresAt) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';
  const isProduction = process.env.NODE_ENV === 'production';
  const maxAge = 14 * 24 * 60 * 60; // 14 jours en secondes

  // Attributs du cookie adaptés à l'environnement
  const secureFlag = isProduction ? '; Secure' : '';
  const sameSite = isProduction ? 'Strict' : 'Lax';
  const cookieValue = `chidra_session=${token}; HttpOnly${secureFlag}; SameSite=${sameSite}; Path=/; Max-Age=${maxAge}`;

  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin',
    'Set-Cookie': cookieValue
  });
  res.end(JSON.stringify(data));
}

/**
 * ✅ PHASE 3 — Effacement du cookie de session lors de la déconnexion
 */
function clearSessionCookie(res) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';
  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin',
    'Set-Cookie': 'chidra_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'
  });
  res.end(JSON.stringify({ message: 'Déconnexion réussie.' }));
}

/**
 * Gestionnaire principal des requêtes API
 */
export async function handleApiRequest(req, res) {
  try {
    const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = urlObj.pathname;
    const method = req.method;
    const ip = req.socket?.remoteAddress || req.headers['x-forwarded-for'] || '127.0.0.1';

    // Gestion des requêtes CORS Preflight
    if (method === 'OPTIONS') {
      const allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';
      res.writeHead(204, {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Vary': 'Origin'
      });
      return res.end();
    }

    // Authentification de la requête
    const token = extractBearerToken(req);
    const currentUser = getSessionUser(token);

  // =========================================================================
  // 1. AUTHENTIFICATION & COMPTE
  // =========================================================================

  // Inscription (Rôle strictement USER)
  if (pathname === '/api/auth/register' && method === 'POST') {
    const body = await readJsonBody(req);
    const { email, password, name } = body;

    if (!email || !password || !name) {
      return sendJson(res, 400, { error: 'Nom, adresse email et mot de passe requis.' });
    }

    if (password.length < 6) {
      return sendJson(res, 400, { error: 'Le mot de passe doit comporter au moins 6 caractères.' });
    }

    const emailClean = email.toLowerCase().trim();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(emailClean);
    if (existing) {
      return sendJson(res, 409, { error: 'Cette adresse email est déjà enregistrée.' });
    }

    const { salt, hash } = hashPassword(password);
    const userId = `usr-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const now = new Date().toISOString();

    // RÔLE TOUJOURS 'USER' LORS DE L'INSCRIPTION PUBLIQUE
    db.prepare(`
      INSERT INTO users (id, email, password_hash, salt, name, role, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'USER', 'ACTIVE', ?, ?)
    `).run(userId, emailClean, hash, salt, name.trim(), now, now);

    const { token: sessionToken, expiresAt } = createSession(userId);

    // ✅ PHASE 3 — Cookie HttpOnly + Bearer token (double canal, rétro-compatible)
    return sendJsonWithSession(res, 201, {
      message: 'Compte créé avec succès.',
      token: sessionToken,
      expiresAt,
      user: { id: userId, email: emailClean, name: name.trim(), role: 'USER' }
    }, sessionToken, expiresAt);
  }

  // Connexion
  if (pathname === '/api/auth/login' && method === 'POST') {
    const body = await readJsonBody(req);
    const { email, password } = body;

    if (!email || !password) {
      return sendJson(res, 400, { error: 'Email et mot de passe requis.' });
    }

    const emailClean = email.toLowerCase().trim();

    // Vérification du Rate Limiting (Brute force)
    if (!checkRateLimit(ip, emailClean)) {
      return sendJson(res, 429, { 
        error: 'Trop de tentatives échouées. Par sécurité, veuillez réessayer dans 15 minutes.' 
      });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(emailClean);

    if (!user || !verifyPassword(password, user.salt, user.password_hash)) {
      recordFailedAttempt(ip, emailClean);
      return sendJson(res, 401, { error: 'Identifiants invalides.' });
    }

    if (user.status === 'SUSPENDED') {
      return sendJson(res, 403, { 
        error: 'Ce compte est suspendu par un administrateur. Accès refusé.' 
      });
    }

    clearFailedAttempts(ip, emailClean);
    const { token: sessionToken, expiresAt } = createSession(user.id);

    // ✅ PHASE 3 — Cookie HttpOnly + Bearer token (double canal, rétro-compatible)
    return sendJsonWithSession(res, 200, {
      message: 'Connexion réussie.',
      token: sessionToken,
      expiresAt,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status
      }
    }, sessionToken, expiresAt);
  }

  // Déconnexion
  if (pathname === '/api/auth/logout' && method === 'POST') {
    if (token) deleteSession(token);
    // ✅ PHASE 3 — Effacement du cookie HttpOnly lors de la déconnexion
    return clearSessionCookie(res);
  }

  // Utilisateur actuel
  if (pathname === '/api/auth/me' && method === 'GET') {
    if (!currentUser) {
      return sendJson(res, 401, { error: 'Non authentifié.' });
    }
    if (currentUser.isSuspended) {
      return sendJson(res, 403, { error: 'Compte suspendu.' });
    }
    return sendJson(res, 200, { user: currentUser });
  }

  // =========================================================================
  // 2. MOTIVATIONS PUBLIQUES & FAVORIS
  // =========================================================================

  // Liste des motivations publiques (uniquement publiées)
  if (pathname === '/api/stories' && method === 'GET') {
    const search = urlObj.searchParams.get('search') || '';
    const category = urlObj.searchParams.get('category') || '';

    let query = `
      SELECT 
        id, theme, category, title_main as titleMain, title_sub as titleSub,
        hook_icon as hookIcon, hook_text as hookText, subhook_icon as subhookIcon,
        subhook_text as subhookText, truth_title as truthTitle, truth_text as truthText,
        truth_highlight as truthHighlight, story_icon as storyIcon, parable_title as parableTitle,
        story, punchline, takeaways_json, accent_color as accentColor,
        is_published as isPublished, is_featured as isFeatured,
        likes_count as likesCount, views_count as viewsCount, downloads_count as downloadsCount,
        created_at as createdAt
      FROM stories
      WHERE is_published = 1
    `;
    const params = [];

    if (category && category !== 'ALL') {
      query += ' AND category = ?';
      params.push(category);
    }

    if (search.trim()) {
      query += ` AND (
        title_main LIKE ? OR title_sub LIKE ? OR theme LIKE ? OR 
        category LIKE ? OR story LIKE ? OR punchline LIKE ?
      )`;
      const s = `%${search.trim()}%`;
      params.push(s, s, s, s, s, s);
    }

    query += ' ORDER BY is_featured DESC, created_at DESC';

    const rows = db.prepare(query).all(...params);
    const stories = rows.map(r => ({
      ...r,
      takeaways: JSON.parse(r.takeaways_json || '[]')
    }));

    return sendJson(res, 200, { stories });
  }

  // Catégories publiques
  if (pathname === '/api/categories' && method === 'GET') {
    const categories = db.prepare('SELECT id, name, slug, description FROM categories ORDER BY name ASC').all();
    return sendJson(res, 200, { categories });
  }

  // Like / Unlike avec mise à jour et tracking réel
  const likeMatch = pathname.match(/^\/api\/stories\/([a-zA-Z0-9_-]+)\/like$/);
  if (likeMatch && method === 'POST') {
    const storyId = likeMatch[1];
    const body = await readJsonBody(req);
    const visitorId = body.visitorId || 'anon';
    const sessionId = body.sessionId || 'session';

    const story = db.prepare('SELECT id, likes_count FROM stories WHERE id = ?').get(storyId);
    if (!story) return sendJson(res, 404, { error: 'Motivation non trouvée.' });

    let isLikedNow = false;

    // Si utilisateur connecté, vérification dans user_favorites
    if (currentUser) {
      const existingFav = db.prepare('SELECT * FROM user_favorites WHERE user_id = ? AND story_id = ?').get(currentUser.id, storyId);
      if (existingFav) {
        db.prepare('DELETE FROM user_favorites WHERE user_id = ? AND story_id = ?').run(currentUser.id, storyId);
        db.prepare('UPDATE stories SET likes_count = MAX(0, likes_count - 1) WHERE id = ?').run(storyId);
        isLikedNow = false;
        recordEvent({ eventType: 'unlike', storyId, visitorId, sessionId, userId: currentUser.id });
      } else {
        db.prepare('INSERT INTO user_favorites (user_id, story_id, created_at) VALUES (?, ?, ?)').run(currentUser.id, storyId, new Date().toISOString());
        db.prepare('UPDATE stories SET likes_count = likes_count + 1 WHERE id = ?').run(storyId);
        isLikedNow = true;
        recordEvent({ eventType: 'like', storyId, visitorId, sessionId, userId: currentUser.id });
      }
    } else {
      // Pour les visiteurs non connectés
      const willLike = body.like !== false;
      if (willLike) {
        db.prepare('UPDATE stories SET likes_count = likes_count + 1 WHERE id = ?').run(storyId);
        isLikedNow = true;
        recordEvent({ eventType: 'like', storyId, visitorId, sessionId });
      } else {
        db.prepare('UPDATE stories SET likes_count = MAX(0, likes_count - 1) WHERE id = ?').run(storyId);
        isLikedNow = false;
        recordEvent({ eventType: 'unlike', storyId, visitorId, sessionId });
      }
    }

    const updated = db.prepare('SELECT likes_count FROM stories WHERE id = ?').get(storyId);
    return sendJson(res, 200, { liked: isLikedNow, likesCount: updated.likes_count });
  }

  // Favoris de l'utilisateur connecté
  if (pathname === '/api/user/favorites' && method === 'GET') {
    if (!currentUser) return sendJson(res, 401, { error: 'Connexion requise pour accéder aux favoris.' });

    const rows = db.prepare(`
      SELECT s.*, f.created_at as favorited_at
      FROM user_favorites f
      JOIN stories s ON f.story_id = s.id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
    `).all(currentUser.id);

    const favorites = rows.map(r => ({
      id: r.id,
      theme: r.theme,
      category: r.category,
      titleMain: r.title_main,
      titleSub: r.title_sub,
      hookIcon: r.hook_icon,
      hookText: r.hook_text,
      storyIcon: r.story_icon,
      parableTitle: r.parable_title,
      story: r.story,
      punchline: r.punchline,
      takeaways: JSON.parse(r.takeaways_json || '[]'),
      accentColor: r.accent_color,
      likesCount: r.likes_count
    }));

    return sendJson(res, 200, { favorites });
  }

  // Tracking Analytics public
  if (pathname === '/api/analytics/track' && method === 'POST') {
    const body = await readJsonBody(req);
    const recorded = recordEvent({
      eventType: body.eventType,
      storyId: body.storyId || null,
      visitorId: body.visitorId || 'anon',
      sessionId: body.sessionId || 'session',
      userId: currentUser?.id || null,
      metadata: body.metadata || {}
    });

    return sendJson(res, 200, { tracked: recorded });
  }

  // =========================================================================
  // 3. BACK-OFFICE ADMINISTRATEUR (PROTECTION STRICTE ROLE 'ADMIN')
  // =========================================================================

  if (pathname.startsWith('/api/admin/')) {
    if (!currentUser) {
      return sendJson(res, 401, { error: 'Authentification requise pour l accès administrateur.' });
    }
    if (currentUser.role !== 'ADMIN') {
      return sendJson(res, 403, { error: 'Accès interdit. Droits administrateur requis.' });
    }

    // Analytics complets réels
    if (pathname === '/api/admin/analytics' && method === 'GET') {
      const period = urlObj.searchParams.get('period') || '30d';
      const stats = getAnalyticsSummary(period);
      return sendJson(res, 200, stats);
    }

    // Liste complète de toutes les motivations (publiées et dépubliées)
    if (pathname === '/api/admin/stories' && method === 'GET') {
      const rows = db.prepare(`
        SELECT 
          id, theme, category, title_main as titleMain, title_sub as titleSub,
          hook_icon as hookIcon, hook_text as hookText, subhook_icon as subhookIcon,
          subhook_text as subhookText, truth_title as truthTitle, truth_text as truthText,
          truth_highlight as truthHighlight, story_icon as storyIcon, parable_title as parableTitle,
          story, punchline, takeaways_json, accent_color as accentColor,
          is_published as isPublished, is_featured as isFeatured,
          likes_count as likesCount, views_count as viewsCount, downloads_count as downloadsCount,
          created_at as createdAt, updated_at as updatedAt
        FROM stories
        ORDER BY created_at DESC
      `).all();

      const stories = rows.map(r => ({
        ...r,
        takeaways: JSON.parse(r.takeaways_json || '[]')
      }));

      return sendJson(res, 200, { stories });
    }

    // Créer une motivation
    if (pathname === '/api/admin/stories' && method === 'POST') {
      const body = await readJsonBody(req);
      const id = body.id || `story-${Date.now()}`;
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO stories (
          id, theme, category, title_main, title_sub, hook_icon, hook_text,
          subhook_icon, subhook_text, truth_title, truth_text, truth_highlight,
          story_icon, parable_title, story, punchline, takeaways_json, accent_color,
          is_published, is_featured, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?
        )
      `).run(
        id,
        body.theme || 'MINDSET & DISCIPLINE',
        body.category || 'Général',
        (body.titleMain || 'TITRE').toUpperCase(),
        (body.titleSub || 'SOUS-TITRE').toUpperCase(),
        body.hookIcon || '⏳',
        body.hookText || '',
        body.subhookIcon || '🔒',
        body.subhookText || '',
        body.truthTitle || 'CONNAIS-TU CETTE VÉRITÉ ?',
        body.truthText || '',
        body.truthHighlight || '',
        body.storyIcon || '💡',
        body.parableTitle || 'L histoire',
        body.story || '',
        (body.punchline || '').toUpperCase(),
        JSON.stringify(body.takeaways || []),
        body.accentColor || '#F59E0B',
        body.isPublished !== undefined ? (body.isPublished ? 1 : 0) : 1,
        body.isFeatured ? 1 : 0,
        now,
        now
      );

      logAdminAction({
        adminId: currentUser.id,
        adminEmail: currentUser.email,
        action: 'CREATE_STORY',
        targetType: 'STORY',
        targetId: id,
        details: { title: `${body.titleMain} ${body.titleSub}` }
      });

      return sendJson(res, 201, { message: 'Motivation créée avec succès.', id });
    }

    // Modifier une motivation
    const editStoryMatch = pathname.match(/^\/api\/admin\/stories\/([a-zA-Z0-9_-]+)$/);
    if (editStoryMatch && method === 'PUT') {
      const storyId = editStoryMatch[1];
      const body = await readJsonBody(req);
      const now = new Date().toISOString();

      const existing = db.prepare('SELECT id FROM stories WHERE id = ?').get(storyId);
      if (!existing) return sendJson(res, 404, { error: 'Motivation non trouvée.' });

      db.prepare(`
        UPDATE stories SET
          theme = ?, category = ?, title_main = ?, title_sub = ?,
          hook_icon = ?, hook_text = ?, subhook_icon = ?, subhook_text = ?,
          truth_title = ?, truth_text = ?, truth_highlight = ?,
          story_icon = ?, parable_title = ?, story = ?, punchline = ?,
          takeaways_json = ?, accent_color = ?, is_published = ?, is_featured = ?,
          updated_at = ?
        WHERE id = ?
      `).run(
        body.theme,
        body.category,
        body.titleMain?.toUpperCase(),
        body.titleSub?.toUpperCase(),
        body.hookIcon,
        body.hookText,
        body.subhookIcon,
        body.subhookText,
        body.truthTitle,
        body.truthText,
        body.truthHighlight,
        body.storyIcon,
        body.parableTitle,
        body.story,
        body.punchline?.toUpperCase(),
        JSON.stringify(body.takeaways || []),
        body.accentColor,
        body.isPublished ? 1 : 0,
        body.isFeatured ? 1 : 0,
        now,
        storyId
      );

      logAdminAction({
        adminId: currentUser.id,
        adminEmail: currentUser.email,
        action: 'UPDATE_STORY',
        targetType: 'STORY',
        targetId: storyId,
        details: { title: `${body.titleMain} ${body.titleSub}` }
      });

      return sendJson(res, 200, { message: 'Motivation mise à jour.' });
    }

    // Supprimer une motivation
    if (editStoryMatch && method === 'DELETE') {
      const storyId = editStoryMatch[1];
      const story = db.prepare('SELECT title_main, title_sub FROM stories WHERE id = ?').get(storyId);
      if (!story) return sendJson(res, 404, { error: 'Motivation non trouvée.' });

      db.prepare('DELETE FROM stories WHERE id = ?').run(storyId);

      logAdminAction({
        adminId: currentUser.id,
        adminEmail: currentUser.email,
        action: 'DELETE_STORY',
        targetType: 'STORY',
        targetId: storyId,
        details: { title: `${story.title_main} ${story.title_sub}` }
      });

      return sendJson(res, 200, { message: 'Motivation supprimée définitivement.' });
    }

    // Basculer la publication (Publier / Dépublier)
    const togglePublishMatch = pathname.match(/^\/api\/admin\/stories\/([a-zA-Z0-9_-]+)\/publish$/);
    if (togglePublishMatch && method === 'PATCH') {
      const storyId = togglePublishMatch[1];
      const story = db.prepare('SELECT is_published, title_main FROM stories WHERE id = ?').get(storyId);
      if (!story) return sendJson(res, 404, { error: 'Motivation non trouvée.' });

      const newStatus = story.is_published ? 0 : 1;
      db.prepare('UPDATE stories SET is_published = ?, updated_at = ? WHERE id = ?').run(newStatus, new Date().toISOString(), storyId);

      logAdminAction({
        adminId: currentUser.id,
        adminEmail: currentUser.email,
        action: newStatus ? 'PUBLISH_STORY' : 'UNPUBLISH_STORY',
        targetType: 'STORY',
        targetId: storyId,
        details: { title: story.title_main, isPublished: !!newStatus }
      });

      return sendJson(res, 200, { isPublished: !!newStatus });
    }

    // Basculer la mise en avant (Feature / Unfeature)
    const toggleFeatureMatch = pathname.match(/^\/api\/admin\/stories\/([a-zA-Z0-9_-]+)\/feature$/);
    if (toggleFeatureMatch && method === 'PATCH') {
      const storyId = toggleFeatureMatch[1];
      const story = db.prepare('SELECT is_featured, title_main FROM stories WHERE id = ?').get(storyId);
      if (!story) return sendJson(res, 404, { error: 'Motivation non trouvée.' });

      const newStatus = story.is_featured ? 0 : 1;
      db.prepare('UPDATE stories SET is_featured = ?, updated_at = ? WHERE id = ?').run(newStatus, new Date().toISOString(), storyId);

      logAdminAction({
        adminId: currentUser.id,
        adminEmail: currentUser.email,
        action: newStatus ? 'FEATURE_STORY' : 'UNFEATURE_STORY',
        targetType: 'STORY',
        targetId: storyId,
        details: { title: story.title_main, isFeatured: !!newStatus }
      });

      return sendJson(res, 200, { isFeatured: !!newStatus });
    }

    // Gestion des Catégories (CRUD)
    if (pathname === '/api/admin/categories' && method === 'GET') {
      const categories = db.prepare('SELECT * FROM categories ORDER BY name ASC').all();
      return sendJson(res, 200, { categories });
    }

    if (pathname === '/api/admin/categories' && method === 'POST') {
      const body = await readJsonBody(req);
      if (!body.name) return sendJson(res, 400, { error: 'Le nom de la catégorie est requis.' });

      const id = `cat-${Date.now()}`;
      const slug = body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const now = new Date().toISOString();

      try {
        db.prepare('INSERT INTO categories (id, name, slug, description, created_at) VALUES (?, ?, ?, ?, ?)').run(
          id, body.name.trim(), slug, body.description || '', now
        );
        logAdminAction({
          adminId: currentUser.id,
          adminEmail: currentUser.email,
          action: 'CREATE_CATEGORY',
          targetType: 'CATEGORY',
          targetId: id,
          details: { name: body.name }
        });
        return sendJson(res, 201, { message: 'Catégorie créée.', id, slug });
      } catch (err) {
        return sendJson(res, 409, { error: 'Une catégorie portant ce nom existe déjà.' });
      }
    }

    // Gestion des Utilisateurs
    if (pathname === '/api/admin/users' && method === 'GET') {
      const users = db.prepare(`
        SELECT id, email, name, role, status, created_at as createdAt, updated_at as updatedAt
        FROM users
        ORDER BY created_at DESC
      `).all();

      return sendJson(res, 200, { users });
    }

    // Suspendre ou réactiver un compte utilisateur
    const userStatusMatch = pathname.match(/^\/api\/admin\/users\/([a-zA-Z0-9_-]+)\/status$/);
    if (userStatusMatch && method === 'PATCH') {
      const targetUserId = userStatusMatch[1];
      const body = await readJsonBody(req);
      const newStatus = body.status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE';

      // Empêcher l'administrateur de se suspendre lui-même
      if (targetUserId === currentUser.id) {
        return sendJson(res, 400, { error: 'Vous ne pouvez pas suspendre votre propre compte administrateur.' });
      }

      const targetUser = db.prepare('SELECT email, role FROM users WHERE id = ?').get(targetUserId);
      if (!targetUser) return sendJson(res, 404, { error: 'Utilisateur non trouvé.' });

      db.prepare('UPDATE users SET status = ?, updated_at = ? WHERE id = ?').run(newStatus, new Date().toISOString(), targetUserId);

      // Si suspendu, révoque immédiatement toutes ses sessions actives
      if (newStatus === 'SUSPENDED') {
        db.prepare('DELETE FROM sessions WHERE user_id = ?').run(targetUserId);
      }

      logAdminAction({
        adminId: currentUser.id,
        adminEmail: currentUser.email,
        action: newStatus === 'SUSPENDED' ? 'SUSPEND_USER' : 'REACTIVATE_USER',
        targetType: 'USER',
        targetId: targetUserId,
        details: { targetEmail: targetUser.email, status: newStatus }
      });

      return sendJson(res, 200, { message: `Statut mis à jour : ${newStatus}`, status: newStatus });
    }

    // Logs d'audit
    if (pathname === '/api/admin/audit-logs' && method === 'GET') {
      const logs = getAuditLogs(50);
      return sendJson(res, 200, { logs });
    }

    // Sauvegarde complète de la base de données
    if (pathname === '/api/admin/backup' && method === 'GET') {
      const stories = db.prepare('SELECT * FROM stories').all();
      const categories = db.prepare('SELECT * FROM categories').all();
      const users = db.prepare('SELECT id, email, name, role, status, created_at FROM users').all();
      const eventsCount = db.prepare('SELECT COUNT(*) as c FROM analytics_events').get().c;
      const auditLogs = getAuditLogs(100);

      const backup = {
        platform: 'CHIDRA MINDSET',
        version: '2.0-PRO',
        exportDate: new Date().toISOString(),
        exportedBy: currentUser.email,
        totalEventsCount: eventsCount,
        users,
        categories,
        stories: stories.map(s => ({
          ...s,
          takeaways: JSON.parse(s.takeaways_json || '[]')
        })),
        auditLogs
      };

      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename=chidra-mindset-backup-${new Date().toISOString().slice(0, 10)}.json`
      });
      return res.end(JSON.stringify(backup, null, 2));
    }
  }

  // 404 pour route non trouvée
  return sendJson(res, 404, { error: 'Route API non trouvée.' });

  } catch (err) {
    // ✅ GESTIONNAIRE D'ERREURS GLOBAL — évite les connexions suspendues
    // Ne jamais logger des données sensibles (mots de passe, tokens)
    console.error('[API ERROR]', err.message);
    if (!res.headersSent) {
      sendJson(res, 500, { error: 'Une erreur interne est survenue. Veuillez réessayer.' });
    }
  }
}
