-- Adiciona coluna aspect_ratio na tabela public.posts para unificar os layouts de vitrine e mural
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS aspect_ratio TEXT DEFAULT 'auto';
COMMENT ON COLUMN public.posts.aspect_ratio IS 'Proporção geométrica canônica da mídia do post (auto, 1:1, 4:5, 16:9, 9:16)';
