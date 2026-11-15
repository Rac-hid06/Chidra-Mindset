// Service de Persistance Locale & Synchronisation Cloud pour Chidra Mindset 🧠

const STORAGE_KEY_STORIES = 'chidra_stories_db';
const STORAGE_KEY_LIKES = 'chidra_likes_db';
const STORAGE_KEY_USER_LIKES = 'chidra_user_likes_db';
const STORAGE_KEY_ADMIN = 'chidra_admin_auth';

export const storage = {
  // Sauvegarder l'ensemble des histoires
  saveStories: (stories) => {
    try {
      localStorage.setItem(STORAGE_KEY_STORIES, JSON.stringify(stories));
    } catch (e) {
      console.error('Erreur sauvegarde stories :', e);
    }
  },

  // Charger les histoires sauvegardées
  loadStories: (defaults = []) => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_STORIES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Erreur chargement stories :', e);
    }
    return defaults;
  },

  // Sauvegarder les likes globaux
  saveLikes: (likes) => {
    try {
      localStorage.setItem(STORAGE_KEY_LIKES, JSON.stringify(likes));
    } catch (e) {}
  },

  loadLikes: (defaults = {}) => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LIKES);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return defaults;
  },

  // Sauvegarder les likes de l'utilisateur
  saveUserLikes: (userLikes) => {
    try {
      localStorage.setItem(STORAGE_KEY_USER_LIKES, JSON.stringify(userLikes));
    } catch (e) {}
  },

  loadUserLikes: () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USER_LIKES);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {};
  },

  // Authentification Admin
  isAdmin: () => {
    return localStorage.getItem(STORAGE_KEY_ADMIN) === 'true';
  },

  setAdmin: (status) => {
    if (status) {
      localStorage.setItem(STORAGE_KEY_ADMIN, 'true');
    } else {
      localStorage.removeItem(STORAGE_KEY_ADMIN);
    }
  },

  // Export de sauvegarde (Télécharger toute la base de données en JSON)
  exportBackup: (stories, likes) => {
    const backupData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      stories,
      likes
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chidra-mindset-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
};
