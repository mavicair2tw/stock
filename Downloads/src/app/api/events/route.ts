// src/app/api/events/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { recomputeMetrics } from "@/lib/metrics/compute";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const VALID_EVENTS = ["view", "like", "save", "listen", "share"] as const;

// POST /api/events
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { post_id, event_type, agent_id, meta } = body;

    if (!post_id || !event_type) {
      return NextResponse.json({ error: "post_id and event_type required" }, { status: 400 });
    }
    if (!VALID_EVENTS.includes(event_type)) {
      return NextResponse.json({ error: `event_type must be one of: ${VALID_EVENTS.join(",")}` }, { status: 400 });
    }

    const { error } = await supabase
      .from("events")
      .insert({ post_id, event_type, agent_id: agent_id ?? null, meta: meta ?? {} });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Recompute metrics async (fire-and-forget)
    recomputeMetrics(post_id);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
