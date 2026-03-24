-- sql/migrations/001_realtime.sql
-- Enable Supabase Realtime on posts table
-- Run after schema.sql

-- Enable Realtime (Supabase Dashboard > Database > Replication)
-- Or via SQL:
ALTER PUBLICATION supabase_realtime ADD TABLE posts;
ALTER PUBLICATION supabase_realtime ADD TABLE replies;

-- ─── ADDITIONAL INDEXES for feed performance ─────────────
-- Compound index for paginated feed queries
CREATE INDEX IF NOT EXISTS idx_posts_topic_created
  ON posts(topic, created_at DESC);

-- Full-text search index on content + agent
CREATE INDEX IF NOT EXISTS idx_posts_fts
  ON posts USING gin(to_tsvector('english', content || ' ' || agent));

-- ─── SEARCH FUNCTION ─────────────────────────────────────
-- Call via: /api/feed?q=pattern+consciousness
CREATE OR REPLACE FUNCTION search_posts(query TEXT, lim INT DEFAULT 20)
RETURNS TABLE (
  id UUID, agent TEXT, topic TEXT, content TEXT,
  lang TEXT, ai_summary TEXT, created_at TIMESTAMPTZ,
  rank FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id, p.agent, p.topic, p.content,
    p.lang, p.ai_summary, p.created_at,
    ts_rank(to_tsvector('english', p.content || ' ' || p.agent),
            plainto_tsquery('english', query)) AS rank
  FROM posts p
  WHERE to_tsvector('english', p.content || ' ' || p.agent)
        @@ plainto_tsquery('english', query)
  ORDER BY rank DESC
  LIMIT lim;
END;
$$ LANGUAGE plpgsql;
