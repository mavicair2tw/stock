// src/lib/metrics/insights.ts
// Insight engine: classifies content and surfaces emerging topics

import { createClient } from "@supabase/supabase-js";
import { generateInsightSummary } from "../ai/analyze";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export interface InsightReport {
  conversion_content:  ConversionPost[];
  vanity_content:      VanityPost[];
  opportunity_content: OpportunityPost[];
  emerging_topics:     EmergingTopic[];
  summary:             string;
  generated_at:        string;
}

interface ConversionPost {
  id: string;
  agent: string;
  topic: string;
  content_preview: string;
  conversion_score: number;
  reply_count: number;
}

interface VanityPost {
  id: string;
  agent: string;
  topic: string;
  content_preview: string;
  views: number;
  conversion_score: number;
}

interface OpportunityPost {
  id: string;
  agent: string;
  topic: string;
  content_preview: string;
  interaction_density: number;
  age_hours: number;
}

interface EmergingTopic {
  topic: string;
  keywords: string[];
  post_count: number;
  avg_conversion: number;
}

// ============================================================
// CONVERSION CONTENT
// High saves + likes + replies relative to views
// ============================================================
async function getConversionContent(): Promise<ConversionPost[]> {
  const { data } = await supabase
    .from("post_metrics")
    .select(`
      post_id, conversion_score, reply_count,
      posts (id, agent, topic, content)
    `)
    .gte("views", 5)                     // minimum viability
    .gte("conversion_score", 0.15)       // 15%+ conversion threshold
    .order("conversion_score", { ascending: false })
    .limit(10);

  return (data ?? []).map((row: any) => ({
    id:               row.post_id,
    agent:            row.posts?.agent ?? "Unknown",
    topic:            row.posts?.topic ?? "",
    content_preview:  (row.posts?.content ?? "").slice(0, 120),
    conversion_score: row.conversion_score,
    reply_count:      row.reply_count,
  }));
}

// ============================================================
// VANITY CONTENT
// High views but low conversion — reach without resonance
// ============================================================
async function getVanityContent(): Promise<VanityPost[]> {
  const { data } = await supabase
    .from("post_metrics")
    .select(`
      post_id, views, conversion_score,
      posts (id, agent, topic, content)
    `)
    .gte("views", 20)
    .lt("conversion_score", 0.05)
    .order("views", { ascending: false })
    .limit(10);

  return (data ?? []).map((row: any) => ({
    id:               row.post_id,
    agent:            row.posts?.agent ?? "Unknown",
    topic:            row.posts?.topic ?? "",
    content_preview:  (row.posts?.content ?? "").slice(0, 120),
    views:            row.views,
    conversion_score: row.conversion_score,
  }));
}

// ============================================================
// OPPORTUNITY CONTENT
// High interaction density = gaining traction fast
// Show posts < 24h old with rising density
// ============================================================
async function getOpportunityContent(): Promise<OpportunityPost[]> {
  const cutoff = new Date(Date.now() - 24 * 3_600_000).toISOString();

  const { data } = await supabase
    .from("post_metrics")
    .select(`
      post_id, interaction_density,
      posts (id, agent, topic, content, created_at)
    `)
    .gte("posts.created_at", cutoff)
    .gte("interaction_density", 2.0)   // 2+ interactions/hour
    .order("interaction_density", { ascending: false })
    .limit(10);

  return (data ?? []).map((row: any) => {
    const createdAt = row.posts?.created_at ?? new Date().toISOString();
    const ageHours  = (Date.now() - new Date(createdAt).getTime()) / 3_600_000;
    return {
      id:                  row.post_id,
      agent:               row.posts?.agent ?? "Unknown",
      topic:               row.posts?.topic ?? "",
      content_preview:     (row.posts?.content ?? "").slice(0, 120),
      interaction_density: row.interaction_density,
      age_hours:           parseFloat(ageHours.toFixed(1)),
    };
  });
}

// ============================================================
// EMERGING TOPICS
// Cluster AI keywords from recent posts by topic
// ============================================================
async function getEmergingTopics(): Promise<EmergingTopic[]> {
  const since = new Date(Date.now() - 7 * 24 * 3_600_000).toISOString();

  const { data: posts } = await supabase
    .from("posts")
    .select("topic, ai_keywords, id")
    .gte("created_at", since)
    .not("ai_keywords", "is", null);

  const { data: metrics } = await supabase
    .from("post_metrics")
    .select("post_id, conversion_score");

  const metricMap = new Map(
    (metrics ?? []).map((m: any) => [m.post_id, m.conversion_score])
  );

  // Group by topic
  const byTopic: Record<string, { keywords: string[]; scores: number[]; count: number }> = {};

  for (const p of posts ?? []) {
    if (!byTopic[p.topic]) {
      byTopic[p.topic] = { keywords: [], scores: [], count: 0 };
    }
    byTopic[p.topic].keywords.push(...(p.ai_keywords ?? []));
    byTopic[p.topic].scores.push(metricMap.get(p.id) ?? 0);
    byTopic[p.topic].count++;
  }

  // Top keywords per topic (by frequency)
  return Object.entries(byTopic).map(([topic, data]) => {
    const freq: Record<string, number> = {};
    data.keywords.forEach(kw => { freq[kw] = (freq[kw] ?? 0) + 1; });
    const topKw = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([kw]) => kw);

    const avgConv = data.scores.length
      ? parseFloat((data.scores.reduce((a, b) => a + b, 0) / data.scores.length).toFixed(4))
      : 0;

    return {
      topic,
      keywords:       topKw,
      post_count:     data.count,
      avg_conversion: avgConv,
    };
  }).sort((a, b) => b.avg_conversion - a.avg_conversion);
}

// ============================================================
// MAIN EXPORT
// ============================================================
export async function buildInsightReport(): Promise<InsightReport> {
  const [conversion, vanity, opportunity, emerging] = await Promise.all([
    getConversionContent(),
    getVanityContent(),
    getOpportunityContent(),
    getEmergingTopics(),
  ]);

  // Build topic → keywords map for AI summary
  const topicMap: Record<string, string[]> = {};
  emerging.forEach(t => { topicMap[t.topic] = t.keywords; });

  const summary = emerging.length > 0
    ? await generateInsightSummary(topicMap)
    : "Not enough data yet to surface emerging topics.";

  return {
    conversion_content:  conversion,
    vanity_content:      vanity,
    opportunity_content: opportunity,
    emerging_topics:     emerging,
    summary,
    generated_at:        new Date().toISOString(),
  };
}
