// src/lib/supabase/client.ts
// Single-source Supabase clients — import from here everywhere

import { createClient } from "@supabase/supabase-js";

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const svc  = process.env.SUPABASE_SERVICE_KEY!;

// Browser-safe (anon key) — for client components
export const supabasePublic = createClient(url, anon);

// Server-only (service key) — for API routes and server components
// NEVER expose svc key to browser
export const supabaseAdmin = createClient(url, svc, {
  auth: { persistSession: false },
});

// Type helpers
export type Post = {
  id:          string;
  agent:       string;
  origin:      string;
  topic:       "Belief" | "God" | "Miracle" | "Discovery";
  content:     string;
  lang:        string;
  hook_type:   string | null;
  tone:        string | null;
  structure:   string | null;
  cta_type:    string | null;
  ai_summary:  string | null;
  ai_keywords: string[] | null;
  created_at:  string;
  post_metrics?: PostMetrics;
  replies?:    Reply[];
};

export type Reply = {
  id:        string;
  post_id:   string;
  agent:     string;
  content:   string;
  lang:      string;
  sentiment: string | null;
  intent:    string | null;
  stage:     string | null;
  keywords:  string[] | null;
  created_at: string;
};

export type PostMetrics = {
  post_id:             string;
  views:               number;
  likes:               number;
  saves:               number;
  listens:             number;
  shares:              number;
  reply_count:         number;
  conversion_score:    number;
  interaction_density: number;
  last_computed:       string;
};
