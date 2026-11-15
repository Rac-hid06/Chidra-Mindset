import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { X, Heart, User, LogOut, Download, Sparkles, ExternalLink } from 'lucide-react';

export default function UserSpace({ isOpen, onClose, user, onLogout, onSelectStory }) {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && user) {
      loadFavorites();
    }
  }, [isOpen, user]);

  const loadFavorites = async () => {
    setLoading(true);
    try {
      const res = await api.user.getFavorites();
      setFavorites(res.favorites || []);
    } catch (err) {
      console.error('Erreur chargement favoris :', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container max-w-lg border-amber-500/40">
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <span className="text-xl">👤</span>
            <div>
              <h3 className="font-black uppercase text-amber-400 tracking-wide text-sm">
                Espace Personnel Chidra
              </h3>
              <p className="text-[11px] text-neutral-400">{user.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="close-modal-btn">
            <X size={18} />
          </button>
        </div>

        {/* Carte Profil */}
        <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 mb-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-extrabold text-white">{user.name}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-wider border border-amber-500/30">
                Membre Chidra
              </span>
              <span className="text-[11px] text-neutral-500">
                Inscrit le {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Récemment'}
              </span>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500 text-red-400 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5"
            title="Se déconnecter"
          >
            <LogOut size={13} />
            <span>Déconnexion</span>
          </button>
        </div>

        {/* Section Favoris */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
              <Heart size={14} className="text-red-500 fill-current" />
              <span>Mes Motivations Favorites ({favorites.length})</span>
            </h4>
          </div>

          {loading ? (
            <div className="text-center py-8 text-neutral-500 text-xs">
              Chargement de vos favoris...
            </div>
          ) : favorites.length === 0 ? (
            <div className="text-center py-8 px-4 rounded-xl bg-neutral-950/60 border border-neutral-800/80 text-neutral-400 text-xs">
              <Heart size={24} className="mx-auto mb-2 text-neutral-600" />
              <p>Vous n'avez pas encore de motivations en favoris.</p>
              <p className="text-[11px] text-neutral-500 mt-1">
                Cliquez sur le cœur d'une motivation pour la retrouver ici à tout moment.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {favorites.map((fav) => (
                <div
                  key={fav.id}
                  onClick={() => {
                    onSelectStory(fav);
                    onClose();
                  }}
                  className="p-3 rounded-xl bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 hover:border-amber-500/40 cursor-pointer transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{fav.storyIcon || '🥥'}</span>
                    <div>
                      <div className="text-xs font-bold text-white">
                        {fav.titleMain} {fav.titleSub}
                      </div>
                      <div className="text-[10px] text-amber-400 font-semibold uppercase">
                        {fav.theme}
                      </div>
                    </div>
                  </div>
                  <span className="text-neutral-500 hover:text-amber-400 text-xs font-bold">
                    Voir ➔
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-neutral-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-bold"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
