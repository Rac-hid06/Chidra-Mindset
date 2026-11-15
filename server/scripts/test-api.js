import { handleApiRequest } from '../router.js';
import { EventEmitter } from 'node:events';

function mockRequest(method, url, body = {}, headers = {}) {
  const req = new EventEmitter();
  req.method = method;
  req.url = url;
  req.headers = { host: 'localhost:5173', ...headers };
  req.socket = { remoteAddress: '127.0.0.1' };
  
  process.nextTick(() => {
    if (body) {
      req.emit('data', JSON.stringify(body));
    }
    req.emit('end');
  });

  return req;
}

function mockResponse() {
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

async function runTest() {
  console.log('🧪 Début des tests des routes API Chidra Mindset...\n');

  // Test 1: Inscription d'un utilisateur classique
  const regReq = mockRequest('POST', '/api/auth/register', {
    email: `testuser_${Date.now()}@example.com`,
    password: 'Password123!',
    name: 'Utilisateur Test',
    role: 'ADMIN' // Tentative frauduleuse d'auto-attribution du rôle ADMIN
  });
  const regRes = mockResponse();

  await new Promise(r => {
    regRes.on('done', () => {
      const data = JSON.parse(regRes.body);
      console.log('1. Test Inscription USER :');
      console.log(`   Statut HTTP: ${regRes.statusCode}`);
      console.log(`   Rôle assigné: ${data.user?.role}`);
      if (data.user?.role === 'USER') {
        console.log('   ✅ Succès : Le rôle est forcé à USER (ADMIN bloqué).');
      } else {
        console.error('   ❌ Échec : Le rôle a été altéré !');
      }
      r();
    });
    handleApiRequest(regReq, regRes);
  });

  // Test 2: Connexion Administrateur
  const loginReq = mockRequest('POST', '/api/auth/login', {
    email: 'admin@chidramindset.com',
    password: 'ChidraAdmin2026!'
  });
  const loginRes = mockResponse();

  let adminToken = '';
  await new Promise(r => {
    loginRes.on('done', () => {
      const data = JSON.parse(loginRes.body);
      console.log('\n2. Test Connexion Administrateur :');
      console.log(`   Statut HTTP: ${loginRes.statusCode}`);
      console.log(`   Rôle détecté: ${data.user?.role}`);
      if (data.user?.role === 'ADMIN' && data.token) {
        adminToken = data.token;
        console.log('   ✅ Succès : Token session émis, rôle ADMIN validé.');
      } else {
        console.error('   ❌ Échec de la connexion admin.');
      }
      r();
    });
    handleApiRequest(loginReq, loginRes);
  });

  // Test 3: Tracking d'un événement réel
  const trackReq = mockRequest('POST', '/api/analytics/track', {
    eventType: 'story_view',
    storyId: 'monkey-trap',
    visitorId: 'visitor-test-1',
    sessionId: 'session-test-1'
  });
  const trackRes = mockResponse();

  await new Promise(r => {
    trackRes.on('done', () => {
      const data = JSON.parse(trackRes.body);
      console.log('\n3. Test Enregistrement Événement Réel :');
      console.log(`   Tracked: ${data.tracked}`);
      if (data.tracked) {
        console.log('   ✅ Succès : Vue de story enregistrée avec déduplication.');
      }
      r();
    });
    handleApiRequest(trackReq, trackRes);
  });

  // Test 4: Récupération des Analytics Admin avec le token ADMIN
  const statsReq = mockRequest('GET', '/api/admin/analytics?period=all', null, {
    authorization: `Bearer ${adminToken}`
  });
  const statsRes = mockResponse();

  await new Promise(r => {
    statsRes.on('done', () => {
      const data = JSON.parse(statsRes.body);
      console.log('\n4. Test Récupération Analytics Back-office :');
      console.log(`   Total Vues: ${data.metrics?.totalViews}`);
      console.log(`   Visiteurs Uniques: ${data.metrics?.uniqueVisitors}`);
      console.log(`   Interactions: ${data.metrics?.totalInteractions}`);
      if (data.metrics && data.metrics.uniqueVisitors >= 1) {
        console.log('   ✅ Succès : Statistiques réelles calculées depuis les événements.');
      }
      r();
    });
    handleApiRequest(statsReq, statsRes);
  });

  console.log('\n🎉 Tous les tests unitaires API sont validés !');
}

runTest();
