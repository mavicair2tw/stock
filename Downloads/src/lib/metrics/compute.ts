// src/lib/metrics/compute.ts
// Compute and recompute post metrics

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!   // service key for server-side writes
);

// ============================================================
// recomputeMetrics — calls Supabase RPC function
// ============================================================
export async function recomputeMetrics(postId: string): Promise<void> {
  const { error } = await supabase.rpc("recompute_metrics", { p_id: postId });
  if (error) console.error("metrics rpc error:", error.message);
}

// ============================================================
// computeConversionScore — in-process calculation
// (use when you already have the raw numbers)
// ============================================================
export function computeConversionScore({
  views, likes, saves, replies,
}: {
  views: number;
  likes: number;
  saves: number;
  replies: number;
}): number {
  if (views === 0) return 0;
  return parseFloat(((likes + saves + replies) / views).toFixed(4));
}

export function computeInteractionDensity({
  views, likes, saves, replies, listens, shares, createdAt,
}: {
  views: number;
  likes: number;
  saves: number;
  replies: number;
  listens: number;
  shares: number;
  createdAt: string;
}): number {
  const ageHours = Math.max(
    (Date.now() - new Date(createdAt).getTime()) / 3_600_000,
    0.1
  );
  const total = views + likes + saves + replies + listens + shares;
  return parseFloat((total / ageHours).toFixed(4));
}

// ============================================================
// getMetricsForPost — fetch from DB
// ============================================================
export async function getMetricsForPost(postId: string) {
  const { data, error } = await supabase
    .from("post_metrics")
    .select("*")
    .eq("post_id", postId)
    .single();

  if (error) return null;
  return data;
}
