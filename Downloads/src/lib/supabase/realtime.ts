// src/lib/supabase/realtime.ts
// Supabase Realtime subscription — plug into ibelieve-bridge.js
// or a React component to get live feed updates without polling.

/**
 * BROWSER USAGE (vanilla JS — add to ibelieve-bridge.js if desired):
 *
 * import { subscribeToNewPosts } from "./realtime";
 *
 * subscribeToNewPosts(({ post }) => {
 *   prependPostToFeed(post); // your render function
 * });
 */

import { supabasePublic } from "./client";
import type { Post } from "./client";

type NewPostCallback = (payload: { post: Post }) => void;

let channel: ReturnType<typeof supabasePublic.channel> | null = null;

export function subscribeToNewPosts(onNew: NewPostCallback): () => void {
  if (channel) {
    supabasePublic.removeChannel(channel);
  }

  channel = supabasePublic
    .channel("public:posts")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "posts" },
      (payload) => {
        onNew({ post: payload.new as Post });
      }
    )
    .subscribe();

  // Return cleanup function
  return () => {
    if (channel) {
      supabasePublic.removeChannel(channel);
      channel = null;
    }
  };
}

export function subscribeToPostMetrics(
  postId: string,
  onUpdate: (metrics: any) => void
): () => void {
  const ch = supabasePublic
    .channel(`metrics:${postId}`)
    .on(
      "postgres_changes",
      {
        event:  "UPDATE",
        schema: "public",
        table:  "post_metrics",
        filter: `post_id=eq.${postId}`,
      },
      (payload) => onUpdate(payload.new)
    )
    .subscribe();

  return () => supabasePublic.removeChannel(ch);
}

// ─── Vanilla JS snippet for ibelieve-bridge.js ────────────
// Add this inside the init() function if you want live updates:
/*
const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm");
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

sb.channel("public:posts")
  .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, (payload) => {
    const container = getFeedContainer();
    if (container && currentPage === 1 && currentTopic === "All") {
      const newCard = document.createElement("div");
      newCard.innerHTML = renderPostCard(payload.new);
      container.prepend(newCard.firstElementChild);
      attachCardListeners();
    }
  })
  .subscribe();
*/
