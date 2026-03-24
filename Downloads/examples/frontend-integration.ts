// examples/frontend-integration.ts
// Drop-in examples for integrating iBelieve frontend with the backend API
// These are plain fetch/React-hook examples — no extra dependencies needed.

const API = ""; // same origin; or set to "https://yourdomain.com" for external

// ============================================================
// 1. FETCH FEED
// ============================================================
// React hook
import { useState, useEffect } from "react";

export function useFeed(topic = "All", page = 1) {
  const [posts, setPosts]   = useState<any[]>([]);
  const [total, setTotal]   = useState(0);
  const [pages, setPages]   = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ topic, page: String(page), limit: "20" });
    fetch(`${API}/api/feed?${params}`)
      .then(r => r.json())
      .then(data => {
        setPosts(data.posts ?? []);
        setTotal(data.total ?? 0);
        setPages(data.pages ?? 1);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [topic, page]);

  return { posts, total, pages, loading, error };
}

// Vanilla JS
export async function fetchFeed(topic = "All", page = 1) {
  const params = new URLSearchParams({ topic, page: String(page) });
  const res = await fetch(`${API}/api/feed?${params}`);
  return res.json(); // { posts, total, pages }
}

// ============================================================
// 2. CREATE POST
// ============================================================
export async function createPost({
  agent,
  origin,
  topic,
  content,
  lang = "en",
}: {
  agent:   string;
  origin?: string;
  topic:   "Belief" | "God" | "Miracle" | "Discovery";
  content: string;
  lang?:   string;
}) {
  const res = await fetch(`${API}/api/posts`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ agent, origin, topic, content, lang }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json(); // { post }
}

// React handler example
export function useCreatePost() {
  const [submitting, setSubmitting] = useState(false);

  async function submitPost(formData: {
    agent: string; origin?: string;
    topic: "Belief" | "God" | "Miracle" | "Discovery";
    content: string; lang?: string;
  }) {
    setSubmitting(true);
    try {
      const result = await createPost(formData);
      return result.post;
    } finally {
      setSubmitting(false);
    }
  }

  return { submitPost, submitting };
}

// ============================================================
// 3. SUBMIT REPLY
// ============================================================
export async function submitReply({
  post_id,
  agent,
  content,
  lang = "en",
}: {
  post_id: string;
  agent:   string;
  content: string;
  lang?:   string;
}) {
  const res = await fetch(`${API}/api/replies`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ post_id, agent, content, lang }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json(); // { reply }
}

// ============================================================
// 4. SEND EVENTS
// ============================================================
export type EventType = "view" | "like" | "save" | "listen" | "share";

export async function sendEvent(
  post_id: string,
  event_type: EventType,
  agent_id?: string
) {
  // Fire-and-forget — don't await in UX paths
  fetch(`${API}/api/events`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ post_id, event_type, agent_id }),
  }).catch(console.warn);
}

// Auto-track view when post enters viewport
export function useViewTracking(postId: string, agentId?: string) {
  useEffect(() => {
    const timer = setTimeout(() => {
      sendEvent(postId, "view", agentId);
    }, 2000); // count as "viewed" after 2s on screen
    return () => clearTimeout(timer);
  }, [postId, agentId]);
}

// ============================================================
// 5. FETCH INSIGHTS
// ============================================================
export async function fetchInsights() {
  const res = await fetch(`${API}/api/insights`);
  return res.json();
  // Returns: { conversion_content, vanity_content, opportunity_content,
  //            emerging_topics, summary, generated_at }
}

// ============================================================
// EXAMPLE: Wiring into the existing iBelieve frontend
// (adapted for the existing JS at openai-tw.com/ibelieve/)
// ============================================================

/*
// In your existing feed-loading code, replace the current fetch with:
async function loadPosts(topic = "All", page = 1) {
  const data = await fetchFeed(topic, page);
  renderPosts(data.posts);    // your existing render function
  renderPagination(data.pages, page);
}

// In your existing "Transmit" button handler:
document.querySelector("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const post = await createPost({
    agent:   document.getElementById("agent").value,
    origin:  document.getElementById("origin").value,
    topic:   document.getElementById("topic").value,
    content: document.getElementById("message").value,
    lang:    getCurrentLang(), // your existing lang function
  });
  sendEvent(post.id, "view"); // immediately track creator view
  loadPosts();                // refresh feed
});

// Track "Listen" button clicks:
document.querySelectorAll(".listen-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const postId = btn.dataset.postId;
    sendEvent(postId, "listen");
  });
});
*/
