import { handleApiRequest } from '../router.js';
import { db } from '../db.js';
import { EventEmitter } from 'node:events';

function mockReq(method, url, body = {}, headers = {}) {
  const req = new EventEmitter();
  req.method = method;
  req.url = url;
  req.headers = { host: 'localhost:5173', ...headers };
  req.socket = { remoteAddress: '127.0.0.1' };
  
  process.nextTick(() => {
    if (body) req.emit('data', JSON.stringify(body));
    req.emit('end');
  });
  return req;
}

function mockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: '',
    writeHead(code, headers = {}) {
      this.statusCode = code;
      this.headers = headers;
    },
    end(data) {
      if (data) this.body = data;
      this.emit('done');
    }
  };
  Object.setPrototypeOf(res, EventEmitter.prototype);
  return res;
}

function callApi(method, url, body = null, headers = {}) {
  return new Promise((resolve) => {
    const req = mockReq(method, url, body, headers);
    const res = mockRes();
    res.on('done', () => {
      let parsed = {};
      try { parsed = JSON.parse(res.body); } catch(e) {}
      resolve({ status: res.statusCode, data: parsed });
    });
    handleApiRequest(req, res);
  });
}

async function runE2ETests() {
  console.log('====================================================');
  console.log('🧪 SUITE DE TESTS END-TO-END : CHIDRA MINDSET PRO');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Inscription utilisateur classique
  console.log('TEST 1: Inscription et Sécurité des Rôles');
  const userEmail = `user_e2e_${Date.now()}@example.com`;
  const regRes = await callApi('POST', '/api/auth/register', {
    name: 'Jean Testeur',
    email: userEmail,
    password: 'Password123!',
    role: 'ADMIN' // Tentative de contournement
  });
  assert(regRes.status === 201, 'Inscription réussie avec code 201');
  assert(regRes.data.user?.role === 'USER', 'Rôle forcé à USER (ADMIN rejeté)');
  const userToken = regRes.data.token;

  // 2. Blocage d'accès Back-Office pour un utilisateur USER
  console.log('\nTEST 2: Protection des Routes Back-Office');
  const forbiddenRes = await callApi('GET', '/api/admin/analytics', null, {
    authorization: `Bearer ${userToken}`
  });
  assert(forbiddenRes.status === 403, 'Accès /api/admin/* bloqué pour rôle USER (Code 403)');

  // 3. Connexion Administrateur
  console.log('\nTEST 3: Authentification Administrateur');
  const adminLoginRes = await callApi('POST', '/api/auth/login', {
    email: 'admin@chidramindset.com',
    password: 'ChidraAdmin2026!'
  });
  assert(adminLoginRes.status === 200, 'Connexion Administrateur réussie (Code 200)');
  assert(adminLoginRes.data.user?.role === 'ADMIN', 'Détection automatique du rôle ADMIN');
  const adminToken = adminLoginRes.data.token;

  // 4. CRUD Back-Office - Création d'une motivation
  console.log('\nTEST 4: CRUD Administrateur (Création)');
  const testStoryId = `story-e2e-${Date.now()}`;
  const createRes = await callApi('POST', '/api/admin/stories', {
    id: testStoryId,
    theme: 'COURAGE & AUDACE',
    category: 'Force Mentale',
    titleMain: 'L ENVOL DU',
    titleSub: 'FAUCON PÈLERIN',
    hookIcon: '🦅',
    hookText: 'Tu as peur de te lancer par peur du vide.',
    subhookIcon: '🪨',
    subhookText: 'Rester au bord de la falaise ne te protège pas de la faim.',
    truthTitle: 'CONNAIS-TU CETTE VÉRITÉ ?',
    truthText: 'Le vent qui semble violent...',
    truthHighlight: '➔ Est ce qui permet de déployer tes ailes.',
    storyIcon: '🪶',
    parableTitle: 'Le jeune faucon',
    story: 'Le faucon attendait au bord du nid. Sa mère le poussa dans le vide. En chutant, ses ailes s ouvrirent pour la première fois.',
    punchline: 'LA PEUR DISPARAÎT DÈS QUE TES AILES PORTENT TON POIDS.',
    takeaways: ['Fais le premier pas', 'Fais confiance à ta force', 'Le vide n est qu une illusion'],
    accentColor: '#F59E0B',
    isPublished: true,
    isFeatured: true
  }, { authorization: `Bearer ${adminToken}` });
  assert(createRes.status === 201, 'Motivation créée dans la base avec code 201');

  // 5. CRUD Back-Office - Modification
  console.log('\nTEST 5: CRUD Administrateur (Modification)');
  const updateRes = await callApi('PUT', `/api/admin/stories/${testStoryId}`, {
    theme: 'AUDACE ABSOLUE',
    category: 'Force Mentale',
    titleMain: 'L ENVOL DU',
    titleSub: 'FAUCON ROYAL',
    hookIcon: '🦅',
    hookText: 'Tu as peur de te lancer.',
    subhookIcon: '🪨',
    subhookText: 'Rester au bord te paralyse.',
    truthTitle: 'CONNAIS-TU CETTE VÉRITÉ ?',
    truthText: 'Le vent violent te porte.',
    truthHighlight: '➔ Déploie tes ailes.',
    storyIcon: '🪶',
    parableTitle: 'Le jeune faucon royal',
    story: 'Récit mis à jour...',
    punchline: 'VOLE PLUS HAUT QUE TES DOUTES.',
    takeaways: ['Agis', 'Vole', 'Persévère'],
    accentColor: '#10B981',
    isPublished: true,
    isFeatured: false
  }, { authorization: `Bearer ${adminToken}` });
  assert(updateRes.status === 200, 'Motivation modifiée dans la base avec code 200');

  // 6. Publication / Dépublication
  console.log('\nTEST 6: Publication / Dépublication');
  const unpublishRes = await callApi('PATCH', `/api/admin/stories/${testStoryId}/publish`, null, {
    authorization: `Bearer ${adminToken}`
  });
  assert(unpublishRes.data.isPublished === false, 'Motivation dépubliée');

  const republishRes = await callApi('PATCH', `/api/admin/stories/${testStoryId}/publish`, null, {
    authorization: `Bearer ${adminToken}`
  });
  assert(republishRes.data.isPublished === true, 'Motivation republiée');

  // 7. Enregistrement Analytics Réel (Vue & Téléchargement)
  console.log('\nTEST 7: Tracking Réel des Événements Analytics');
  const viewRes = await callApi('POST', '/api/analytics/track', {
    eventType: 'story_view',
    storyId: testStoryId,
    visitorId: 'vis-e2e-user',
    sessionId: 'ses-e2e-1'
  });
  assert(viewRes.status === 200, 'Événement de consultation enregistré');

  const downloadRes = await callApi('POST', '/api/analytics/track', {
    eventType: 'download',
    storyId: testStoryId,
    visitorId: 'vis-e2e-user',
    sessionId: 'ses-e2e-1'
  });
  assert(downloadRes.status === 200, 'Événement de téléchargement enregistré');

  // 8. Vérification des Analytics Réels
  console.log('\nTEST 8: Calcul des Métriques Réelles');
  const analyticsRes = await callApi('GET', '/api/admin/analytics?period=all', null, {
    authorization: `Bearer ${adminToken}`
  });
  assert(analyticsRes.data.metrics?.totalDownloads >= 1, 'Téléchargements comptabilisés réellement');
  assert(analyticsRes.data.metrics?.uniqueVisitors >= 1, 'Visiteurs uniques dédupliqués');
  assert(analyticsRes.data.metrics?.registeredUsers >= 1, 'Nombre d utilisateurs inscrits exact');

  // 9. Gestion des Utilisateurs - Suspension & Réactivation
  console.log('\nTEST 9: Gestion des Utilisateurs (Suspension / Réactivation)');
  const targetUserId = regRes.data.user.id;
  const suspendRes = await callApi('PATCH', `/api/admin/users/${targetUserId}/status`, {
    status: 'SUSPENDED'
  }, { authorization: `Bearer ${adminToken}` });
  assert(suspendRes.data.status === 'SUSPENDED', 'Utilisateur suspendu avec succès');

  // Vérifier qu'un utilisateur suspendu est rejeté
  const checkSuspended = await callApi('GET', '/api/auth/me', null, {
    authorization: `Bearer ${userToken}`
  });
  assert(checkSuspended.status === 401 || checkSuspended.status === 403, 'Session rejetée pour utilisateur suspendu (Code 401/403)');

  // Réactivation
  const reactivateRes = await callApi('PATCH', `/api/admin/users/${targetUserId}/status`, {
    status: 'ACTIVE'
  }, { authorization: `Bearer ${adminToken}` });
  assert(reactivateRes.data.status === 'ACTIVE', 'Utilisateur réactivé avec succès');

  // 10. CRUD - Suppression après confirmation
  console.log('\nTEST 10: Suppression Définitive');
  const deleteRes = await callApi('DELETE', `/api/admin/stories/${testStoryId}`, null, {
    authorization: `Bearer ${adminToken}`
  });
  assert(deleteRes.status === 200, 'Motivation supprimée définitivement');

  // 11. Journal d'Audit
  console.log('\nTEST 11: Journal d Audit');
  const auditRes = await callApi('GET', '/api/admin/audit-logs', null, {
    authorization: `Bearer ${adminToken}`
  });
  assert(auditRes.data.logs?.length > 0, 'Traces d audit enregistrées pour chaque action');

  console.log('\n====================================================');
  console.log(`RÉSULTAT DES TESTS : ${passed} passés, ${failed} échoués`);
  console.log('====================================================\n');
}

runE2ETests();
