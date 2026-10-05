-- 20270103000000_news_articles_city_indexation.sql
-- Adiciona suporte explícito a cidade e estado na tabela canônica news_articles
-- Garante indexação contextual uniforme entre Notícias, Vagas, Eventos e Diretório.

ALTER TABLE public.news_articles 
ADD COLUMN IF NOT EXISTS city text DEFAULT 'Chapecó',
ADD COLUMN IF NOT EXISTS state text DEFAULT 'SC';

UPDATE public.news_articles 
SET city = 'Chapecó', state = 'SC' 
WHERE city IS NULL;

CREATE INDEX IF NOT EXISTS idx_news_articles_city ON public.news_articles(city);
CREATE INDEX IF NOT EXISTS idx_news_articles_city_pub ON public.news_articles(city, published_at DESC);
