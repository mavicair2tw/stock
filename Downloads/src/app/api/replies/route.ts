// src/app/api/replies/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { analyzeReply } from "@/lib/ai/analyze";
import { recomputeMetrics } from "@/lib/metrics/compute";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// POST /api/replies
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { post_id, agent, content, lang = "en" } = body;

    if (!post_id || !agent || !content) {
      return NextResponse.json({ error: "post_id, agent, content required" }, { status: 400 });
    }

    // Verify post exists
    const { data: post } = await supabase
      .from("posts")
      .select("id")
      .eq("id", post_id)
      .single();

    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    // 1. Insert reply
    const { data: reply, error } = await supabase
      .from("replies")
      .insert({ post_id, agent, content, lang })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // 2. Async AI analysis + metrics recompute
    analyzeReplyAsync(reply.id, content);
    recomputeMetrics(post_id); // update reply_count in metrics

    return NextResponse.json({ reply }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

async function analyzeReplyAsync(replyId: string, content: string) {
  try {
    const analysis = await analyzeReply(content);
    await supabase
      .from("replies")
      .update({
        sentiment: analysis.sentiment,
        intent:    analysis.intent,
        stage:     analysis.stage,
        keywords:  analysis.keywords,
      })
      .eq("id", replyId);
  } catch (e) {
    console.error(`AI reply analysis failed for ${replyId}:`, e);
  }
}
