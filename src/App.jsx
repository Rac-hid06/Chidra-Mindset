import { useState, useRef, useEffect, useMemo } from 'react';
import { toPng } from 'html-to-image';
import { stories as fallbackStories } from './data/stories';
import { generateChidraParable, AI_STYLES } from './services/aiCoach';
import { api, visitorId, sessionId } from './services/api';
import AuthModal from './components/AuthModal';
import UserSpace from './components/UserSpace';
import AdminBackOffice from './components/AdminBackOffice';
import { 
  Download, 
  Heart, 
  Sparkles, 
  ExternalLink, 
  Flame, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  X,
  Wand2,
  Key,
  User,
  Shield,
  Layers,
  Share2
} from 'lucide-react';
import './App.css';

export default function App() {
  // Navigation de vue : 'public' ou 'backoffice'
  const [view, setView] = useState('public');

  // Authentification
  const [currentUser, setCurrentUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserSpace, setShowUserSpace] = useState(false);

  // Données des motivations
  const [allStories, setAllStories] = useState(fallbackStories);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [categories, setCategories] = useState([]);
  
  // Interactions
  const [likes, setLikes] = useState({});
  const [userLiked, setUserLiked] = useState({});
  const [isExporting, setIsExporting] = useState(false);
  const [toast, setToast] = useState(null);

  // Coach IA Multi-Styles
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiSituation, setAiSituation] = useState('');
  const [selectedAIStyle, setSelectedAIStyle] = useState('stoic');
  const [aiApiKey, setAiApiKey] = useState(() => localStorage.getItem('chidra_gemini_key') || '');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);

  const cardRef = useRef(null);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3400);
  };

  // 1. Initialisation de l'application & Tracking Analytics de Visite
  useEffect(() => {
    // Vérifier la session utilisateur
    api.auth.me().then(user => {
      if (user) setCurrentUser(user);
    });

    // Charger les histoires depuis la base de données réelle
    loadStoriesFromApi();

    // Charger les catégories réelles
    api.stories.getCategories().then(res => {
      if (res.categories) setCategories(res.categories);
    }).catch(() => {});

    // Enregistrer l'événement réel de visite (dédupliqué)
    api.analytics.track('page_view', null, { url: window.location.pathname });
  }, []);

  const loadStoriesFromApi = async () => {
    try {
      const res = await api.stories.list();
      if (res.stories && res.stories.length > 0) {
        setAllStories(res.stories);
        const initialLikes = {};
        res.stories.forEach(s => { initialLikes[s.id] = s.likesCount || 0; });
        setLikes(initialLikes);
      }
    } catch (e) {
      console.warn('Utilisation des histoires locales en secours.');
    }
  };

  // Filtrer les motivations par recherche et catégorie
  const filteredStories = useMemo(() => {
    return allStories.filter(story => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (
        story.titleMain?.toLowerCase().includes(q) ||
        story.titleSub?.toLowerCase().includes(q) ||
        story.theme?.toLowerCase().includes(q) ||
        story.category?.toLowerCase().includes(q) ||
        story.punchline?.toLowerCase().includes(q) ||
        story.story?.toLowerCase().includes(q)
      );
      const matchesCategory = selectedCategory === 'ALL' || story.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [allStories, searchQuery, selectedCategory]);

  const currentStory = filteredStories[currentIndex] || allStories[0];

  // Enregistrer la vue d'une motivation spécifique (dédupliqué côté serveur)
  useEffect(() => {
    if (currentStory && view === 'public') {
      api.analytics.track('story_view', currentStory.id, {
        title: `${currentStory.titleMain} ${currentStory.titleSub}`
      });
    }
  }, [currentStory?.id, view]);

  // Ajuster l'index si la liste filtrée change
  useEffect(() => {
    if (currentIndex >= filteredStories.length) {
      setCurrentIndex(0);
    }
  }, [filteredStories.length, currentIndex]);

  // Navigation par touches du clavier
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (view !== 'public') return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const handleNext = () => {
    if (filteredStories.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % filteredStories.length);
  };

  const handlePrev = () => {
    if (filteredStories.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + filteredStories.length) % filteredStories.length);
  };

  const handleRandom = () => {
    if (filteredStories.length <= 1) return;
    let nextIndex;
    do {
      nextIndex = Math.floor(Math.random() * filteredStories.length);
    } while (nextIndex === currentIndex);
    setCurrentIndex(nextIndex);
  };

  // Like / Unlike avec persistance dans la base et tracking réel
  const handleLike = async () => {
    if (!currentStory) return;
    const id = currentStory.id;
    const isCurrentlyLiked = !!userLiked[id];

    // Optimiste
    setUserLiked(prev => ({ ...prev, [id]: !isCurrentlyLiked }));
    setLikes(prev => ({ ...prev, [id]: Math.max(0, (prev[id] || 0) + (isCurrentlyLiked ? -1 : 1)) }));

    try {
      const res = await api.stories.like(id, !isCurrentlyLiked);
      setLikes(prev => ({ ...prev, [id]: res.likesCount }));
      if (!isCurrentlyLiked) {
        showToast("❤️ Motivation ajoutée à vos favoris !");
      }
    } catch (e) {
      // Revert si erreur
      setUserLiked(prev => ({ ...prev, [id]: isCurrentlyLiked }));
    }
  };

  // Téléchargement réel de l'affiche 9:16 HD avec tracking
  const handleDownload = async () => {
    if (!cardRef.current || !currentStory) return;
    setIsExporting(true);

    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2.5
      });
      
      const link = document.createElement('a');
      link.download = `chidra-mindset-${currentStory.id}.png`;
      link.href = dataUrl;
      link.click();

      // Enregistrement de l'événement réel de téléchargement
      api.analytics.track('download', currentStory.id, {
        title: `${currentStory.titleMain} ${currentStory.titleSub}`
      });

      showToast("✨ Affiche HD 9:16 téléchargée avec succès !");
    } catch (err) {
      console.error("Erreur lors de l'export de l'image:", err);
      showToast("⚠️ Erreur lors du téléchargement. Essayez à nouveau.");
    } finally {
      setIsExporting(false);
    }
  };

  // Partage vers TikTok avec tracking
  const handleShareTikTok = () => {
    api.analytics.track('share', currentStory?.id, { platform: 'tiktok' });
  };

  // Générateur IA Multi-Styles
  const handleGenerateAI = async (customText = null) => {
    const textToUse = customText || aiSituation;
    if (!textToUse || !textToUse.trim()) {
      alert("Veuillez décrire brièvement ce que vous traversez.");
      return;
    }

    setIsAILoading(true);

    try {
      const generated = await generateChidraParable(textToUse, selectedAIStyle, aiApiKey);
      const updated = [generated, ...allStories];
      setAllStories(updated);

      setShowAIModal(false);
      setSearchQuery('');
      setCurrentIndex(0);
      setAiSituation('');
      showToast(`🧠 Parabole style "${AI_STYLES.find(s=>s.id===selectedAIStyle)?.name}" générée !`);
    } catch (err) {
      showToast("⚠️ Erreur lors de la génération. Réessayez.");
    } finally {
      setIsAILoading(false);
    }
  };

  // Gestion de l'authentification et redirection selon le rôle
  const handleAuthSuccess = (user) => {
    setCurrentUser(user);
    if (user.role === 'ADMIN') {
      showToast(`👑 Bienvenue Administrateur ${user.name}`);
      setView('backoffice'); // Redirection automatique vers le back-office
    } else {
      showToast(`👤 Bienvenue ${user.name}`);
    }
  };

  const handleLogout = async () => {
    await api.auth.logout();
    setCurrentUser(null);
    setView('public');
    setShowUserSpace(false);
    showToast("Déconnexion effectuée avec succès.");
  };

  // Si l'administrateur est dans le back-office
  if (view === 'backoffice' && currentUser?.role === 'ADMIN') {
    return (
      <AdminBackOffice 
        user={currentUser} 
        onExit={() => { setView('public'); loadStoriesFromApi(); }} 
        onLogout={handleLogout} 
      />
    );
  }

  const aiSuggestions = [
    "Je perds espoir dans mon business",
    "Je n'arrive pas à me réveiller tôt",
    "J'ai peur du regard des autres",
    "Je procrastine sans cesse",
    "Déception et trahison d'un proche"
  ];

  return (
    <div className="app-wrapper">
      
      {/* Toast de confirmation */}
      {toast && <div className="toast-notice">{toast}</div>}

      {/* Barre supérieure publique avec bouton utilisateur */}
      <div className="public-top-userbar">
        {currentUser ? (
          <div className="flex items-center gap-2">
            {currentUser.role === 'ADMIN' ? (
              <button
                onClick={() => setView('backoffice')}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
              >
                <Shield size={14} />
                <span>Espace Administrateur</span>
              </button>
            ) : (
              <button
                onClick={() => setShowUserSpace(true)}
                className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <User size={14} className="text-amber-400" />
                <span>Mon Espace ({currentUser.name.split(' ')[0]})</span>
              </button>
            )}
            <button
              onClick={handleLogout}
              className="p-1.5 text-neutral-500 hover:text-red-400 text-xs transition-colors"
              title="Se déconnecter"
            >
              Déconnexion
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAuthModal(true)}
            className="px-3.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 hover:border-amber-500/40 text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <User size={14} className="text-amber-400" />
            <span>Connexion / Inscription</span>
          </button>
        )}
      </div>

      {/* En-tête Chidra Mindset */}
      <header className="app-header">
        <div className="brand-badge">
          <Sparkles size={14} />
          <span>Plateforme Officielle • @chidramindset1</span>
        </div>
        
        <h1 className="brand-title">
          <span>CHIDRA</span>
          <span className="gold">🧠</span>
          <span>MINDSET</span>
        </h1>
        
        <p className="brand-subtitle">
          Paraboles de sagesse avec morale percutante, leçons chocs et affiches HD 9:16 prêtes pour vos Stories et réseaux.
        </p>
      </header>

      {/* Barre de Recherche Instantanée & Coach IA */}
      <div className="search-section-wrapper">
        <div className="search-bar-container">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Rechercher une motivation (patience, singe, égo, échec, temps)..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentIndex(0);
              if (e.target.value.length >= 3) {
                api.analytics.track('search', null, { query: e.target.value });
              }
            }}
            className="search-input"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')} 
              className="clear-search-btn"
              title="Effacer la recherche"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="search-info-bar">
          <span className="results-counter">
            <strong>{filteredStories.length}</strong> motivation{filteredStories.length > 1 ? 's' : ''}
          </span>

          <button 
            onClick={() => setShowAIModal(true)}
            className="ai-coach-trigger-btn"
            title="Demander une parabole sur-mesure au Coach IA Chidra"
          >
            <Wand2 size={14} />
            <span>Coach IA 🧠</span>
          </button>
        </div>
      </div>

      {/* Barre de Navigation Suivant / Précédent */}
      {filteredStories.length > 0 && (
        <div className="nav-controls-bar">
          <button 
            onClick={handlePrev} 
            className="nav-btn prev-btn" 
            title="Motivation précédente (Flèche gauche)"
          >
            <ChevronLeft size={20} />
            <span>Précédent</span>
          </button>

          <div className="nav-indicator">
            <span className="current-pos">{currentIndex + 1}</span>
            <span className="slash">/</span>
            <span className="total-pos">{filteredStories.length}</span>
          </div>

          <button 
            onClick={handleNext} 
            className="nav-btn next-btn" 
            title="Motivation suivante (Flèche droite)"
          >
            <span>Suivant</span>
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      {/* Si aucun résultat */}
      {filteredStories.length === 0 ? (
        <div className="empty-results-box">
          <p>Aucune motivation ne correspond à votre recherche "<strong>{searchQuery}</strong>".</p>
          <button 
            onClick={() => setSearchQuery('')} 
            className="btn-secondary-action mt-4"
          >
            Réinitialiser la recherche
          </button>
        </div>
      ) : (
        /* CARTE VISUELLE 9:16 OFFICIELLE */
        <main className="visual-container">
          <div 
            ref={cardRef} 
            className="story-card-916 fade-in"
            key={currentStory.id}
          >
            <div className="card-bg-gradient"></div>

            {/* Haut de la carte */}
            <div>
              <div className="card-top-bar">
                <div className="quote-bubble">“</div>
                <div className="theme-pill">{currentStory.theme}</div>
              </div>

              <div className="story-heading">
                <h2>
                  {currentStory.titleMain}<br />
                  <span>{currentStory.titleSub}</span>
                </h2>
                <div className="gold-divider"></div>
              </div>

              {/* Accroche & Constat */}
              <div className="hook-section">
                <div className="hook-row">
                  <span>{currentStory.hookIcon || '⏳'}</span>
                  <span>{currentStory.hookText}</span>
                </div>
                <div className="hook-row">
                  <span>{currentStory.subhookIcon || '🔒'}</span>
                  <span>{currentStory.subhookText}</span>
                </div>
              </div>

              {/* Encadré Vérité */}
              <div className="truth-box">
                <div className="truth-box-label">{currentStory.truthTitle || 'CONNAIS-TU CETTE VÉRITÉ ?'}</div>
                <div className="truth-box-content">
                  {currentStory.truthText}
                  <span className="truth-highlight">{currentStory.truthHighlight}</span>
                </div>
              </div>

              {/* Récit de la Parabole */}
              <div className="parable-box">
                <div className="parable-header">
                  <span>{currentStory.storyIcon || '🥥'}</span>
                  <span className="parable-title">{currentStory.parableTitle}</span>
                </div>
                <p className="parable-text">{currentStory.story}</p>
              </div>

              {/* Morale / Punchline Choc */}
              <div className="punchline-banner">
                <div className="punchline-label">LA LEÇON CHOC</div>
                <div className="punchline-quote">{currentStory.punchline}</div>
              </div>

              {/* 3 Enseignements clés */}
              <div className="takeaways-list">
                {(currentStory.takeaways || []).map((takeaway, i) => (
                  <div key={i} className="takeaway-item">
                    <span className="takeaway-check">✔</span>
                    <span>{takeaway}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer officiel CHIDRA MINDSET */}
            <footer className="brand-footer">
              <div className="brand-signature-row">
                <span>CHIDRA</span>
                <span className="brain">🧠</span>
                <span className="gold-text">MINDSET</span>
              </div>
              <div className="brand-slogan">
                ── LIBÈRE TON ESPRIT, SAUVE TA VIE. ──
              </div>
              <div className="brand-tiktok-tag">
                TikTok : <strong>@chidramindset1</strong>
              </div>
            </footer>
          </div>
        </main>
      )}

      {/* Barre d'action inférieure */}
      {filteredStories.length > 0 && (
        <div className="visual-container">
          <div className="actions-container">
            <button 
              onClick={handleDownload} 
              disabled={isExporting}
              className="btn-primary-action"
            >
              <Download size={16} />
              <span>{isExporting ? 'Génération HD...' : 'Télécharger Format 9:16'}</span>
            </button>

            <button 
              onClick={handleLike} 
              className={`btn-secondary-action ${userLiked[currentStory.id] ? 'liked' : ''}`}
              title="Aimer cette motivation"
            >
              <Heart size={16} fill={userLiked[currentStory.id] ? "currentColor" : "none"} />
              <span>{likes[currentStory.id] || currentStory.likesCount || 0}</span>
            </button>

            <button
              onClick={handleRandom}
              className="btn-secondary-action"
              title="Histoire aléatoire"
            >
              <Flame size={16} />
            </button>

            <a 
              href="https://www.tiktok.com/@chidramindset1" 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={handleShareTikTok}
              className="btn-secondary-action"
              title="Rejoindre la communauté sur TikTok"
            >
              <span>TikTok</span>
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      )}

      {/* MODALE DU COACH IA AVEC SÉLECTION DES STYLES */}
      {showAIModal && (
        <div className="modal-overlay">
          <div className="modal-container ai-modal-card">
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <span className="text-xl">🧠</span>
                <div>
                  <h3 className="gold-gradient-text font-black text-base">Coach IA Chidra Mindset</h3>
                  <p className="text-xs text-neutral-400">Choisis un ton d'écriture et exprime ton défi actuel.</p>
                </div>
              </div>
              <button onClick={() => setShowAIModal(false)} className="close-modal-btn">
                <X size={20} />
              </button>
            </div>

            <div className="ai-modal-content">
              {isAILoading ? (
                <div className="ai-loading-box">
                  <div className="brain-pulse-container">
                    <span className="brain-pulse-icon">🧠</span>
                  </div>
                  <h4 className="text-white font-bold text-sm mt-3">Chidra IA forge votre parabole...</h4>
                  <p className="text-neutral-400 text-xs mt-1 text-center max-w-xs">
                    Style sélectionné : {AI_STYLES.find(s=>s.id===selectedAIStyle)?.name}
                  </p>
                </div>
              ) : (
                <>
                  <div className="style-selector-section">
                    <label className="text-[11px] font-bold text-amber-400 uppercase tracking-wide block mb-2">
                      1. Choisis le ton de la motivation :
                    </label>
                    <div className="styles-grid">
                      {AI_STYLES.map((style) => (
                        <button
                          key={style.id}
                          type="button"
                          onClick={() => setSelectedAIStyle(style.id)}
                          className={`style-card-btn ${selectedAIStyle === style.id ? 'active' : ''}`}
                        >
                          <span className="style-icon">{style.icon}</span>
                          <span className="style-name">{style.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-row mt-2">
                    <label className="text-[11px] font-bold text-amber-400 uppercase tracking-wide">
                      2. Quel défi traverses-tu en ce moment ?
                    </label>
                    <textarea 
                      rows="3" 
                      placeholder="Ex: Je perds espoir dans mon business, les clients ne viennent pas et le doute me ronge..." 
                      value={aiSituation}
                      onChange={(e) => setAiSituation(e.target.value)}
                      className="ai-textarea"
                    />
                  </div>

                  <div className="chips-section">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-2">
                      Ou clique sur une situation fréquente :
                    </span>
                    <div className="chips-wrapper">
                      {aiSuggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setAiSituation(suggestion);
                            handleGenerateAI(suggestion);
                          }}
                          className="suggestion-chip"
                        >
                          <Sparkles size={12} className="text-amber-400" />
                          <span>{suggestion}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Clé API Gemini (Optionnel) */}
                  <div className="api-key-toggle-box">
                    <button 
                      type="button"
                      onClick={() => setShowKeyInput(!showKeyInput)}
                      className="text-[11px] text-neutral-400 hover:text-amber-400 flex items-center gap-1.5 transition-colors"
                    >
                      <Key size={12} />
                      <span>{aiApiKey ? "✓ Clé Gemini configurée" : "Connecter une clé API Gemini (Optionnel)"}</span>
                    </button>

                    {showKeyInput && (
                      <div className="api-key-input-row mt-2">
                        <input 
                          type="password"
                          placeholder="Collez votre clé API Gemini ici..."
                          value={aiApiKey}
                          onChange={(e) => {
                            setAiApiKey(e.target.value);
                            localStorage.setItem('chidra_gemini_key', e.target.value);
                          }}
                          className="api-key-input"
                        />
                      </div>
                    )}
                  </div>

                  <div className="modal-actions mt-3">
                    <button 
                      type="button" 
                      onClick={() => setShowAIModal(false)} 
                      className="btn-cancel"
                    >
                      Annuler
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleGenerateAI()}
                      className="btn-submit-ai"
                    >
                      <Wand2 size={16} />
                      <span>Générer ({AI_STYLES.find(s=>s.id===selectedAIStyle)?.name.split(' ')[0]})</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODALE D'AUTHENTIFICATION */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* ESPACE UTILISATEUR PERSONNEL */}
      <UserSpace
        isOpen={showUserSpace}
        onClose={() => setShowUserSpace(false)}
        user={currentUser}
        onLogout={handleLogout}
        onSelectStory={(story) => {
          const idx = allStories.findIndex(s => s.id === story.id);
          if (idx !== -1) setCurrentIndex(idx);
        }}
      />

      {/* Footer sobre et élégant */}
      <footer className="footer-meta-bar">
        <span>Chidra Mindset © 2026 • Libère ton esprit, sauve ta vie</span>
        <span>TikTok : @chidramindset1</span>
      </footer>

    </div>
  );
}
