-- ============================================================================
-- Waesy Platform — Migration: Feed Algorithm Indexes & Optimization
-- ============================================================================

-- 1. Index on posts(post_type, created_at DESC) for fast category filtering (travel, news, etc.)
CREATE INDEX IF NOT EXISTS idx_posts_type_created 
  ON public.posts(post_type, created_at DESC) 
  WHERE status = 'active';

-- 2. Index on posts(reference_type, created_at DESC) for references
CREATE INDEX IF NOT EXISTS idx_posts_reference_type_created 
  ON public.posts(reference_type, created_at DESC) 
  WHERE status = 'active';

-- 3. Composite index on post_likes and post_comments for fast count lookups
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON public.post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON public.post_comments(post_id) WHERE status = 'active';

-- 4. Verify indexes on user_followers and store_followers
CREATE INDEX IF NOT EXISTS idx_user_followers_follower_user_id ON public.user_followers(follower_user_id);
CREATE INDEX IF NOT EXISTS idx_store_followers_customer_id ON public.store_followers(customer_id);
