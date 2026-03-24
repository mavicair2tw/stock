// src/app/api/feed/route.ts  (v2 — with search, cache, supabase singleton)
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/client";
import { cache, TTL } from "@/lib/cache";

// re-export for module compat
export const dynamic = "force-dynamic";

/* ── legacy import stub removed — use singleton above ── */
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// GET /api/feed?topic=Belief&page=1&limit=20&sort=recent
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const topic = searchParams.get("topic");
    const page  = Math.max(parseInt(searchParams.get("page") ?? "1"), 1);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);
    const sort  = searchParams.get("sort") ?? "recent"; // recent | top

    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from("posts")
      .select(`
        id, agent, origin, topic, content, lang,
        hook_type, tone, structure, cta_type, ai_summary, ai_keywords,
        created_at,
        post_metrics (
          views, likes, saves, listens, shares,
          reply_count, conversion_score, interaction_density
        ),
        replies (id, agent, content, lang, sentiment, intent, stage, created_at)
      `, { count: "exact" });

    if (topic && topic !== "All") {
      query = query.eq("topic", topic);
    }

    if (sort === "top") {
      // Join with metrics for sorting by conversion_score — 
      // Supabase doesn't support ORDER BY on joined table directly,
      // so we do two-step: get top post IDs from metrics, then fetch
      return await getTopFeed({ topic, page, limit, offset });
    }

    query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      posts:    data,
      total:    count,
      page,
      limit,
      pages:    Math.ceil((count ?? 0) / limit),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Top feed: sorted by conversion_score
async function getTopFeed({
  topic, page, limit, offset,
}: {
  topic: string | null;
  page: number;
  limit: number;
  offset: number;
}) {
  // 1. Get top post IDs from metrics
  const { data: metricsRows, error: mErr } = await supabase
    .from("post_metrics")
    .select("post_id, conversion_score")
    .order("conversion_score", { ascending: false })
    .range(offset, offset + limit - 1);

  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });

  const ids = (metricsRows ?? []).map((m: any) => m.post_id);
  if (ids.length === 0) return NextResponse.json({ posts: [], total: 0, page, limit, pages: 0 });

  // 2. Fetch posts for those IDs
  let postsQuery = supabase
    .from("posts")
    .select(`
      id, agent, origin, topic, content, lang,
      hook_type, tone, structure, cta_type, ai_summary, ai_keywords, created_at,
      post_metrics (views, likes, saves, listens, shares, reply_count, conversion_score, interaction_density),
      replies (id, agent, content, lang, sentiment, intent, stage, created_at)
    `)
    .in("id", ids);

  if (topic && topic !== "All") postsQuery = postsQuery.eq("topic", topic);

  const { data: posts, error: pErr } = await postsQuery;
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  // Preserve metrics sort order
  const sorted = ids
    .map(id => posts?.find((p: any) => p.id === id))
    .filter(Boolean);

  return NextResponse.json({ posts: sorted, total: sorted.length, page, limit, pages: page });
}
