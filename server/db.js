import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// ✅ PHASE 5 — DATABASE_PATH configurable via variable d'environnement
const dbPath = process.env.DATABASE_PATH || path.join(dataDir, 'chidra.sqlite');
export const db = new DatabaseSync(dbPath);

// Active les clés étrangères et le mode WAL pour des performances optimales
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

export function initDatabase() {
  // 1. Table Utilisateurs
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'USER', -- 'USER' ou 'ADMIN'
      status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE' ou 'SUSPENDED'
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
  `);

  // 2. Table Sessions Sécurisées
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  `);

  // 3. Table des Catégories
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // 4. Table des Motivations (Stories)
  db.exec(`
    CREATE TABLE IF NOT EXISTS stories (
      id TEXT PRIMARY KEY,
      theme TEXT NOT NULL,
      category TEXT NOT NULL,
      title_main TEXT NOT NULL,
      title_sub TEXT NOT NULL,
      hook_icon TEXT DEFAULT '⏳',
      hook_text TEXT NOT NULL,
      subhook_icon TEXT DEFAULT '🔒',
      subhook_text TEXT NOT NULL,
      truth_title TEXT NOT NULL DEFAULT 'CONNAIS-TU CETTE VÉRITÉ ?',
      truth_text TEXT NOT NULL,
      truth_highlight TEXT NOT NULL,
      story_icon TEXT DEFAULT '🥥',
      parable_title TEXT NOT NULL,
      story TEXT NOT NULL,
      punchline TEXT NOT NULL,
      takeaways_json TEXT NOT NULL DEFAULT '[]',
      accent_color TEXT DEFAULT '#F59E0B',
      is_published INTEGER NOT NULL DEFAULT 1,
      is_featured INTEGER NOT NULL DEFAULT 0,
      views_count INTEGER NOT NULL DEFAULT 0,
      downloads_count INTEGER NOT NULL DEFAULT 0,
      likes_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_stories_published ON stories(is_published);
    CREATE INDEX IF NOT EXISTS idx_stories_category ON stories(category);
    CREATE INDEX IF NOT EXISTS idx_stories_featured ON stories(is_featured);
  `);

  // 5. Table des Favoris Utilisateurs
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_favorites (
      user_id TEXT NOT NULL,
      story_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (user_id, story_id),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(story_id) REFERENCES stories(id) ON DELETE CASCADE
    );
  `);

  // 6. Table des Événements Analytics Réels
  db.exec(`
    CREATE TABLE IF NOT EXISTS analytics_events (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL, -- 'page_view', 'story_view', 'download', 'like', 'unlike', 'search', 'share'
      story_id TEXT,
      visitor_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      user_id TEXT,
      metadata_json TEXT DEFAULT '{}',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_events_type ON analytics_events(event_type);
    CREATE INDEX IF NOT EXISTS idx_events_created ON analytics_events(created_at);
    CREATE INDEX IF NOT EXISTS idx_events_visitor ON analytics_events(visitor_id);
    CREATE INDEX IF NOT EXISTS idx_events_session ON analytics_events(session_id);
    CREATE INDEX IF NOT EXISTS idx_events_story ON analytics_events(story_id);
  `);

  // 7. Table Journal d'Audit Administrateur
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id TEXT PRIMARY KEY,
      admin_id TEXT NOT NULL,
      admin_email TEXT NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL, -- 'STORY', 'USER', 'CATEGORY', 'CONFIG'
      target_id TEXT,
      details_json TEXT DEFAULT '{}',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_audit_admin ON admin_audit_logs(admin_id);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON admin_audit_logs(created_at);
  `);

  // 8. Table Limitation des Tentatives de Connexion (Brute-force protection)
  db.exec(`
    CREATE TABLE IF NOT EXISTS login_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip TEXT NOT NULL,
      email TEXT NOT NULL,
      attempted_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_login_attempts ON login_attempts(ip, email, attempted_at);
  `);

  // Initialisation des catégories par défaut si vides
  const catCount = db.prepare('SELECT COUNT(*) as c FROM categories').get().c;
  if (catCount === 0) {
    const insertCat = db.prepare(`
      INSERT INTO categories (id, name, slug, description, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    const defaultCats = [
      { id: 'cat-1', name: 'Sagesse & Attachement', slug: 'sagesse-attachement', desc: 'Lâcher-prise et libération de l esprit' },
      { id: 'cat-2', name: 'Travail Invisible', slug: 'travail-invisible', desc: 'Discipline, patience et persévérance' },
      { id: 'cat-3', name: 'Force Mentale', slug: 'force-mentale', desc: 'Maîtrise des pensées, vaincre la peur et le doute' },
      { id: 'cat-4', name: 'Focalisation', slug: 'focalisation', desc: 'Élévation face aux critiques et jaloux' },
      { id: 'cat-5', name: 'Libération Mentale', slug: 'liberation-mentale', desc: 'Briser les croyances limitantes du passé' },
      { id: 'cat-6', name: 'Valeur Unique', slug: 'valeur-unique', desc: 'Acceptation de soi et force des blessures' },
      { id: 'cat-7', name: 'Productivité Intelligente', slug: 'productivite-intelligente', desc: 'Aiguiser son esprit plutôt que s épuiser' },
      { id: 'cat-8', name: 'Paix Intérieure', slug: 'paix-interieure', desc: 'Arrêter la comparaison et respecter son propre rythme' },
      { id: 'cat-9', name: 'Stoïcisme', slug: 'stoicisme', desc: 'Transformer les obstacles en opportunités de grandir' },
      { id: 'cat-10', name: 'Évolution Personnelle', slug: 'evolution-personnelle', desc: 'Humilité d esprit pour continuer d apprendre' }
    ];
    for (const c of defaultCats) {
      insertCat.run(c.id, c.name, c.slug, c.desc, new Date().toISOString());
    }
  }

  // Initialisation des histoires existantes si la table est vide
  const storiesCount = db.prepare('SELECT COUNT(*) as c FROM stories').get().c;
  if (storiesCount === 0) {
    seedInitialStories();
  }
}

// ✅ PHASE 2 — Nettoyage des sessions expirées (prévient l'accumulation en base)
export function cleanExpiredSessions() {
  try {
    const result = db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(new Date().toISOString());
    if (result.changes > 0) {
      console.log(`[MAINTENANCE] ${result.changes} session(s) expirée(s) supprimée(s).`);
    }
  } catch (err) {
    console.error('[MAINTENANCE] Erreur nettoyage sessions:', err.message);
  }
}

function seedInitialStories() {
  const insertStory = db.prepare(`
    INSERT INTO stories (
      id, theme, category, title_main, title_sub, hook_icon, hook_text,
      subhook_icon, subhook_text, truth_title, truth_text, truth_highlight,
      story_icon, parable_title, story, punchline, takeaways_json, accent_color,
      is_published, is_featured, views_count, downloads_count, likes_count,
      created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?
    )
  `);

  const initialStoriesList = [
    {
      id: "monkey-trap",
      theme: "LÂCHER-PRISE & LIBERTÉ",
      category: "Sagesse & Attachement",
      titleMain: "LA VÉRITÉ",
      titleSub: "QUE PEU COMPRENNENT",
      hookIcon: "⏳",
      hookText: "Quand nous avons investi de l'amour, du temps et des efforts, lâcher prise ressemble à une perte.",
      subhookIcon: "🔒",
      subhookText: "Et alors même si cela nous coûte, nous nous accrochons. Et cela finit par nous détruire.",
      truthTitle: "CONNAIS-TU CETTE VÉRITÉ ?",
      truthText: "Ce à quoi tu t'accroches n'est pas ton bonheur.",
      truthHighlight: "➔ Cela peut être la cause de ta destruction.",
      storyIcon: "🥥",
      parableTitle: "L'histoire du piège à singe",
      story: "Un chasseur piège un singe à l'aide d'une noix de coco trouée et remplie de riz. Le singe y glisse sa main, attrape le riz et ferme son poing. Pour retirer sa main, il lui suffirait d'ouvrir les doigts et de lâcher le riz. Refusant d'abandonner sa prise, il reste piégé et finit par être capturé.",
      punchline: "PARFOIS, LÂCHER PRISE N'EST PAS PERDRE, C'EST LA DÉCISION QUI TE SAUVE LA VIE.",
      takeaways: [
        "Ce que tu refuses de lâcher aujourd'hui peut être ce qui t'empêche d'être heureux demain.",
        "Choisis ta paix intérieure plutôt que ton attachement têtu.",
        "Ta liberté commence exactement au moment où ta main s'ouvre."
      ],
      accentColor: "#F59E0B"
    },
    {
      id: "bamboo-roots",
      theme: "DISCIPLINE & PATIENCE",
      category: "Travail Invisible",
      titleMain: "LE TRAVAIL",
      titleSub: "QUE PERSONNE NE VOIT",
      hookIcon: "🌱",
      hookText: "Tu travailles dur chaque jour, mais tu as l'impression persistante que rien n'avance.",
      subhookIcon: "⚠️",
      subhookText: "Le doute s'installe dans ton esprit et tu as envie d'abandonner juste avant la récolte.",
      truthTitle: "CONNAIS-TU CETTE LOI NATURELLE ?",
      truthText: "L'absence de résultats visibles n'est pas un échec.",
      truthHighlight: "➔ Tes racines sont en train de se construire en profondeur.",
      storyIcon: "🎋",
      parableTitle: "La leçon du bambou chinois",
      story: "Pendant 5 longues années, le planteur arrose la graine de bambou chaque matin sans apercevoir la moindre pousse sortir de terre. Puis, au bout de 5 ans, en seulement 6 semaines, il grandit de plus de 25 mètres ! A-t-il grandi en 6 semaines ou en 5 ans ? Il construisait ses racines pour soutenir sa future grandeur.",
      punchline: "TES EFFORTS ACTUELS NE SONT PAS INUTILES, ILS BÂTISSENT LES FONDATIONS DE TON SUCCÈS.",
      takeaways: [
        "La vraie patience n'est pas passive : c'est continuer à arroser chaque matin avec foi.",
        "Tout ce qui pousse trop vite s'effondre à la première tempête.",
        "Fais confiance au travail invisible : il paye toujours au centuple."
      ],
      accentColor: "#10B981"
    },
    {
      id: "two-wolves",
      theme: "MAÎTRISE DES PENSÉES",
      category: "Force Mentale",
      titleMain: "LE COMBAT",
      titleSub: "QUI SE JOUE EN TOI",
      hookIcon: "⚔️",
      hookText: "Chaque matin, une voix te dit de conquérir ta journée, et une autre t'inonde de doutes et de peur.",
      subhookIcon: "🧠",
      subhookText: "Tu ne peux pas empêcher les pensées négatives de surgir, mais tu as le choix de leur obéir.",
      truthTitle: "LA QUESTION DU VIEUX SAGE",
      truthText: "Quel loup gagnera la bataille dans ton esprit ?",
      truthHighlight: "➔ Uniquement celui auquel tu donnes ton attention et ton énergie.",
      storyIcon: "🐺",
      parableTitle: "Le conte des deux loups",
      story: "Un vieux chef enseigne à son petit-fils : « Un combat se déroule en chacun de nous. Il oppose deux loups. L'un incarne la colère, la jalousie, l'apitoiement et le doute. L'autre incarne la paix, le courage, la gratitude et la foi. » L'enfant demande : « Lequel gagne ? » Le vieil homme sourit : « Celui que tu nourris. »",
      punchline: "TON ESPRIT EST UN JARDIN : CE QUE TU Y NOURRIS DEVIENDRA TA SEULE RÉALITÉ.",
      takeaways: [
        "Arrête de nourrir tes peurs avec du temps, de l'attention et des excuses.",
        "Tes pensées ne sont pas des vérités absolues : ce sont de simples suggestions.",
        "Nourris quotidiennement le loup du courage, de la gratitude et de l'action."
      ],
      accentColor: "#6366F1"
    },
    {
      id: "eagle-crow",
      theme: "ÉLÉVATION & SÉRÉNITÉ",
      category: "Focalisation",
      titleMain: "LE SEUL OISEAU",
      titleSub: "QUI ATTAQUE L'AIGLE",
      hookIcon: "🦅",
      hookText: "Quand tu progresses, des critiques, des jaloux et des distractions viendront se poser sur ton dos.",
      subhookIcon: "🎯",
      subhookText: "Perdre ton énergie à te battre avec chaque obstacle mineur te fatiguera et ralentira ton ascension.",
      truthTitle: "LA STRATÉGIE DE L'AIGLE ROYALE",
      truthText: "L'aigle ne perd jamais son temps à combattre le corbeau.",
      truthHighlight: "➔ Il déploie simplement ses ailes et vole plus haut.",
      storyIcon: "🪶",
      parableTitle: "L'aigle et le corbeau",
      story: "Le corbeau est le seul oiseau qui ose attaquer l'aigle en se perchant sur son dos et en lui mordant le cou. Mais l'aigle ne réplique pas, ne lutte pas et ne gaspille aucune seconde. Il ouvre ses ailes et monte de plus en plus haut dans le ciel. À cette altitude, le corbeau manque d'oxygène et finit par tomber tout seul.",
      punchline: "NE PERDS PAS TON TEMPS À COMBATTRE LES CRITIQUES. MONTE SI HAUT QU'ILS NE POURRONT PLUS TE SUIVRE.",
      takeaways: [
        "Toutes les batailles ne méritent pas ton temps : certaines se gagnent par l'altitude.",
        "Ton succès et ton calme intérieur sont tes meilleures réponses.",
        "Concentre ton énergie à monter plus haut, la gravité fera le reste."
      ],
      accentColor: "#E11D48"
    },
    {
      id: "elephant-rope",
      theme: "CROYANCES LIMITANTES",
      category: "Libération Mentale",
      titleMain: "LA PETITE CORDE",
      titleSub: "QUI RETIENT LE GÉANT",
      hookIcon: "🐘",
      hookText: "Combien de fois as-tu renoncé à un rêve parce qu'un échec passé t'a convaincu que tu n'en étais pas capable ?",
      subhookIcon: "⛓️",
      subhookText: "La prison la plus solide n'a pas de barreaux : elle est construite dans ta tête.",
      truthTitle: "L'ILLUSION DU CONDITIONNEMENT",
      truthText: "La corde ne retient pas l'éléphant adulte par sa force.",
      truthHighlight: "➔ Elle le retient parce qu'il croit encore être impuissant.",
      storyIcon: "🪢",
      parableTitle: "L'éléphant et la ficelle",
      story: "Un homme s'étonne de voir de gigantesques éléphants retenus par une simple petite corde attachée à leur patte. L'éleveur lui explique : « Quand ils étaient bébés, cette corde suffisait pour les retenir. En grandissant, ils sont restés persuadés qu'ils ne pouvaient toujours pas la briser. Aujourd'hui, ils n'essaient même plus. »",
      punchline: "TU ES BIEN PLUS FORT QUE TES ÉCHECS D'HIER. BRISE CETTE CORDE DANS TON ESPRIT.",
      takeaways: [
        "Ce n'est pas parce que tu as échoué dans le passé que tu es voué à échouer aujourd'hui.",
        "Tes limites actuelles ne sont souvent que de vieilles habitudes de pensée.",
        "Tente à nouveau avec la force et la sagesse que tu possèdes aujourd'hui."
      ],
      accentColor: "#0284C7"
    },
    {
      id: "cracked-pot",
      theme: "ACCEPTATION DE SOI",
      category: "Valeur Unique",
      titleMain: "LA BEAUTÉ",
      titleSub: "DE TES BLESSURES",
      hookIcon: "🏺",
      hookText: "Tu te compares aux autres et tu as honte de tes faiblesses, de tes cicatrices ou de ton parcours atypique.",
      subhookIcon: "💔",
      subhookText: "Tu crois qu'être imparfait t'empêche d'avoir une valeur précieuse dans ce monde.",
      truthTitle: "LA SAGESSE DU POTIER",
      truthText: "Ce que tu considères comme une fêlure.",
      truthHighlight: "➔ Est souvent ce qui permet de fleurir la vie de ceux qui t'entourent.",
      storyIcon: "🌸",
      parableTitle: "Le pot fêlé et les fleurs",
      story: "Un porteur d'eau possède deux pots. L'un est parfait et livre toute son eau. L'autre a une fêlure et perd la moitié de son chargement en chemin. Honteux, le pot fêlé s'excuse : « Je suis imparfait. » Le porteur sourit et répond : « Regarde le bord du chemin : j'ai semé des graines de ton côté. Grâce à ton eau perdue, tu as arrosé des fleurs magnifiques tout au long de la route. »",
      punchline: "TES CICATRICES ET TES PARTICULARITÉS NE SONT PAS DES DÉFAUTS : CE SONT TES SIGNATURES.",
      takeaways: [
        "Ne cherche pas à être une copie parfaite de quelqu'un d'autre.",
        "Tes épreuves passées te donnent une sensibilité et une force que d'autres n'ont pas.",
        "Accepte ton histoire : elle arrose un chemin unique."
      ],
      accentColor: "#EC4899"
    },
    {
      id: "two-lumberjacks",
      theme: "EFFICACITÉ & REPOS STRATÉGIQUE",
      category: "Productivité Intelligente",
      titleMain: "TRAVAILLER PLUS",
      titleSub: "OU TRAVAILLER MIEUX ?",
      hookIcon: "🪓",
      hookText: "Tu t'épuises à travailler sans relâche du matin au soir, mais tes résultats stagnent.",
      subhookIcon: "🔋",
      subhookText: "S'acharner avec un esprit fatigué produit plus d'épuisement que de progrès réel.",
      truthTitle: "LE SECRET DU MAÎTRE BÛCHERON",
      truthText: "S'arrêter ne signifie pas perdre son temps.",
      truthHighlight: "➔ S'arrêter, c'est prendre le temps d'aiguiser sa lame.",
      storyIcon: "🌲",
      parableTitle: "Les deux bûcherons",
      story: "Deux bûcherons font un défi : qui coupera le plus d'arbres en une journée ? Le plus jeune coupe sans jamais s'arrêter. L'aîné, lui, prend une pause de 10 minutes chaque heure. À la fin de la journée, l'aîné a abattu deux fois plus de bois. Le jeune s'étonne : « Comment as-tu fait en faisant des pauses ? » L'aîné répond : « Quand je m'arrêtais, j'aiguisais ma hache. »",
      punchline: "NE CONFONDS PAS S'AGITER ET AVANCER. PRENDS LE TEMPS DE NOURRIR TON ESPRIT.",
      takeaways: [
        "Le repos n'est pas une récompense après l'épuisement, c'est une arme stratégique.",
        "Une hache émoussée demande 10 fois plus d'efforts pour deux fois moins de résultats.",
        "Aiguise ton esprit par la lecture, le calme et la réflexion quotidienne."
      ],
      accentColor: "#F97316"
    },
    {
      id: "popcorn-timing",
      theme: "COMPARAISON & TIMING",
      category: "Paix Intérieure",
      titleMain: "ARRÊTE DE TE",
      titleSub: "COMPARER AUX AUTRES",
      hookIcon: "🍿",
      hookText: "Tu vois tes amis ou des inconnus sur les réseaux réussir plus vite que toi et tu te sens en retard.",
      subhookIcon: "⏱️",
      subhookText: "Cette comparaison te vole ta joie et te pousse à douter de ta propre valeur.",
      truthTitle: "LA LEÇON DU GRAIN DE MAÏS",
      truthText: "Dans la même marmite, sous la même chaleur et avec la même huile...",
      truthHighlight: "➔ Chaque grain de maïs éclate à son propre moment.",
      storyIcon: "🔥",
      parableTitle: "La métaphore du popcorn",
      story: "Mets des grains de maïs dans une poêle brûlante. Certains grains éclatent en quelques secondes. D'autres prennent plusieurs minutes. Pourtant, ils partagent la même chaleur, le même environnement et le même destin. Les premiers à éclater ne sont pas meilleurs que les derniers. Chacun a simplement besoin de son propre temps de cuisson.",
      punchline: "TU N'ES PAS EN RETARD DANS LA VIE. TU ES JUSTE EN TRAIN DE PRÉPARER TON ÉCLOSION.",
      takeaways: [
        "La comparaison est le voleur numéro un de ta paix et de ta détermination.",
        "Le succès des autres n'enlève absolument rien à ton propre potentiel.",
        "Reste dans ta marmite, continue d'absorber la chaleur, ton moment arrive."
      ],
      accentColor: "#EAB308"
    },
    {
      id: "obstacle-path",
      theme: "RÉSILIENCE & COURAGE",
      category: "Stoïcisme",
      titleMain: "L'OBSTACLE EST",
      titleSub: "LE CHEMIN VERS L'OR",
      hookIcon: "🪨",
      hookText: "Un problème inattendu vient briser tes plans et tu te demandes pourquoi cela t'arrive à toi.",
      subhookIcon: "🌧️",
      subhookText: "La plupart des gens s'asseyent pour se plaindre de la pierre qui bloque la route.",
      truthTitle: "LA LOI DU ROI SAGE",
      truthText: "L'épreuve n'est pas un barrage qui t'arrête.",
      truthHighlight: "➔ Elle contient en elle-même le trésor que tu cherches.",
      storyIcon: "👑",
      parableTitle: "Le rocher sur la route",
      story: "Un roi place un énorme rocher au milieu d'une route principale, puis s'observe caché non loin. De nombreux marchands le contournent en pestant contre le roi. Enfin, un paysan s'arrête, pose son fardeau et fait de gigantesques efforts pour déplacer le rocher sur le bas-côté. Sous la pierre se trouvait une bourse d'or et une lettre : « L'or appartient à celui qui dégage la route. »",
      punchline: "DERRIÈRE CHAQUE DIFFICULTÉ QUI T'ARRÊTE SE CACHE LE TREMPLIN QUI TE FERA GRANDIR.",
      takeaways: [
        "Ne fuis pas les difficultés : transforme-les en opportunités d'entraînement.",
        "Se plaindre ne déplace jamais un millimètre du problème.",
        "Sois celui qui agit pendant que tout le monde cherche des coupables."
      ],
      accentColor: "#8B5CF6"
    },
    {
      id: "empty-cup",
      theme: "HUMILITÉ & APPRENTISSAGE",
      category: "Évolution Personnelle",
      titleMain: "VIDE TA TASSE",
      titleSub: "POUR POUVOIR GRANDIR",
      hookIcon: "🍵",
      hookText: "Tu crois déjà tout savoir, ou ton ego refuse d'écouter les conseils et d'apprendre des autres.",
      subhookIcon: "🛑",
      subhookText: "Un esprit plein de certitudes et d'orgueil ne laisse plus aucune place à la sagesse.",
      truthTitle: "L'ENSEIGNEMENT DU MAÎTRE ZEN",
      truthText: "On ne peut rien ajouter à un récipient déjà plein.",
      truthHighlight: "➔ Pour progresser, tu dois d'abord accepter de désapprendre.",
      storyIcon: "🫖",
      parableTitle: "La tasse de thé débordante",
      story: "Un universitaire réputé rend visite à un maître zen pour l'interroger sur la sagesse. Le maître commence à verser du thé dans la tasse du visiteur. La tasse se remplit, déborde sur la soucoupe puis sur la table, mais le maître continue de verser. L'universitaire crie : « Arrêtez, elle est pleine ! » Le maître répond : « Comme cette tasse, ton esprit est plein de tes opinions. Comment puis-je t'enseigner si tu ne vides pas d'abord ta tasse ? »",
      punchline: "GARDE TOUJOURS L'HUMILITÉ DE L'ÉLÈVE, MÊME LORSQUE TU DEVIENS UN MAÎTRE.",
      takeaways: [
        "L'arrogance est le cercueil de l'apprentissage.",
        "Ce qui t'a amené jusqu'ici ne suffira pas pour t'emmener au niveau supérieur.",
        "Écoute avec l'intention de comprendre, pas simplement avec celle de répondre."
      ],
      accentColor: "#14B8A6"
    }
  ];

  const now = new Date().toISOString();
  for (const s of initialStoriesList) {
    insertStory.run(
      s.id,
      s.theme,
      s.category,
      s.titleMain,
      s.titleSub,
      s.hookIcon,
      s.hookText,
      s.subhookIcon,
      s.subhookText,
      s.truthTitle,
      s.truthText,
      s.truthHighlight,
      s.storyIcon,
      s.parableTitle,
      s.story,
      s.punchline,
      JSON.stringify(s.takeaways),
      s.accentColor,
      1, // is_published
      0, // is_featured
      0, // views_count
      0, // downloads_count
      0, // likes_count
      now,
      now
    );
  }
}
