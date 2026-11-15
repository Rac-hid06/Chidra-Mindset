import { useState } from 'react';
import { api } from '../services/api';
import { X, Lock, Mail, User, Shield, AlertCircle, ArrowRight } from 'lucide-react';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [tab, setTab] = useState('login'); // 'login' ou 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (tab === 'login') {
        const res = await api.auth.login(email, password);
        onAuthSuccess(res.user);
        onClose();
      } else {
        const res = await api.auth.register(name, email, password);
        onAuthSuccess(res.user);
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container max-w-sm border-amber-500/40">
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <span className="text-xl">🧠</span>
            <div>
              <h3 className="font-black uppercase text-amber-400 tracking-wide text-sm">
                {tab === 'login' ? 'Espace Connexion' : 'Créer un Compte'}
              </h3>
              <p className="text-[11px] text-neutral-400">Chidra Mindset • Accès Sécurisé</p>
            </div>
          </div>
          <button onClick={onClose} className="close-modal-btn">
            <X size={18} />
          </button>
        </div>

        {/* Onglets Connexion / Inscription */}
        <div className="flex rounded-xl bg-neutral-950 p-1 border border-neutral-800 mb-4">
          <button
            type="button"
            onClick={() => { setTab('login'); setError(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              tab === 'login' ? 'bg-amber-500 text-black shadow-md' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Se Connecter
          </button>
          <button
            type="button"
            onClick={() => { setTab('register'); setError(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              tab === 'register' ? 'bg-amber-500 text-black shadow-md' : 'text-neutral-400 hover:text-white'
            }`}
          >
            S'Inscrire
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2 text-red-400 text-xs">
            <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {tab === 'register' && (
            <div>
              <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wide mb-1">
                Nom complet
              </label>
              <div className="relative flex items-center">
                <User size={15} className="absolute left-3 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Ex: Awa sawadogo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-400 rounded-xl py-2.5 pl-9 pr-3 text-xs text-white outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wide mb-1">
              Adresse Email
            </label>
            <div className="relative flex items-center">
              <Mail size={15} className="absolute left-3 text-neutral-500" />
              <input
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-400 rounded-xl py-2.5 pl-9 pr-3 text-xs text-white outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wide mb-1">
              Mot de passe
            </label>
            <div className="relative flex items-center">
              <Lock size={15} className="absolute left-3 text-neutral-500" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-400 rounded-xl py-2.5 pl-9 pr-3 text-xs text-white outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
          >
            <span>{loading ? 'Traitement sécurisé...' : (tab === 'login' ? 'Connexion' : 'Créer mon compte')}</span>
            <ArrowRight size={14} />
          </button>
        </form>

        <div className="mt-4 pt-3 border-t border-neutral-800/80 text-center text-[10px] text-neutral-500">
          Chidra Mindset • Vos données sont chiffrées et protégées.
        </div>
      </div>
    </div>
  );
}
