import crypto from 'node:crypto';
import { db } from './db.js';

/**
 * Enregistre un événement avec déduplication intelligente
 */
export function recordEvent({ eventType, storyId = null, visitorId, sessionId, userId = null, metadata = {} }) {
  if (!eventType || !visitorId || !sessionId) return false;

  const now = new Date();
  const nowIso = now.toISOString();

  // 1. Déduplication pour 'page_view' : max 1 par session toutes les 10 minutes
  if (eventType === 'page_view') {
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
    const existing = db.prepare(`
      SELECT id FROM analytics_events
      WHERE event_type = 'page_view'
        AND session_id = ?
        AND created_at >= ?
      LIMIT 1
    `).get(sessionId, tenMinutesAgo);

    if (existing) return false; // Ignoré car déjà comptabilisé récemment
  }

  // 2. Déduplication pour 'story_view' : max 1 vue par visiteur pour la même histoire toutes les 5 minutes
  if (eventType === 'story_view' && storyId) {
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    const existing = db.prepare(`
      SELECT id FROM analytics_events
      WHERE event_type = 'story_view'
        AND story_id = ?
        AND visitor_id = ?
        AND created_at >= ?
      LIMIT 1
    `).get(storyId, visitorId, fiveMinutesAgo);

    if (existing) return false;

    // Incrémente le compteur officiel dans la table stories
    db.prepare('UPDATE stories SET views_count = views_count + 1 WHERE id = ?').run(storyId);
  }

  // 3. Téléchargement réel (download) : incrémente le compteur officiel
  if (eventType === 'download' && storyId) {
    db.prepare('UPDATE stories SET downloads_count = downloads_count + 1 WHERE id = ?').run(storyId);
  }

  // Enregistrement dans la table d'événements
  const eventId = `evt-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  db.prepare(`
    INSERT INTO analytics_events (
      id, event_type, story_id, visitor_id, session_id, user_id, metadata_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    eventId,
    eventType,
    storyId,
    visitorId,
    sessionId,
    userId,
    JSON.stringify(metadata),
    nowIso
  );

  return true;
}

/**
 * Calcule les statistiques et métriques réelles pour le tableau de bord
 * @param {string} period - '7d', '30d', 'all'
 */
export function getAnalyticsSummary(period = '30d') {
  let dateFilter = '';
  const now = new Date();

  if (period === '7d') {
    const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    dateFilter = `WHERE created_at >= '${d.toISOString()}'`;
  } else if (period === '30d') {
    const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    dateFilter = `WHERE created_at >= '${d.toISOString()}'`;
  }

  // 1. Indicateurs Globaux Réels
  const pageViews = db.prepare(`SELECT COUNT(*) as c FROM analytics_events ${dateFilter ? dateFilter + ' AND' : 'WHERE'} event_type = 'page_view'`).get().c;
  const storyViews = db.prepare(`SELECT COUNT(*) as c FROM analytics_events ${dateFilter ? dateFilter + ' AND' : 'WHERE'} event_type = 'story_view'`).get().c;
  const uniqueVisitors = db.prepare(`SELECT COUNT(DISTINCT visitor_id) as c FROM analytics_events ${dateFilter}`).get().c;
  const visits = db.prepare(`SELECT COUNT(DISTINCT session_id) as c FROM analytics_events ${dateFilter}`).get().c;
  const downloads = db.prepare(`SELECT COUNT(*) as c FROM analytics_events ${dateFilter ? dateFilter + ' AND' : 'WHERE'} event_type = 'download'`).get().c;
  const likes = db.prepare(`SELECT COUNT(*) as c FROM analytics_events ${dateFilter ? dateFilter + ' AND' : 'WHERE'} event_type = 'like'`).get().c;
  const searches = db.prepare(`SELECT COUNT(*) as c FROM analytics_events ${dateFilter ? dateFilter + ' AND' : 'WHERE'} event_type = 'search'`).get().c;
  const shares = db.prepare(`SELECT COUNT(*) as c FROM analytics_events ${dateFilter ? dateFilter + ' AND' : 'WHERE'} event_type = 'share'`).get().c;
  const totalInteractions = downloads + likes + searches + shares;

  // 2. Nombre total d'utilisateurs inscrits
  const usersCount = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'USER'").get().c;

  // 3. Motivations les plus consultées
  const topViewed = db.prepare(`
    SELECT s.id, s.title_main, s.title_sub, s.theme, s.story_icon, COUNT(e.id) as real_views
    FROM analytics_events e
    JOIN stories s ON e.story_id = s.id
    ${dateFilter ? dateFilter + ' AND' : 'WHERE'} e.event_type = 'story_view'
    GROUP BY s.id
    ORDER BY real_views DESC
    LIMIT 5
  `).all();

  // 4. Motivations les plus téléchargées
  const topDownloaded = db.prepare(`
    SELECT s.id, s.title_main, s.title_sub, s.theme, s.story_icon, COUNT(e.id) as real_downloads
    FROM analytics_events e
    JOIN stories s ON e.story_id = s.id
    ${dateFilter ? dateFilter + ' AND' : 'WHERE'} e.event_type = 'download'
    GROUP BY s.id
    ORDER BY real_downloads DESC
    LIMIT 5
  `).all();

  // 5. Évolution du trafic par jour (Timeline)
  const timelineQuery = `
    SELECT 
      substr(created_at, 1, 10) as date_day,
      SUM(CASE WHEN event_type = 'page_view' THEN 1 ELSE 0 END) as views,
      SUM(CASE WHEN event_type = 'download' THEN 1 ELSE 0 END) as downloads,
      COUNT(DISTINCT visitor_id) as visitors
    FROM analytics_events
    ${dateFilter}
    GROUP BY date_day
    ORDER BY date_day ASC
  `;
  const timeline = db.prepare(timelineQuery).all();

  return {
    period,
    metrics: {
      totalViews: pageViews + storyViews,
      pageViews,
      storyViews,
      uniqueVisitors,
      visits,
      totalDownloads: downloads,
      totalLikes: likes,
      totalInteractions,
      registeredUsers: usersCount
    },
    topViewed,
    topDownloaded,
    timeline
  };
}
