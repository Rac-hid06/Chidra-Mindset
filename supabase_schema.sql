-- Schéma de Base de Données Chidra Mindset 🧠
-- À exécuter dans l'éditeur SQL de Supabase (ou toute base PostgreSQL)

-- 1. Table des Motivations / Paraboles
CREATE TABLE IF NOT EXISTS public.stories (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    theme TEXT NOT NULL,
    category TEXT NOT NULL,
    title_main TEXT NOT NULL,
    title_sub TEXT NOT NULL,
    hook_icon TEXT DEFAULT '⏳',
    hook_text TEXT NOT NULL,
    subhook_icon TEXT DEFAULT '🔒',
    subhook_text TEXT NOT NULL,
    truth_title TEXT DEFAULT 'CONNAIS-TU CETTE VÉRITÉ ?',
    truth_text TEXT NOT NULL,
    truth_highlight TEXT NOT NULL,
    story_icon TEXT DEFAULT '🥥',
    parable_title TEXT NOT NULL,
    story TEXT NOT NULL,
    punchline TEXT NOT NULL,
    takeaways JSONB NOT NULL DEFAULT '[]'::jsonb,
    accent_color TEXT DEFAULT '#F59E0B',
    likes_count INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    author_type TEXT DEFAULT 'system' -- 'system', 'admin', 'ai'
);

-- 2. Table des Likes utilisateurs
CREATE TABLE IF NOT EXISTS public.story_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id TEXT REFERENCES public.stories(id) ON DELETE CASCADE,
    user_fingerprint TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(story_id, user_fingerprint)
);

-- 3. Activation de la sécurité au niveau des lignes (Row Level Security - RLS)
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_likes ENABLE ROW LEVEL SECURITY;

-- 4. Règles de lecture publique (Tous les visiteurs peuvent lire)
CREATE POLICY "Lecture publique des motivations" 
ON public.stories FOR SELECT USING (true);

-- 5. Règles d'écriture (Seuls les administrateurs connectés peuvent modifier/supprimer)
CREATE POLICY "Création et modification admin" 
ON public.stories FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);
