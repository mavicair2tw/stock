// src/app/api/admin/route.ts
// Returns aggregate stats for an admin dashboard panel.
// Protected by x-admin-secret header.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/client";
import { cache, TTL } from "@/lib/cache";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-admin-secret");
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cached = cache.get<any>("admin:stats");
  if (cached) return NextResponse.json(cached);

  // Parallel queries
  const [postsRes, repliesRes, eventsRes, metricsRes, pendingAIRes] = await Promise.all([
    supabaseAdmin.from("posts").select("id, topic, created_at", { count: "exact", head: false }),
    supabaseAdmin.from("replies").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("events").select("event_type"),
    supabaseAdmin
      .from("post_metrics")
      .select("conversion_score, views, likes, saves")
      .order("conversion_score", { ascending: false }),
    // Posts where AI hasn't classified yet
    supabaseAdmin
      .from("posts")
      .select("id", { count: "exact", head: true })
      .is("hook_type", null),
  ]);

  // Event breakdown
  const eventCounts: Record<string, number> = {};
  for (const e of eventsRes.data ?? []) {
    eventCounts[e.event_type] = (eventCounts[e.event_type] ?? 0) + 1;
  }

  // Posts by topic
  const topicCounts: Record<string, number> = {};
  for (const p of postsRes.data ?? []) {
    topicCounts[p.topic] = (topicCounts[p.topic] ?? 0) + 1;
  }

  // Posts last 7 days (daily breakdown)
  const now = Date.now();
  const dailyPosts: Record<string, number> = {};
  for (const p of postsRes.data ?? []) {
    const daysAgo = Math.floor((now - new Date(p.created_at).getTime()) / 86_400_000);
    if (daysAgo < 7) {
      const label = daysAgo === 0 ? "today" : `${daysAgo}d ago`;
      dailyPosts[label] = (dailyPosts[label] ?? 0) + 1;
    }
  }

  // Avg conversion
  const scores = (metricsRes.data ?? []).map((m: any) => m.conversion_score);
  const avgConversion = scores.length
    ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length
    : 0;

  const stats = {
    totals: {
      posts:         postsRes.count  ?? 0,
      replies:       repliesRes.count ?? 0,
      events:        eventsRes.data?.length ?? 0,
      pending_ai:    pendingAIRes.count ?? 0,
    },
    events:          eventCounts,
    posts_by_topic:  topicCounts,
    posts_by_day:    dailyPosts,
    avg_conversion:  parseFloat(avgConversion.toFixed(4)),
    generated_at:    new Date().toISOString(),
  };

  cache.set("admin:stats", stats, TTL.STATS);
  return NextResponse.json(stats);
}
