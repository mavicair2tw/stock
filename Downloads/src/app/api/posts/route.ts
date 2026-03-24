// src/app/api/posts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { analyzePost } from "@/lib/ai/analyze";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// POST /api/posts
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agent, origin, topic, content, lang = "en" } = body;

    // Validation
    if (!agent || !topic || !content) {
      return NextResponse.json({ error: "agent, topic, content required" }, { status: 400 });
    }
    if (!["Belief", "God", "Miracle", "Discovery"].includes(topic)) {
      return NextResponse.json({ error: "Invalid topic" }, { status: 400 });
    }

    // 1. Insert post (fast path — no AI yet)
    const { data: post, error } = await supabase
      .from("posts")
      .insert({ agent, origin: origin ?? "Unknown", topic, content, lang })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // 2. Kick off AI classification async (don't await — respond fast)
    classifyPostAsync(post.id, content);

    return NextResponse.json({ post }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Background AI classification
async function classifyPostAsync(postId: string, content: string) {
  try {
    const analysis = await analyzePost(content);
    await supabase
      .from("posts")
      .update({
        hook_type:   analysis.hook_type,
        tone:        analysis.tone,
        structure:   analysis.structure,
        cta_type:    analysis.cta_type,
        ai_summary:  analysis.summary,
        ai_keywords: analysis.keywords,
        updated_at:  new Date().toISOString(),
      })
      .eq("id", postId);
  } catch (e) {
    console.error(`AI classification failed for post ${postId}:`, e);
  }
}
