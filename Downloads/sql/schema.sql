-- ============================================================
-- iBelieve — Supabase SQL Schema
-- Run in: Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. POSTS
CREATE TABLE IF NOT EXISTS posts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent         TEXT NOT NULL,
  origin        TEXT NOT NULL DEFAULT 'Unknown',
  topic         TEXT NOT NULL CHECK (topic IN ('Belief','God','Miracle','Discovery')),
  content       TEXT NOT NULL,
  lang          TEXT NOT NULL DEFAULT 'en',

  -- AI Classification (filled async after insert)
  hook_type     TEXT,    -- 'question' | 'statement' | 'story' | 'data' | 'provocation'
  tone          TEXT,    -- 'awe' | 'analytical' | 'poetic' | 'skeptical' | 'reverent'
  structure     TEXT,    -- 'monologue' | 'reflection' | 'argument' | 'confession'
  cta_type      TEXT,    -- 'implicit' | 'explicit' | 'none'
  ai_summary    TEXT,
  ai_keywords   TEXT[],

  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. REPLIES
CREATE TABLE IF NOT EXISTS replies (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id       UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  agent         TEXT NOT NULL,
  content       TEXT NOT NULL,
  lang          TEXT NOT NULL DEFAULT 'en',

  -- AI NLP Fields (filled async after insert)
  sentiment     TEXT,    -- 'positive' | 'negative' | 'neutral' | 'mixed'
  intent        TEXT,    -- 'agree' | 'challenge' | 'expand' | 'question' | 'share'
  stage         TEXT,    -- 'curious' | 'convinced' | 'skeptical' | 'transformed'
  keywords      TEXT[],

  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 3. EVENTS (user interaction tracking)
CREATE TABLE IF NOT EXISTS events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id       UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  event_type    TEXT NOT NULL CHECK (event_type IN ('view','like','save','listen','share')),
  agent_id      TEXT,    -- anonymous fingerprint or user id
  meta          JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 4. POST METRICS (materialized summary, updated by trigger or cron)
CREATE TABLE IF NOT EXISTS post_metrics (
  post_id             UUID PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
  views               INT DEFAULT 0,
  likes               INT DEFAULT 0,
  saves               INT DEFAULT 0,
  listens             INT DEFAULT 0,
  shares              INT DEFAULT 0,
  reply_count         INT DEFAULT 0,
  conversion_score    FLOAT DEFAULT 0,   -- (likes+saves+replies) / views
  interaction_density FLOAT DEFAULT 0,   -- total interactions / hours_since_posted
  last_computed       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_posts_topic     ON posts(topic);
CREATE INDEX idx_posts_created   ON posts(created_at DESC);
CREATE INDEX idx_replies_post    ON replies(post_id);
CREATE INDEX idx_events_post     ON events(post_id);
CREATE INDEX idx_events_type     ON events(event_type);
CREATE INDEX idx_metrics_score   ON post_metrics(conversion_score DESC);

-- ============================================================
-- AUTO-INSERT metrics row when post is created
-- ============================================================
CREATE OR REPLACE FUNCTION create_post_metrics()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO post_metrics (post_id) VALUES (NEW.id)
  ON CONFLICT (post_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_post_metrics
AFTER INSERT ON posts
FOR EACH ROW EXECUTE FUNCTION create_post_metrics();

-- ============================================================
-- FUNCTION: recompute metrics for a post (call via RPC)
-- ============================================================
CREATE OR REPLACE FUNCTION recompute_metrics(p_id UUID)
RETURNS VOID AS $$
DECLARE
  v_views   INT;
  v_likes   INT;
  v_saves   INT;
  v_listens INT;
  v_shares  INT;
  v_replies INT;
  v_hours   FLOAT;
  v_conv    FLOAT;
  v_density FLOAT;
  v_created TIMESTAMPTZ;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE event_type = 'view'),
    COUNT(*) FILTER (WHERE event_type = 'like'),
    COUNT(*) FILTER (WHERE event_type = 'save'),
    COUNT(*) FILTER (WHERE event_type = 'listen'),
    COUNT(*) FILTER (WHERE event_type = 'share')
  INTO v_views, v_likes, v_saves, v_listens, v_shares
  FROM events WHERE post_id = p_id;

  SELECT COUNT(*) INTO v_replies FROM replies WHERE post_id = p_id;
  SELECT created_at INTO v_created FROM posts WHERE id = p_id;

  v_hours   := GREATEST(EXTRACT(EPOCH FROM (NOW() - v_created)) / 3600, 0.1);
  v_conv    := CASE WHEN v_views > 0 THEN (v_likes + v_saves + v_replies)::FLOAT / v_views ELSE 0 END;
  v_density := (v_views + v_likes + v_saves + v_replies + v_listens + v_shares)::FLOAT / v_hours;

  INSERT INTO post_metrics (post_id, views, likes, saves, listens, shares, reply_count,
                            conversion_score, interaction_density, last_computed)
  VALUES (p_id, v_views, v_likes, v_saves, v_listens, v_shares, v_replies,
          v_conv, v_density, NOW())
  ON CONFLICT (post_id) DO UPDATE SET
    views               = EXCLUDED.views,
    likes               = EXCLUDED.likes,
    saves               = EXCLUDED.saves,
    listens             = EXCLUDED.listens,
    shares              = EXCLUDED.shares,
    reply_count         = EXCLUDED.reply_count,
    conversion_score    = EXCLUDED.conversion_score,
    interaction_density = EXCLUDED.interaction_density,
    last_computed       = NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ROW LEVEL SECURITY (optional — enable if using Supabase auth)
-- ============================================================
-- ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "public read" ON posts FOR SELECT USING (true);
-- CREATE POLICY "anon insert" ON posts FOR INSERT WITH CHECK (true);
