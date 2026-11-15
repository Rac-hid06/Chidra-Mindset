import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  BarChart3, 
  BookOpen, 
  Users, 
  Tag, 
  ShieldCheck, 
  Database, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Eye, 
  EyeOff, 
  Star, 
  Download, 
  Heart, 
  Sparkles, 
  RefreshCw, 
  ExternalLink, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Filter,
  UserX,
  UserCheck,
  Calendar,
  Activity,
  LogOut,
  ChevronRight
} from 'lucide-react';

export default function AdminBackOffice({ user, onExit, onLogout }) {
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics', 'stories', 'categories', 'users', 'audit'
  const [analyticsPeriod, setAnalyticsPeriod] = useState('30d');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Stories
  const [stories, setStories] = useState([]);
  const [loadingStories, setLoadingStories] = useState(false);
  const [storySearch, setStorySearch] = useState('');
  const [storyFilter, setStoryFilter] = useState('ALL'); // 'ALL', 'PUBLISHED', 'UNPUBLISHED', 'FEATURED'
  const [editingStory, setEditingStory] = useState(null);
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [storyToDelete, setStoryToDelete] = useState(null);

  // Categories
  const [categories, setCategories] = useState([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  // Users
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState([]);

  // Toast
  const [toast, setToast] = useState(null);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  useEffect(() => {
    if (activeTab === 'analytics') loadAnalytics(analyticsPeriod);
    if (activeTab === 'stories') loadStories();
    if (activeTab === 'categories') loadCategories();
    if (activeTab === 'users') loadUsers();
    if (activeTab === 'audit') loadAuditLogs();
  }, [activeTab, analyticsPeriod]);

  // Chargements API
  const loadAnalytics = async (period) => {
    setLoadingAnalytics(true);
    try {
      const data = await api.admin.getAnalytics(period);
      setAnalyticsData(data);
    } catch (e) {
      showToast('⚠️ Erreur chargement des analytics.');
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const loadStories = async () => {
    setLoadingStories(true);
    try {
      const res = await api.admin.getStories();
      setStories(res.stories || []);
    } catch (e) {
      showToast('⚠️ Erreur chargement des motivations.');
    } finally {
      setLoadingStories(false);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await api.admin.getCategories();
      setCategories(res.categories || []);
    } catch (e) {
      showToast('⚠️ Erreur chargement catégories.');
    }
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await api.admin.getUsers();
      setUsers(res.users || []);
    } catch (e) {
      showToast('⚠️ Erreur chargement utilisateurs.');
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const res = await api.admin.getAuditLogs();
      setAuditLogs(res.logs || []);
    } catch (e) {
      showToast('⚠️ Erreur chargement journal audit.');
    }
  };

  // Actions Motivations
  const handleTogglePublish = async (id) => {
    try {
      const res = await api.admin.togglePublish(id);
      setStories(prev => prev.map(s => s.id === id ? { ...s, isPublished: res.isPublished ? 1 : 0 } : s));
      showToast(res.isPublished ? '✓ Motivation publiée' : '✓ Motivation dépubliée');
    } catch (e) {
      showToast('⚠️ Action impossible');
    }
  };

  const handleToggleFeature = async (id) => {
    try {
      const res = await api.admin.toggleFeature(id);
      setStories(prev => prev.map(s => s.id === id ? { ...s, isFeatured: res.isFeatured ? 1 : 0 } : s));
      showToast(res.isFeatured ? '⭐ Motivation mise en avant' : 'Motivation retirée de la une');
    } catch (e) {
      showToast('⚠️ Action impossible');
    }
  };

  const handleDeleteStoryConfirm = async () => {
    if (!storyToDelete) return;
    try {
      await api.admin.deleteStory(storyToDelete.id);
      setStories(prev => prev.filter(s => s.id !== storyToDelete.id));
      setStoryToDelete(null);
      showToast('🗑️ Motivation supprimée définitivement.');
    } catch (e) {
      showToast('⚠️ Erreur lors de la suppression.');
    }
  };

  const handleSaveStoryForm = async (e) => {
    e.preventDefault();
    const form = e.target;
    const storyData = {
      theme: form.theme.value.trim(),
      category: form.category.value.trim(),
      titleMain: form.titleMain.value.trim(),
      titleSub: form.titleSub.value.trim(),
      hookIcon: form.hookIcon.value.trim() || '⏳',
      hookText: form.hookText.value.trim(),
      subhookIcon: form.subhookIcon.value.trim() || '🔒',
      subhookText: form.subhookText.value.trim(),
      truthTitle: form.truthTitle.value.trim() || 'CONNAIS-TU CETTE VÉRITÉ ?',
      truthText: form.truthText.value.trim(),
      truthHighlight: form.truthHighlight.value.trim(),
      storyIcon: form.storyIcon.value.trim() || '🥥',
      parableTitle: form.parableTitle.value.trim(),
      story: form.story.value.trim(),
      punchline: form.punchline.value.trim(),
      takeaways: [
        form.takeaway1.value.trim(),
        form.takeaway2.value.trim(),
        form.takeaway3.value.trim()
      ].filter(Boolean),
      accentColor: form.accentColor.value || '#F59E0B',
      isPublished: form.isPublished.checked,
      isFeatured: form.isFeatured.checked
    };

    try {
      if (editingStory) {
        await api.admin.updateStory(editingStory.id, storyData);
        showToast('✓ Motivation mise à jour avec succès');
      } else {
        await api.admin.createStory(storyData);
        showToast('✓ Nouvelle motivation enregistrée');
      }
      setShowStoryModal(false);
      setEditingStory(null);
      loadStories();
    } catch (err) {
      showToast(`⚠️ ${err.message}`);
    }
  };

  // Actions Catégories
  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await api.admin.createCategory({ name: newCatName.trim(), description: newCatDesc.trim() });
      setNewCatName('');
      setNewCatDesc('');
      loadCategories();
      showToast('✓ Nouvelle catégorie ajoutée');
    } catch (err) {
      showToast(`⚠️ ${err.message}`);
    }
  };

  // Actions Utilisateurs
  const handleToggleUserStatus = async (targetUser) => {
    const nextStatus = targetUser.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await api.admin.setUserStatus(targetUser.id, nextStatus);
      setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, status: nextStatus } : u));
      showToast(`✓ Compte ${nextStatus === 'ACTIVE' ? 'réactivé' : 'suspendu'}`);
    } catch (err) {
      showToast(`⚠️ ${err.message}`);
    }
  };

  const handleBackup = async () => {
    try {
      await api.admin.downloadBackup();
      showToast('💾 Sauvegarde complète téléchargée !');
    } catch (e) {
      showToast('⚠️ Erreur lors de la sauvegarde.');
    }
  };

  // Filtrage des motivations
  const filteredStories = stories.filter(s => {
    const q = storySearch.toLowerCase();
    const matchSearch = !q || (
      s.titleMain?.toLowerCase().includes(q) ||
      s.titleSub?.toLowerCase().includes(q) ||
      s.theme?.toLowerCase().includes(q) ||
      s.category?.toLowerCase().includes(q)
    );
    if (!matchSearch) return false;

    if (storyFilter === 'PUBLISHED') return s.isPublished;
    if (storyFilter === 'UNPUBLISHED') return !s.isPublished;
    if (storyFilter === 'FEATURED') return s.isFeatured;
    return true;
  });

  return (
    <div className="admin-backoffice-wrapper">
      {toast && <div className="toast-notice">{toast}</div>}

      {/* Barre supérieure d'administration */}
      <header className="admin-top-navbar">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-black text-xl">
            🧠
          </div>
          <div>
            <h1 className="text-sm md:text-base font-black tracking-tight text-white uppercase flex items-center gap-2">
              <span>CHIDRA MINDSET</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-extrabold">
                BACK-OFFICE
              </span>
            </h1>
            <p className="text-[11px] text-neutral-400">
              Connecté en tant que <strong className="text-amber-400">{user.email}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleBackup}
            className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-amber-400 border border-neutral-800 text-xs font-bold transition-all flex items-center gap-1.5"
            title="Exporter une sauvegarde JSON de la base de données"
          >
            <Database size={14} />
            <span className="hidden sm:inline">Backup DB</span>
          </button>
          <button
            onClick={onExit}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
          >
            <Eye size={14} />
            <span>Site Public</span>
          </button>
          <button
            onClick={onLogout}
            className="p-2 rounded-xl bg-neutral-900 hover:bg-red-500/20 text-neutral-400 hover:text-red-400 border border-neutral-800 transition-all"
            title="Se déconnecter"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Navigation par onglets */}
      <nav className="admin-tabs-nav">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`admin-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
        >
          <BarChart3 size={15} />
          <span>Tableau de Bord & Analytics</span>
        </button>
        <button
          onClick={() => setActiveTab('stories')}
          className={`admin-tab-btn ${activeTab === 'stories' ? 'active' : ''}`}
        >
          <BookOpen size={15} />
          <span>Gestion Motivations ({stories.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`admin-tab-btn ${activeTab === 'categories' ? 'active' : ''}`}
        >
          <Tag size={15} />
          <span>Catégories ({categories.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`admin-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
        >
          <Users size={15} />
          <span>Utilisateurs ({users.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`admin-tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
        >
          <ShieldCheck size={15} />
          <span>Journal d'Audit</span>
        </button>
      </nav>

      {/* CONTENU PRINCIPAL */}
      <main className="admin-content-card">

        {/* =========================================================
            ONGLET 1 : ANALYTICS & STATISTIQUES RÉELLES
            ========================================================= */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-800">
              <div>
                <h2 className="text-lg font-black uppercase text-white flex items-center gap-2">
                  <Activity className="text-amber-400" size={20} />
                  <span>Statistiques Réelles d'Utilisation</span>
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Indicateurs vérifiés calculés depuis les événements réels enregistrés avec déduplication.
                </p>
              </div>

              {/* Sélecteur de période */}
              <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
                <button
                  onClick={() => setAnalyticsPeriod('7d')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    analyticsPeriod === '7d' ? 'bg-amber-500 text-black' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  7 Jours
                </button>
                <button
                  onClick={() => setAnalyticsPeriod('30d')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    analyticsPeriod === '30d' ? 'bg-amber-500 text-black' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  30 Jours
                </button>
                <button
                  onClick={() => setAnalyticsPeriod('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    analyticsPeriod === 'all' ? 'bg-amber-500 text-black' : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Tout
                </button>
              </div>
            </div>

            {loadingAnalytics ? (
              <div className="py-16 text-center text-neutral-400 text-xs">
                Calcul des métriques en cours...
              </div>
            ) : analyticsData ? (
              <>
                {/* Cartes Métriques Clés */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800/80">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 block mb-1">
                      Vues Totales (Pages + Stories)
                    </span>
                    <div className="text-2xl font-black text-white">
                      {analyticsData.metrics.totalViews.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-neutral-500 mt-1 block">
                      {analyticsData.metrics.storyViews} lectures de cartes
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800/80">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 block mb-1">
                      Visiteurs Uniques
                    </span>
                    <div className="text-2xl font-black text-amber-400">
                      {analyticsData.metrics.uniqueVisitors.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-neutral-500 mt-1 block">
                      Déduplication par empreinte
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800/80">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 block mb-1">
                      Téléchargements 9:16
                    </span>
                    <div className="text-2xl font-black text-emerald-400">
                      {analyticsData.metrics.totalDownloads.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-neutral-500 mt-1 block">
                      Affiches HD générées
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800/80">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-red-400 block mb-1">
                      Interactions Totales
                    </span>
                    <div className="text-2xl font-black text-red-400">
                      {analyticsData.metrics.totalInteractions.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-neutral-500 mt-1 block">
                      {analyticsData.metrics.totalLikes} likes enregistrés
                    </span>
                  </div>
                </div>

                {/* Section Top Contenus & Timeline */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  {/* Motivations les plus consultées */}
                  <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800">
                    <h3 className="text-xs font-black uppercase text-amber-400 tracking-wider mb-4 flex items-center gap-2">
                      <Eye size={15} />
                      <span>Motivations les plus consultées</span>
                    </h3>
                    {analyticsData.topViewed.length === 0 ? (
                      <div className="text-xs text-neutral-500 py-6 text-center">
                        Aucune consultation mesurée sur cette période.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {analyticsData.topViewed.map((item, idx) => (
                          <div key={item.id} className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2.5">
                              <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-[10px]">
                                {idx + 1}
                              </span>
                              <span className="text-sm">{item.story_icon}</span>
                              <span className="font-bold text-white">{item.title_main} {item.title_sub}</span>
                            </div>
                            <span className="font-extrabold text-amber-400">{item.real_views} vues</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Motivations les plus téléchargées */}
                  <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800">
                    <h3 className="text-xs font-black uppercase text-emerald-400 tracking-wider mb-4 flex items-center gap-2">
                      <Download size={15} />
                      <span>Motivations les plus téléchargées (9:16)</span>
                    </h3>
                    {analyticsData.topDownloaded.length === 0 ? (
                      <div className="text-xs text-neutral-500 py-6 text-center">
                        Aucun téléchargement mesuré sur cette période.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {analyticsData.topDownloaded.map((item, idx) => (
                          <div key={item.id} className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2.5">
                              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px]">
                                {idx + 1}
                              </span>
                              <span className="text-sm">{item.story_icon}</span>
                              <span className="font-bold text-white">{item.title_main} {item.title_sub}</span>
                            </div>
                            <span className="font-extrabold text-emerald-400">{item.real_downloads} exports</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Évolution Journalière du Trafic */}
                <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 mt-6">
                  <h3 className="text-xs font-black uppercase text-white tracking-wider mb-4 flex items-center gap-2">
                    <Calendar size={15} className="text-amber-400" />
                    <span>Évolution Quotidienne des Visites & Téléchargements</span>
                  </h3>
                  {analyticsData.timeline.length === 0 ? (
                    <div className="text-xs text-neutral-500 py-6 text-center">
                      Aucune activité enregistrée pour cette période.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-neutral-800 text-neutral-400 text-[11px] uppercase">
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Visiteurs Uniques</th>
                            <th className="py-2.5 px-3">Pages Vues</th>
                            <th className="py-2.5 px-3">Téléchargements</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-800/60 text-neutral-300">
                          {analyticsData.timeline.map((day) => (
                            <tr key={day.date_day} className="hover:bg-neutral-900/50">
                              <td className="py-2.5 px-3 font-semibold text-white">{day.date_day}</td>
                              <td className="py-2.5 px-3 text-amber-400 font-bold">{day.visitors}</td>
                              <td className="py-2.5 px-3">{day.views}</td>
                              <td className="py-2.5 px-3 text-emerald-400 font-bold">{day.downloads}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* =========================================================
            ONGLET 2 : GESTION DES MOTIVATIONS (CRUD)
            ========================================================= */}
        {activeTab === 'stories' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-800">
              <div>
                <h2 className="text-lg font-black uppercase text-white">Gestion du Catalogue</h2>
                <p className="text-xs text-neutral-400">Ajoutez, modifiez, publiez ou supprimez des motivations.</p>
              </div>
              <button
                onClick={() => { setEditingStory(null); setShowStoryModal(true); }}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs uppercase tracking-wide transition-all shadow-lg shadow-amber-500/20 flex items-center gap-1.5 self-start"
              >
                <Plus size={16} />
                <span>Nouvelle Motivation</span>
              </button>
            </div>

            {/* Filtres et Recherche */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-3 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Rechercher par titre, thème ou mot-clé..."
                  value={storySearch}
                  onChange={(e) => setStorySearch(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-400 rounded-xl py-2 pl-9 pr-3 text-xs text-white outline-none"
                />
              </div>
              <div className="flex gap-1.5 overflow-x-auto">
                <button
                  onClick={() => setStoryFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                    storyFilter === 'ALL' ? 'bg-amber-500 text-black' : 'bg-neutral-950 border border-neutral-800 text-neutral-400'
                  }`}
                >
                  Toutes ({stories.length})
                </button>
                <button
                  onClick={() => setStoryFilter('PUBLISHED')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                    storyFilter === 'PUBLISHED' ? 'bg-emerald-500 text-black' : 'bg-neutral-950 border border-neutral-800 text-neutral-400'
                  }`}
                >
                  Publiées
                </button>
                <button
                  onClick={() => setStoryFilter('UNPUBLISHED')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                    storyFilter === 'UNPUBLISHED' ? 'bg-red-500 text-black' : 'bg-neutral-950 border border-neutral-800 text-neutral-400'
                  }`}
                >
                  Dépubliées
                </button>
                <button
                  onClick={() => setStoryFilter('FEATURED')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                    storyFilter === 'FEATURED' ? 'bg-amber-400 text-black' : 'bg-neutral-950 border border-neutral-800 text-neutral-400'
                  }`}
                >
                  En Vedette
                </button>
              </div>
            </div>

            {/* Tableau des motivations */}
            <div className="overflow-x-auto rounded-2xl border border-neutral-800 bg-neutral-950">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral-800 text-neutral-400 text-[10px] uppercase">
                    <th className="py-3 px-3.5">Motivation</th>
                    <th className="py-3 px-3.5">Thème / Catégorie</th>
                    <th className="py-3 px-3.5 text-center">Vues</th>
                    <th className="py-3 px-3.5 text-center">Exports</th>
                    <th className="py-3 px-3.5 text-center">Statut</th>
                    <th className="py-3 px-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {filteredStories.map((story) => (
                    <tr key={story.id} className="hover:bg-neutral-900/60 transition-colors">
                      <td className="py-3 px-3.5 font-bold text-white flex items-center gap-2.5">
                        <span className="text-lg">{story.storyIcon || '🥥'}</span>
                        <div>
                          <div>{story.titleMain} {story.titleSub}</div>
                          <div className="text-[10px] text-neutral-500 line-clamp-1">{story.parableTitle}</div>
                        </div>
                      </td>
                      <td className="py-3 px-3.5">
                        <span className="px-2 py-0.5 rounded-md bg-neutral-900 border border-neutral-800 text-amber-400 text-[10px] font-bold">
                          {story.theme}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-center font-bold text-neutral-300">
                        {story.viewsCount || 0}
                      </td>
                      <td className="py-3 px-3.5 text-center font-bold text-emerald-400">
                        {story.downloadsCount || 0}
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleTogglePublish(story.id)}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase transition-all ${
                              story.isPublished ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-neutral-800 text-neutral-500'
                            }`}
                          >
                            {story.isPublished ? 'Publiée' : 'Dépubliée'}
                          </button>
                          <button
                            onClick={() => handleToggleFeature(story.id)}
                            className={`p-1 rounded-md transition-all ${
                              story.isFeatured ? 'text-amber-400 bg-amber-500/20' : 'text-neutral-600 hover:text-neutral-400'
                            }`}
                            title="Mettre en avant"
                          >
                            <Star size={13} fill={story.isFeatured ? 'currentColor' : 'none'} />
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => { setEditingStory(story); setShowStoryModal(true); }}
                            className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-amber-400 transition-all"
                            title="Modifier"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => setStoryToDelete(story)}
                            className="p-1.5 rounded-lg bg-neutral-900 hover:bg-red-500/20 text-neutral-300 hover:text-red-400 transition-all"
                            title="Supprimer définitivement"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================
            ONGLET 3 : GESTION DES CATÉGORIES
            ========================================================= */}
        {activeTab === 'categories' && (
          <div className="space-y-6">
            <div className="pb-4 border-b border-neutral-800">
              <h2 className="text-lg font-black uppercase text-white">Gestion des Catégories</h2>
              <p className="text-xs text-neutral-400">Structurez les thèmes de sagesse pour la recherche et le filtrage.</p>
            </div>

            {/* Formulaire ajout catégorie */}
            <form onSubmit={handleAddCategory} className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Nom de la nouvelle catégorie (ex: Stoïcisme Moderne)..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                required
                className="flex-1 bg-neutral-900 border border-neutral-800 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
              />
              <input
                type="text"
                placeholder="Description courte (optionnelle)..."
                value={newCatDesc}
                onChange={(e) => setNewCatDesc(e.target.value)}
                className="flex-1 bg-neutral-900 border border-neutral-800 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
              />
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black uppercase tracking-wider transition-all"
              >
                Ajouter
              </button>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {categories.map((c) => (
                <div key={c.id} className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex flex-col justify-between">
                  <div>
                    <h3 className="font-extrabold text-sm text-white">{c.name}</h3>
                    <p className="text-xs text-neutral-400 mt-1">{c.description || 'Pas de description.'}</p>
                  </div>
                  <span className="text-[10px] text-amber-500/80 uppercase font-mono mt-3">
                    slug: {c.slug}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================================
            ONGLET 4 : GESTION DES UTILISATEURS
            ========================================================= */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="pb-4 border-b border-neutral-800">
              <h2 className="text-lg font-black uppercase text-white">Gestion des Utilisateurs</h2>
              <p className="text-xs text-neutral-400">Consultez les membres enregistrés et gérez leur statut d'accès.</p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-neutral-800 bg-neutral-950">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral-800 text-neutral-400 text-[10px] uppercase">
                    <th className="py-3 px-3.5">Utilisateur</th>
                    <th className="py-3 px-3.5">Email</th>
                    <th className="py-3 px-3.5 text-center">Rôle</th>
                    <th className="py-3 px-3.5 text-center">Date d'inscription</th>
                    <th className="py-3 px-3.5 text-center">Statut</th>
                    <th className="py-3 px-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-neutral-900/60">
                      <td className="py-3 px-3.5 font-bold text-white">{u.name}</td>
                      <td className="py-3 px-3.5 text-neutral-300 font-mono text-[11px]">{u.email}</td>
                      <td className="py-3 px-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          u.role === 'ADMIN' ? 'bg-amber-500 text-black' : 'bg-neutral-800 text-neutral-400'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-center text-neutral-500 text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {u.status === 'ACTIVE' ? 'Actif' : 'Suspendu'}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-right">
                        {u.id !== user.id && (
                          <button
                            onClick={() => handleToggleUserStatus(u)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                              u.status === 'ACTIVE'
                                ? 'bg-red-500/15 text-red-400 hover:bg-red-500 hover:text-white'
                                : 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500 hover:text-white'
                            }`}
                          >
                            {u.status === 'ACTIVE' ? 'Suspendre' : 'Réactiver'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================
            ONGLET 5 : JOURNAL D'AUDIT
            ========================================================= */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            <div className="pb-4 border-b border-neutral-800">
              <h2 className="text-lg font-black uppercase text-white">Journal d'Audit des Actions</h2>
              <p className="text-xs text-neutral-400">Traçabilité complète de toutes les modifications administratives.</p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-neutral-800 bg-neutral-950">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral-800 text-neutral-400 text-[10px] uppercase">
                    <th className="py-3 px-3.5">Date & Heure</th>
                    <th className="py-3 px-3.5">Administrateur</th>
                    <th className="py-3 px-3.5">Action</th>
                    <th className="py-3 px-3.5">Détails</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 font-mono text-[11px]">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-neutral-900/60">
                      <td className="py-3 px-3.5 text-neutral-500 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-3.5 font-bold text-amber-400">{log.admin_email}</td>
                      <td className="py-3 px-3.5 font-bold text-white">{log.action}</td>
                      <td className="py-3 px-3.5 text-neutral-400">
                        {JSON.stringify(log.details)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      {/* =========================================================
          MODALE CRÉATION / ÉDITION DE MOTIVATION (5 ÉLÉMENTS)
          ========================================================= */}
      {showStoryModal && (
        <div className="modal-overlay">
          <div className="modal-container max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="modal-header">
              <h3 className="font-black uppercase text-white text-base">
                {editingStory ? 'Modifier la Motivation' : 'Créer une Nouvelle Motivation'}
              </h3>
              <button onClick={() => { setShowStoryModal(false); setEditingStory(null); }} className="close-modal-btn">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveStoryForm} className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-amber-400 uppercase tracking-wide mb-1">
                    Thème (en majuscules) *
                  </label>
                  <input
                    type="text"
                    name="theme"
                    defaultValue={editingStory?.theme || 'DISCIPLINE & PATIENCE'}
                    required
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-400 rounded-xl p-2.5 text-xs text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-amber-400 uppercase tracking-wide mb-1">
                    Catégorie *
                  </label>
                  <input
                    type="text"
                    name="category"
                    defaultValue={editingStory?.category || 'Travail Invisible'}
                    required
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-400 rounded-xl p-2.5 text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wide mb-1">
                    Titre Principal (Majuscules) *
                  </label>
                  <input
                    type="text"
                    name="titleMain"
                    defaultValue={editingStory?.titleMain || 'LE TRAVAIL'}
                    required
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-400 rounded-xl p-2.5 text-xs text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-300 uppercase tracking-wide mb-1">
                    Sous-Titre d'Accroche *
                  </label>
                  <input
                    type="text"
                    name="titleSub"
                    defaultValue={editingStory?.titleSub || 'QUE PERSONNE NE VOIT'}
                    required
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-amber-400 rounded-xl p-2.5 text-xs text-white outline-none"
                  />
                </div>
              </div>

              {/* Accroche & Constat */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wide mb-1">
                    Icône & Accroche (Phrase 1) *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="hookIcon"
                      defaultValue={editingStory?.hookIcon || '🌱'}
                      className="w-12 text-center bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-sm"
                    />
                    <input
                      type="text"
                      name="hookText"
                      defaultValue={editingStory?.hookText || ''}
                      required
                      placeholder="Constat psychologique..."
                      className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-xs text-white outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wide mb-1">
                    Icône & Conséquence (Phrase 2) *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="subhookIcon"
                      defaultValue={editingStory?.subhookIcon || '⚠️'}
                      className="w-12 text-center bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-sm"
                    />
                    <input
                      type="text"
                      name="subhookText"
                      defaultValue={editingStory?.subhookText || ''}
                      required
                      placeholder="Pourquoi cela détruit..."
                      className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-xs text-white outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Encadré Vérité */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                <input
                  type="text"
                  name="truthTitle"
                  defaultValue={editingStory?.truthTitle || 'CONNAIS-TU CETTE VÉRITÉ ?'}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs font-bold text-amber-400"
                />
                <input
                  type="text"
                  name="truthText"
                  defaultValue={editingStory?.truthText || ''}
                  required
                  placeholder="Ce à quoi tu t'accroches..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-white"
                />
                <input
                  type="text"
                  name="truthHighlight"
                  defaultValue={editingStory?.truthHighlight || ''}
                  required
                  placeholder="➔ Phrase d'impact avec flèche..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-amber-300 font-bold"
                />
              </div>

              {/* Parabole */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="storyIcon"
                    defaultValue={editingStory?.storyIcon || '🥥'}
                    className="w-12 text-center bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-sm"
                  />
                  <input
                    type="text"
                    name="parableTitle"
                    defaultValue={editingStory?.parableTitle || 'L histoire du piège à singe'}
                    required
                    placeholder="Titre de la parabole..."
                    className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-xs text-white outline-none"
                  />
                </div>
                <textarea
                  name="story"
                  rows="3"
                  defaultValue={editingStory?.story || ''}
                  required
                  placeholder="Récit captivant de la parabole..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-xs text-white outline-none resize-none"
                ></textarea>
              </div>

              {/* Punchline Choc */}
              <div>
                <label className="block text-[11px] font-bold text-amber-400 uppercase tracking-wide mb-1">
                  La Leçon Choc (Punchline en majuscules) *
                </label>
                <textarea
                  name="punchline"
                  rows="2"
                  defaultValue={editingStory?.punchline || ''}
                  required
                  placeholder="PARFOIS, LÂCHER PRISE N'EST PAS PERDRE..."
                  className="w-full bg-neutral-950 border border-amber-500/40 rounded-xl p-2.5 text-xs text-white font-black uppercase outline-none resize-none"
                ></textarea>
              </div>

              {/* 3 Enseignements clés */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wide">
                  3 Enseignements clés (Takeaways) *
                </label>
                <input
                  type="text"
                  name="takeaway1"
                  defaultValue={editingStory?.takeaways?.[0] || ''}
                  required
                  placeholder="1. Premier enseignement..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2 text-xs text-white"
                />
                <input
                  type="text"
                  name="takeaway2"
                  defaultValue={editingStory?.takeaways?.[1] || ''}
                  required
                  placeholder="2. Deuxième enseignement..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2 text-xs text-white"
                />
                <input
                  type="text"
                  name="takeaway3"
                  defaultValue={editingStory?.takeaways?.[2] || ''}
                  required
                  placeholder="3. Troisième enseignement..."
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2 text-xs text-white"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-neutral-800">
                <div className="flex items-center gap-4 text-xs text-neutral-300">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="isPublished"
                      defaultChecked={editingStory ? !!editingStory.isPublished : true}
                      className="rounded"
                    />
                    <span>Publiée immédiatement</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="isFeatured"
                      defaultChecked={editingStory ? !!editingStory.isFeatured : false}
                      className="rounded"
                    />
                    <span>Mettre en avant ⭐</span>
                  </label>
                  <input
                    type="color"
                    name="accentColor"
                    defaultValue={editingStory?.accentColor || '#F59E0B'}
                    className="w-7 h-7 rounded border-0 cursor-pointer bg-transparent"
                    title="Couleur d'accentuation"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowStoryModal(false); setEditingStory(null); }}
                    className="px-4 py-2 rounded-xl bg-neutral-900 text-neutral-400 text-xs font-bold"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black uppercase tracking-wider transition-all"
                  >
                    Enregistrer dans la Base
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE DE CONFIRMATION SUPPRESSION */}
      {storyToDelete && (
        <div className="modal-overlay">
          <div className="modal-container max-w-sm border-red-500/40">
            <div className="modal-header border-b-0 pb-0">
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle size={20} />
                <h3 className="font-black uppercase text-sm">Confirmer la suppression</h3>
              </div>
              <button onClick={() => setStoryToDelete(null)} className="close-modal-btn">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-neutral-300 mt-3 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer définitivement la motivation :<br />
              <strong className="text-white">"{storyToDelete.titleMain} {storyToDelete.titleSub}"</strong> ?<br />
              <span className="text-red-400 text-[11px] block mt-1">Cette action est irréversible dans la base de données.</span>
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setStoryToDelete(null)}
                className="px-4 py-2 rounded-xl bg-neutral-900 text-neutral-400 text-xs font-bold"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteStoryConfirm}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-wider transition-all"
              >
                Supprimer Définitivement
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
