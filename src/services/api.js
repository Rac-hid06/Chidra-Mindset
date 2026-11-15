// Client API Chidra Mindset 🧠 - Connexion Backend Sécurisée

// Gestion des identifiants anonymes pour le tracking analytics
function getOrCreateVisitorId() {
  let vid = localStorage.getItem('chidra_visitor_id');
  if (!vid) {
    vid = 'vis_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
    localStorage.setItem('chidra_visitor_id', vid);
  }
  return vid;
}

function getOrCreateSessionId() {
  let sid = sessionStorage.getItem('chidra_session_id');
  if (!sid) {
    sid = 'ses_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
    sessionStorage.setItem('chidra_session_id', sid);
  }
  return sid;
}

export const visitorId = getOrCreateVisitorId();
export const sessionId = getOrCreateSessionId();

let authToken = localStorage.getItem('chidra_auth_token') || null;

export function setAuthToken(token) {
  authToken = token;
  if (token) {
    localStorage.setItem('chidra_auth_token', token);
  } else {
    localStorage.removeItem('chidra_auth_token');
  }
}

export function getAuthToken() {
  return authToken;
}

// Fonction utilitaire fetch
async function request(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const res = await fetch(endpoint, {
    ...options,
    headers
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Erreur requête ${res.status}`);
  }

  return data;
}

export const api = {
  // 1. Authentification
  auth: {
    login: async (email, password) => {
      const data = await request('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      if (data.token) setAuthToken(data.token);
      return data;
    },
    register: async (name, email, password) => {
      const data = await request('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password })
      });
      if (data.token) setAuthToken(data.token);
      return data;
    },
    logout: async () => {
      try {
        await request('/api/auth/logout', { method: 'POST' });
      } finally {
        setAuthToken(null);
      }
    },
    me: async () => {
      if (!authToken) return null;
      try {
        const data = await request('/api/auth/me');
        return data.user;
      } catch (e) {
        setAuthToken(null);
        return null;
      }
    }
  },

  // 2. Motivations Publiques
  stories: {
    list: async (params = {}) => {
      const q = new URLSearchParams();
      if (params.search) q.set('search', params.search);
      if (params.category) q.set('category', params.category);
      const url = `/api/stories${q.toString() ? '?' + q.toString() : ''}`;
      return request(url);
    },
    like: async (storyId, likeStatus = true) => {
      return request(`/api/stories/${storyId}/like`, {
        method: 'POST',
        body: JSON.stringify({
          like: likeStatus,
          visitorId,
          sessionId
        })
      });
    },
    getCategories: async () => {
      return request('/api/categories');
    }
  },

  // 3. Espace Utilisateur
  user: {
    getFavorites: async () => {
      return request('/api/user/favorites');
    }
  },

  // 4. Analytics Public
  analytics: {
    track: async (eventType, storyId = null, metadata = {}) => {
      try {
        return await request('/api/analytics/track', {
          method: 'POST',
          body: JSON.stringify({
            eventType,
            storyId,
            visitorId,
            sessionId,
            metadata
          })
        });
      } catch (e) {
        return { tracked: false };
      }
    }
  },

  // 5. Back-Office Administrateur
  admin: {
    getAnalytics: async (period = '30d') => {
      return request(`/api/admin/analytics?period=${period}`);
    },
    getStories: async () => {
      return request('/api/admin/stories');
    },
    createStory: async (storyData) => {
      return request('/api/admin/stories', {
        method: 'POST',
        body: JSON.stringify(storyData)
      });
    },
    updateStory: async (id, storyData) => {
      return request(`/api/admin/stories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(storyData)
      });
    },
    deleteStory: async (id) => {
      return request(`/api/admin/stories/${id}`, {
        method: 'DELETE'
      });
    },
    togglePublish: async (id) => {
      return request(`/api/admin/stories/${id}/publish`, {
        method: 'PATCH'
      });
    },
    toggleFeature: async (id) => {
      return request(`/api/admin/stories/${id}/feature`, {
        method: 'PATCH'
      });
    },
    getCategories: async () => {
      return request('/api/admin/categories');
    },
    createCategory: async (categoryData) => {
      return request('/api/admin/categories', {
        method: 'POST',
        body: JSON.stringify(categoryData)
      });
    },
    getUsers: async () => {
      return request('/api/admin/users');
    },
    setUserStatus: async (userId, status) => {
      return request(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
    },
    getAuditLogs: async () => {
      return request('/api/admin/audit-logs');
    },
    downloadBackup: async () => {
      const res = await fetch('/api/admin/backup', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (!res.ok) throw new Error('Échec du téléchargement du backup');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chidra-mindset-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }
};
