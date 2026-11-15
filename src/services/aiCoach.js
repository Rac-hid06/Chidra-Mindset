// Service de Génération IA Chidra Mindset 🧠 Multi-Styles

export const AI_STYLES = [
  { id: 'stoic', name: 'Stoïcien & Maîtrise', icon: '🏛️', color: '#6366F1', desc: 'Maîtrise des émotions, focus sur ce que tu contrôles' },
  { id: 'warrior', name: 'Guerrier & Sans Excuse', icon: '⚔️', color: '#EF4444', desc: 'Discipline de fer, impact direct, action brute' },
  { id: 'zen', name: 'Sagesse Zen & Nature', icon: '🎋', color: '#10B981', desc: 'Parabole métaphorique ancienne, paix et patience' },
  { id: 'business', name: 'Visionnaire & Stratégie', icon: '🦅', color: '#F59E0B', desc: 'Ambition, persévérance et dépassement' }
];

const fallbackCatalog = {
  stoic: {
    theme: "STOÏCISME & CONTRÔLE DE L'ESPRIT",
    category: "Stoïcisme",
    titleMain: "LA CITADELLE",
    titleSub: "INTÉRIEURE INVIOLABLE",
    hookIcon: "🏛️",
    hookText: "Les événements extérieurs te bousculent et tu laisses le chaos dicter ton état d'âme.",
    subhookIcon: "⚡",
    subhookText: "Donner aux circonstances le pouvoir de t'énerver, c'est choisir volontairement d'être esclave.",
    truthTitle: "LA DISTINCTION DE MARC AURÈLE",
    truthText: "Ce ne sont pas les choses qui te troublent...",
    truthHighlight: "➔ C'est uniquement le jugement que tu portes sur elles.",
    storyIcon: "🛡️",
    parableTitle: "Le phare dans la tempête",
    story: "Les vagues furieuses frappent le pied du phare jour et nuit. Les éclairs déchirent le ciel au-dessus de lui. Mais le phare ne négocie pas avec la tempête, ne tremble pas et ne s'éteint jamais. Il reste ancré sur son roc et continue d'éclairer l'océan dans le silence absolu.",
    punchline: "TU NE PEUX PAS CONTRÔLER LE VENT, MAIS TU CONTRÔLES TES VOILES ET TON ESPRIT.",
    takeaways: [
      "Sépare ce qui dépend de toi de ce qui n'en dépend absolument pas.",
      "Réponds au désordre du monde par un calme inébranlable.",
      "Ta paix intérieure est ta forteresse la plus précieuse."
    ],
    accentColor: "#6366F1"
  },
  warrior: {
    theme: "DISCIPLINE BRUTE & CONQUÊTE",
    category: "Mental Guerrier",
    titleMain: "PAS D'EXCUSES",
    titleSub: "JUSTE DES RÉSULTATS",
    hookIcon: "⚔️",
    hookText: "Tu attends que les conditions soient faciles pour te mettre au travail avec intensité.",
    subhookIcon: "🩸",
    subhookText: "La complaisance et le confort tiède sont les poisons lents qui assassinent ton potentiel.",
    truthTitle: "LE CODE DU COMBATTANT",
    truthText: "La sueur que tu verses aujourd'hui à l'entraînement...",
    truthHighlight: "➔ Est le sang que tu ne verseras pas sur le champ de bataille.",
    storyIcon: "🐺",
    parableTitle: "L'épreuve du jeune spartiate",
    story: "Un jeune guerrier se plaint à son commandant : « Mon épée est trop courte pour toucher l'ennemi ! » Le commandant le regarde sans ciller et répond : « Fais un pas de plus vers l'avant. » Ce qui te manque en équipement ou en chance doit être comblé par ton courage et ton audace.",
    punchline: "LA DOULEUR DE LA DISCIPLINE NE DURE QU'UN INSTANT, CELLE DU REGRET RESTE TOUTE UNE VIE.",
    takeaways: [
      "Fais ce qui doit être fait, que tu en aies envie ou non.",
      "Arrête d'attendre la motivation : impose-toi l'action.",
      "Chaque répétition difficile te sépare de la médiocrité."
    ],
    accentColor: "#EF4444"
  },
  zen: {
    theme: "SAGESSE ZEN & LÂCHER-PRISE",
    category: "Paix Intérieure",
    titleMain: "L'EAU CALME",
    titleSub: "QUI REFUSE D'ÊTRE BRISÉE",
    hookIcon: "🌊",
    hookText: "Tu t'épuises à lutter contre ce qui est déjà arrivé et à ressasser le passé.",
    subhookIcon: "🍂",
    subhookText: "Vouloir retenir l'eau qui s'écoule entre tes doigts ne fait que te laisser les mains vides.",
    truthTitle: "LA LEÇON DE LA RIVIÈRE",
    truthText: "L'eau ne combat jamais les rochers qui se dressent devant elle...",
    truthHighlight: "➔ Elle les contourne avec douceur, et finit par creuser les montagnes.",
    storyIcon: "🎋",
    parableTitle: "Le roseau et le grand chêne",
    story: "Un orage violent s'abat sur la vallée. Le grand chêne rigide refuse de plier et finit déraciné par la rafale. À côté de lui, le roseau s'incline profondément avec humilité. Une fois la tempête passée, le roseau se redresse indemne et contemple le ciel clair.",
    punchline: "LA FLEXIBILITÉ EST FORCE. LA RAIDEUR D'ESPRIT N'EST QUE FRAGILITÉ DÉGUISÉE.",
    takeaways: [
      "Accepte le moment présent tel qu'il est avant d'agir.",
      "Ne gaspille pas ton énergie contre des choses immuables.",
      "La patience et la douceur triomphent toujours de la brutalité."
    ],
    accentColor: "#10B981"
  },
  business: {
    theme: "AMBITION & PERSÉVÉRANCE",
    category: "Entrepreneuriat",
    titleMain: "LA LOI DU",
    titleSub: "FORGERON ET DU MÉTAL",
    hookIcon: "💼",
    hookText: "Tu doutes de ton projet parce que les ventes tardent et que les clients se font rares.",
    subhookIcon: "🔥",
    subhookText: "Vouloir abandonner face à la chaleur du début t'empêche de voir la trempe de ton entreprise.",
    truthTitle: "LA LEÇON DU MAÎTRE FORGERON",
    truthText: "Le fer brut ne devient une épée indestructible...",
    truthHighlight: "➔ Qu'après avoir survécu aux coups les plus violents du marteau.",
    storyIcon: "🔨",
    parableTitle: "Le bloc de fer et l'enclume",
    story: "Un jeune forgeron se lamente : « Chaque coup de marteau me fait mal, pourquoi dois-je frapper si fort ? » Le vieux maître lui montre un morceau de fer abandonné qui a rouillé au fond de l'atelier : « Lui n'a jamais souffert du feu ni des coups, mais il n'a servi à rien. Chaque coup que ton projet encaisse forge sa valeur de demain. »",
    punchline: "LES AFFAIRES QUI DURENT SONT CELLES QUI ONT REFUSÉ DE FONDRE PENDANT LA TEMPÊTE.",
    takeaways: [
      "Un échec commercial est une donnée pour corriger ta stratégie.",
      "L'enthousiasme lance le projet, mais seule la persévérance le rend rentable.",
      "Ne change pas de rêve : ajuste simplement tes méthodes."
    ],
    accentColor: "#F59E0B"
  }
};

/**
 * Génère une parabole sur-mesure Chidra Mindset selon un style choisi
 */
export async function generateChidraParable(userProblem, styleId = 'stoic', apiKey = '') {
  const selectedStyle = AI_STYLES.find(s => s.id === styleId) || AI_STYLES[0];

  if (apiKey) {
    try {
      const prompt = `Tu es le Coach officiel Chidra Mindset 🧠.
Style d'écriture imposé : "${selectedStyle.name}" (${selectedStyle.desc}).
Le compte officiel est TikTok : @chidramindset1.

Situation de l'utilisateur :
"${userProblem}"

Règles de style :
- Si style "Guerrier", le ton est direct, viril, percutant, sans complaisance.
- Si style "Stoïcien", le ton est philosophique, calme, focalisé sur la maîtrise de soi.
- Si style "Zen", le ton est imagé, poétique, axé sur la nature et la patience.
- Si style "Visionnaire / Business", le ton est ambitieux, stratégique, axé sur les résultats.

Réponds STRICTEMENT par un JSON valide (sans \`\`\`json ni texte autour) avec le schéma exact suivant :
{
  "theme": "THÈME EN MAJUSCULES",
  "category": "${selectedStyle.name}",
  "titleMain": "TITRE PRINCIPAL EN MAJUSCULES",
  "titleSub": "SOUS-TITRE PERCUTANT EN MAJUSCULES",
  "hookIcon": "${selectedStyle.icon}",
  "hookText": "Constat psychologique direct sur le problème (1 phrase percutante)",
  "subhookIcon": "Emoji",
  "subhookText": "Pourquoi cette attitude détruit les ambitions (1 phrase percutante)",
  "truthTitle": "CONNAIS-TU CETTE VÉRITÉ ?",
  "truthText": "La vérité essentielle que la personne ignore",
  "truthHighlight": "➔ Phrase d'impact avec flèche",
  "storyIcon": "Emoji adapté",
  "parableTitle": "L'histoire de ...",
  "story": "Une parabole ou métaphore captivante de 3 à 4 phrases.",
  "punchline": "UNE PHRASE CHOC ENTIÈREMENT EN MAJUSCULES QUI MARQUE L'ESPRIT",
  "takeaways": [
    "Conseil concret numéro 1",
    "Conseil concret numéro 2",
    "Conseil concret numéro 3"
  ],
  "accentColor": "${selectedStyle.color}"
}`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.75,
            responseMimeType: "application/json"
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (jsonText) {
          const parsed = JSON.parse(jsonText);
          parsed.id = `ai-${Date.now()}`;
          parsed.tags = ["ia", selectedStyle.id, parsed.theme?.toLowerCase()];
          return parsed;
        }
      }
    } catch (err) {
      console.warn("Gemini API fallback sur moteur Chidra :", err);
    }
  }

  // Simulation intelligente avec temporisation immersive
  await new Promise(r => setTimeout(r, 1200));

  const base = fallbackCatalog[styleId] || fallbackCatalog.stoic;
  return {
    ...base,
    id: `ai-${Date.now()}`,
    tags: ["ia", selectedStyle.id, "sur-mesure"],
    hookText: `Face à ce défi (« ${userProblem.slice(0, 45)}... »), ton esprit doit adopter la posture du ${selectedStyle.name}.`
  };
}
