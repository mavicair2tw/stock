// src/app/api/cron/route.ts
// Scheduled metrics recomputer.
//
// VERCEL CRON: add to vercel.json:
//   "crons": [{ "path": "/api/cron", "schedule": "*/15 * * * *" }]
//
// GITHUB ACTIONS: call via curl every 15 minutes.
// SELF-HOSTED: use node-cron or a system crontab.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/client";
import { cache } from "@/lib/cache";

export const dynamic = "force-dynamic";

// Guard: only Vercel Cron or your secret may call this
function isAuthorized(req: NextRequest): boolean {
  // Vercel sets this header on cron invocations
  if (req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`) return true;
  // Allow manual trigger with admin secret
  if (req.headers.get("x-admin-secret") === process.env.ADMIN_SECRET) return true;
  return false;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  const results: { postId: string; ok: boolean; error?: string }[] = [];

  // Recompute metrics for posts updated in the last hour
  // (recently active = have new events)
  const oneHourAgo = new Date(Date.now() - 60 * 60_000).toISOString();

  const { data: activePostIds, error } = await supabaseAdmin
    .from("events")
    .select("post_id")
    .gte("created_at", oneHourAgo);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const uniqueIds = [...new Set((activePostIds ?? []).map((r: any) => r.post_id))];

  // Batch recompute — call Supabase RPC per post
  await Promise.allSettled(
    uniqueIds.map(async (postId: string) => {
      const { error: rpcErr } = await supabaseAdmin.rpc("recompute_metrics", { p_id: postId });
      results.push({ postId, ok: !rpcErr, error: rpcErr?.message });
    })
  );

  // Also recompute any posts that have never been computed (post_metrics.last_computed is null)
  const { data: staleIds } = await supabaseAdmin
    .from("post_metrics")
    .select("post_id")
    .lt("last_computed", new Date(Date.now() - 6 * 3_600_000).toISOString())
    .limit(50);

  await Promise.allSettled(
    (staleIds ?? [])
      .filter((r: any) => !uniqueIds.includes(r.post_id))
      .map(async (r: any) => {
        const { error: rpcErr } = await supabaseAdmin.rpc("recompute_metrics", { p_id: r.post_id });
        results.push({ postId: r.post_id, ok: !rpcErr, error: rpcErr?.message });
      })
  );

  // Bust feed and insights cache so next request is fresh
  cache.invalidatePrefix("feed:");
  cache.del("admin:stats");

  const elapsed = Date.now() - started;
  const failures = results.filter(r => !r.ok);

  console.info(`[cron] Recomputed ${results.length} posts in ${elapsed}ms. Failures: ${failures.length}`);

  return NextResponse.json({
    ok:        true,
    computed:  results.length,
    failures:  failures.length,
    elapsed_ms: elapsed,
    failed_ids: failures.map(f => f.postId),
  });
}

// Allow GET for manual browser testing (still requires auth)
export async function GET(req: NextRequest) {
  return POST(req);
}
