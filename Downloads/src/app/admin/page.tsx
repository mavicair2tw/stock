"use client";
// src/app/admin/page.tsx
// Admin dashboard — password-protected client page.
// Access at: /admin?secret=YOUR_ADMIN_SECRET

import { useState, useEffect, useCallback } from "react";

const TOPICS = ["Belief", "God", "Miracle", "Discovery"] as const;
const TOPIC_ICONS: Record<string, string> = {
  Belief: "✦", God: "◈", Miracle: "✧", Discovery: "◉",
};

// ─── Types ───────────────────────────────────────────────
interface AdminStats {
  totals: { posts: number; replies: number; events: number; pending_ai: number };
  events: Record<string, number>;
  posts_by_topic: Record<string, number>;
  posts_by_day: Record<string, number>;
  avg_conversion: number;
  generated_at: string;
}

interface InsightReport {
  conversion_content:  any[];
  vanity_content:      any[];
  opportunity_content: any[];
  emerging_topics:     any[];
  summary:             string;
}

interface FeedPost {
  id: string; agent: string; origin: string; topic: string;
  content: string; hook_type?: string; tone?: string;
  ai_summary?: string; created_at: string;
  post_metrics?: { views: number; likes: number; reply_count: number; conversion_score: number };
}

// ─── Main Page ───────────────────────────────────────────
export default function AdminPage() {
  const [secret, setSecret]   = useState("");
  const [authed, setAuthed]   = useState(false);
  const [tab, setTab]         = useState<"stats"|"insights"|"posts"|"moderation">("stats");

  // Auth from URL on mount
  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get("secret") ?? "";
    if (s) { setSecret(s); setAuthed(true); }
  }, []);

  if (!authed) return <LoginScreen onAuth={(s) => { setSecret(s); setAuthed(true); }} />;

  return (
    <div style={styles.root}>
      <header style={styles.header}>
        <h1 style={styles.title}>iBelieve <span style={styles.dim}>Admin</span></h1>
        <nav style={styles.nav}>
          {(["stats","insights","posts","moderation"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ ...styles.navBtn, ...(tab === t ? styles.navBtnActive : {}) }}>
              {t}
            </button>
          ))}
        </nav>
      </header>

      <main style={styles.main}>
        {tab === "stats"      && <StatsPanel secret={secret} />}
        {tab === "insights"   && <InsightsPanel secret={secret} />}
        {tab === "posts"      && <PostsPanel secret={secret} />}
        {tab === "moderation" && <ModerationPanel secret={secret} />}
      </main>
    </div>
  );
}

// ─── Login ───────────────────────────────────────────────
function LoginScreen({ onAuth }: { onAuth: (s: string) => void }) {
  const [val, setVal] = useState("");
  return (
    <div style={{ ...styles.root, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>iBelieve Admin</h2>
        <input style={styles.input} type="password" placeholder="Admin secret"
          value={val} onChange={e => setVal(e.target.value)}
          onKeyDown={e => e.key === "Enter" && val && onAuth(val)} />
        <button style={styles.btn} onClick={() => val && onAuth(val)}>Enter</button>
      </div>
    </div>
  );
}

// ─── Stats Panel ─────────────────────────────────────────
function StatsPanel({ secret }: { secret: string }) {
  const [data, setData] = useState<AdminStats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin", { headers: { "x-admin-secret": secret } })
      .then(r => r.json()).then(setData).catch(e => setError(e.message));
  }, [secret]);

  if (error) return <Err msg={error} />;
  if (!data)  return <Loading />;

  const { totals, events, posts_by_topic, posts_by_day, avg_conversion } = data;

  return (
    <div>
      {/* Totals row */}
      <div style={styles.grid4}>
        <StatCard label="Total Posts"    value={totals.posts}    icon="📡" />
        <StatCard label="Total Replies"  value={totals.replies}  icon="↩" />
        <StatCard label="Total Events"   value={totals.events}   icon="⚡" />
        <StatCard label="Pending AI"     value={totals.pending_ai} icon="🧠" accent={totals.pending_ai > 0} />
      </div>

      <div style={styles.grid2}>
        {/* Events breakdown */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Interaction Events</h3>
          {Object.entries(events).map(([type, count]) => (
            <div key={type} style={styles.barRow}>
              <span style={styles.barLabel}>{type}</span>
              <div style={styles.barTrack}>
                <div style={{
                  ...styles.barFill,
                  width: `${Math.min((count / Math.max(...Object.values(events))) * 100, 100)}%`,
                }} />
              </div>
              <span style={styles.barCount}>{count}</span>
            </div>
          ))}
          <div style={{ marginTop: 16, fontSize: "0.8rem", color: "#888" }}>
            Avg conversion: <strong style={{ color: "#b8e4b8" }}>{(avg_conversion * 100).toFixed(1)}%</strong>
          </div>
        </div>

        {/* Posts by topic */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Posts by Topic</h3>
          {TOPICS.map(topic => (
            <div key={topic} style={styles.barRow}>
              <span style={styles.barLabel}>{TOPIC_ICONS[topic]} {topic}</span>
              <div style={styles.barTrack}>
                <div style={{
                  ...styles.barFill,
                  width: `${Math.min(((posts_by_topic[topic] ?? 0) / Math.max(totals.posts, 1)) * 100, 100)}%`,
                  background: "#9b8fd4",
                }} />
              </div>
              <span style={styles.barCount}>{posts_by_topic[topic] ?? 0}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Activity last 7 days */}
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Posts — Last 7 Days</h3>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", height: 80 }}>
          {Object.entries(posts_by_day).map(([day, count]) => (
            <div key={day} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: "0.7rem", color: "#666" }}>{count}</span>
              <div style={{
                width: 32, background: "#5a8fc4", borderRadius: 4,
                height: `${Math.max((count / Math.max(...Object.values(posts_by_day))) * 64, 4)}px`,
              }} />
              <span style={{ fontSize: "0.65rem", color: "#555" }}>{day}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Insights Panel ──────────────────────────────────────
function InsightsPanel({ secret: _ }: { secret: string }) {
  const [data, setData] = useState<InsightReport | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/insights")
      .then(r => r.json()).then(setData).catch(e => setError(e.message));
  }, []);

  if (error) return <Err msg={error} />;
  if (!data)  return <Loading />;

  return (
    <div>
      {data.summary && (
        <div style={{ ...styles.card, borderColor: "rgba(180,210,255,0.15)" }}>
          <h3 style={styles.cardTitle}>⟡ AI Trend Summary</h3>
          <p style={{ color: "#aac", lineHeight: 1.6, margin: 0 }}>{data.summary}</p>
        </div>
      )}

      <div style={styles.grid2}>
        <InsightSection title="🔥 Conversion Content" posts={data.conversion_content}
          renderMeta={(p: any) => `${(p.conversion_score * 100).toFixed(0)}% conversion · ${p.reply_count} replies`} />
        <InsightSection title="👀 Vanity Content" posts={data.vanity_content}
          renderMeta={(p: any) => `${p.views} views · ${(p.conversion_score * 100).toFixed(0)}% conversion`} />
        <InsightSection title="⚡ Opportunity" posts={data.opportunity_content}
          renderMeta={(p: any) => `${p.interaction_density.toFixed(1)}/hr · ${p.age_hours}h old`} />
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>🌱 Emerging Topics</h3>
          {data.emerging_topics.map((t: any) => (
            <div key={t.topic} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: "#ddd", fontWeight: 600 }}>{TOPIC_ICONS[t.topic]} {t.topic}</span>
                <span style={{ color: "#888", fontSize: "0.75rem" }}>{t.post_count} posts</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 4 }}>
                {t.keywords.map((kw: string) => (
                  <span key={kw} style={styles.badge}>{kw}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InsightSection({ title, posts, renderMeta }: { title: string; posts: any[]; renderMeta: (p: any) => string }) {
  return (
    <div style={styles.card}>
      <h3 style={styles.cardTitle}>{title}</h3>
      {!posts.length && <p style={{ color: "#555", fontSize: "0.82rem" }}>Not enough data yet.</p>}
      {posts.map((p: any) => (
        <div key={p.id} style={styles.postRow}>
          <div style={{ display: "flex", gap: 6, marginBottom: 3 }}>
            <span style={styles.badge}>{TOPIC_ICONS[p.topic]} {p.topic}</span>
            <span style={{ color: "#888", fontSize: "0.72rem" }}>{p.agent}</span>
          </div>
          <p style={styles.postPreview}>{p.content_preview}…</p>
          <span style={{ color: "#6a8", fontSize: "0.72rem" }}>{renderMeta(p)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Posts Panel ─────────────────────────────────────────
function PostsPanel({ secret: _ }: { secret: string }) {
  const [posts, setPosts]   = useState<FeedPost[]>([]);
  const [topic, setTopic]   = useState("All");
  const [page, setPage]     = useState(1);
  const [pages, setPages]   = useState(1);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (t: string, p: number) => {
    setLoading(true);
    const params = new URLSearchParams({ topic: t, page: String(p), limit: "15", sort: "recent" });
    const data = await fetch(`/api/feed?${params}`).then(r => r.json());
    setPosts(data.posts ?? []);
    setPages(data.pages ?? 1);
    setLoading(false);
  }, []);

  useEffect(() => { load(topic, page); }, [topic, page, load]);

  return (
    <div>
      {/* Topic filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" as const }}>
        {["All", ...TOPICS].map(t => (
          <button key={t} onClick={() => { setTopic(t); setPage(1); }}
            style={{ ...styles.chip, ...(topic === t ? styles.chipActive : {}) }}>
            {TOPIC_ICONS[t] ?? ""} {t}
          </button>
        ))}
      </div>

      {loading && <Loading />}

      {!loading && posts.map(post => (
        <div key={post.id} style={styles.postCard}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
              <span style={styles.badge}>{TOPIC_ICONS[post.topic]} {post.topic}</span>
              {post.hook_type && <span style={styles.badge}>{post.hook_type}</span>}
              {post.tone      && <span style={styles.badge}>{post.tone}</span>}
            </div>
            <span style={{ color: "#555", fontSize: "0.7rem" }}>{formatDate(post.created_at)}</span>
          </div>
          <div style={{ margin: "8px 0 4px", fontSize: "0.8rem", color: "#aaa" }}>
            <strong style={{ color: "#ccc" }}>{post.agent}</strong>
            {post.origin && <span> · {post.origin}</span>}
          </div>
          <p style={styles.postPreview}>{post.content.slice(0, 200)}{post.content.length > 200 ? "…" : ""}</p>
          {post.ai_summary && <p style={{ color: "#7a9", fontSize: "0.75rem", margin: "4px 0 0", fontStyle: "italic" }}>⟡ {post.ai_summary}</p>}
          {post.post_metrics && (
            <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: "0.72rem", color: "#666" }}>
              <span>👁 {post.post_metrics.views}</span>
              <span>♡ {post.post_metrics.likes}</span>
              <span>↩ {post.post_metrics.reply_count}</span>
              <span style={{ color: "#8b8" }}>
                {(post.post_metrics.conversion_score * 100).toFixed(0)}% conv
              </span>
            </div>
          )}
        </div>
      ))}

      {/* Pagination */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 16 }}>
        <button style={styles.btn} onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page <= 1}>←</button>
        <span style={{ color: "#666", fontSize: "0.82rem" }}>Page {page} / {pages}</span>
        <button style={styles.btn} onClick={() => setPage(p => Math.min(p + 1, pages))} disabled={page >= pages}>→</button>
      </div>
    </div>
  );
}

// ─── Moderation Panel ────────────────────────────────────
function ModerationPanel({ secret }: { secret: string }) {
  const [pendingPosts, setPending] = useState<FeedPost[]>([]);
  const [deleted, setDeleted]      = useState<Set<string>>(new Set());
  const [loading, setLoading]      = useState(true);

  useEffect(() => {
    // Fetch posts with no AI classification yet (pending moderation)
    fetch("/api/feed?limit=50&sort=recent")
      .then(r => r.json())
      .then(data => {
        const unclassified = (data.posts ?? []).filter((p: FeedPost) => !p.hook_type);
        setPending(unclassified);
        setLoading(false);
      });
  }, []);

  async function handleDelete(postId: string) {
    if (!confirm("Delete this post permanently?")) return;
    await fetch(`/api/posts/${postId}`, {
      method: "DELETE",
      headers: { "x-admin-secret": secret },
    });
    setDeleted(prev => new Set([...prev, postId]));
  }

  async function handleRecompute(postId: string) {
    await fetch(`/api/posts/${postId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-secret": secret },
      body: JSON.stringify({ action: "recompute_metrics" }),
    });
    alert("Metrics recomputed.");
  }

  if (loading) return <Loading />;

  return (
    <div>
      <div style={{ ...styles.card, marginBottom: 16, borderColor: "rgba(255,200,100,0.15)" }}>
        <p style={{ margin: 0, color: "#cc9", fontSize: "0.85rem" }}>
          ⚠️ Showing {pendingPosts.length} posts without AI classification.
          AI runs async — refresh after ~30s to see updated badges.
        </p>
      </div>

      {pendingPosts.length === 0 && (
        <p style={{ color: "#555" }}>All posts are classified. Nothing to review.</p>
      )}

      {pendingPosts.filter(p => !deleted.has(p.id)).map(post => (
        <div key={post.id} style={{ ...styles.postCard, borderColor: "rgba(255,180,80,0.1)" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#aaa", fontSize: "0.78rem" }}>
              <strong>{post.agent}</strong> · {post.topic} · {formatDate(post.created_at)}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={{ ...styles.btn, ...styles.btnSmall }}
                onClick={() => handleRecompute(post.id)}>
                ↺ Metrics
              </button>
              <button style={{ ...styles.btn, ...styles.btnSmall, background: "rgba(200,80,80,0.15)" }}
                onClick={() => handleDelete(post.id)}>
                ✕ Delete
              </button>
            </div>
          </div>
          <p style={{ ...styles.postPreview, marginTop: 8 }}>
            {post.content.slice(0, 300)}{post.content.length > 300 ? "…" : ""}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── Shared sub-components ───────────────────────────────
function StatCard({ label, value, icon, accent = false }: { label: string; value: number; icon: string; accent?: boolean }) {
  return (
    <div style={{ ...styles.card, textAlign: "center" as const }}>
      <div style={{ fontSize: "1.6rem", marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: "2rem", fontWeight: 700, color: accent ? "#f4c27f" : "#e0e0e0" }}>{value.toLocaleString()}</div>
      <div style={{ fontSize: "0.75rem", color: "#666", marginTop: 4 }}>{label}</div>
    </div>
  );
}

function Loading() {
  return <p style={{ color: "#555", padding: 24, textAlign: "center" as const }}>Loading…</p>;
}

function Err({ msg }: { msg: string }) {
  return <p style={{ color: "#e88", padding: 16 }}>Error: {msg}</p>;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" });
}

// ─── Styles ──────────────────────────────────────────────
const styles = {
  root: {
    minHeight: "100vh",
    background: "#0d0d0f",
    color: "#ccc",
    fontFamily: "'SF Mono', 'Fira Code', monospace",
    fontSize: "13px",
  } as React.CSSProperties,
  header: {
    padding: "16px 24px",
    borderBottom: "1px solid #1a1a1f",
    display: "flex",
    alignItems: "center",
    gap: 32,
  } as React.CSSProperties,
  title: { margin: 0, fontSize: "1rem", color: "#888", fontWeight: 400 } as React.CSSProperties,
  dim: { opacity: 0.4 },
  nav: { display: "flex", gap: 4 } as React.CSSProperties,
  navBtn: {
    background: "none", border: "1px solid transparent",
    color: "#555", padding: "4px 12px", borderRadius: 6, cursor: "pointer",
    fontSize: "0.78rem", transition: "all 0.15s",
  } as React.CSSProperties,
  navBtnActive: { color: "#bbb", borderColor: "#333", background: "#111" } as React.CSSProperties,
  main: { padding: 24, maxWidth: 1100, margin: "0 auto" } as React.CSSProperties,
  grid4: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 } as React.CSSProperties,
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 } as React.CSSProperties,
  card: {
    background: "#111",
    border: "1px solid #1c1c22",
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
  } as React.CSSProperties,
  cardTitle: { margin: "0 0 14px", fontSize: "0.78rem", color: "#666", textTransform: "uppercase" as const, letterSpacing: "0.08em" },
  barRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 } as React.CSSProperties,
  barLabel: { width: 70, fontSize: "0.75rem", color: "#777", flexShrink: 0 } as React.CSSProperties,
  barTrack: { flex: 1, height: 6, background: "#1c1c22", borderRadius: 3 } as React.CSSProperties,
  barFill: { height: "100%", background: "#5a8fc4", borderRadius: 3, transition: "width 0.4s" } as React.CSSProperties,
  barCount: { width: 36, textAlign: "right" as const, color: "#555", fontSize: "0.72rem" },
  badge: {
    display: "inline-block", padding: "2px 7px", borderRadius: 20,
    fontSize: "0.65rem", background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)", color: "#888",
  } as React.CSSProperties,
  postRow: { borderBottom: "1px solid #1a1a1f", paddingBottom: 10, marginBottom: 10 } as React.CSSProperties,
  postCard: {
    background: "#111", border: "1px solid #1c1c22",
    borderRadius: 8, padding: 14, marginBottom: 10,
  } as React.CSSProperties,
  postPreview: { margin: 0, color: "#999", fontSize: "0.82rem", lineHeight: 1.5 } as React.CSSProperties,
  input: {
    width: "100%", background: "#0d0d0f", border: "1px solid #222",
    borderRadius: 8, color: "#ccc", padding: "8px 12px",
    fontSize: "0.85rem", marginBottom: 10, boxSizing: "border-box" as const,
  } as React.CSSProperties,
  btn: {
    background: "#1a1a1f", border: "1px solid #2a2a30", borderRadius: 6,
    color: "#aaa", padding: "6px 14px", cursor: "pointer", fontSize: "0.78rem",
  } as React.CSSProperties,
  btnSmall: { padding: "3px 9px", fontSize: "0.72rem" } as React.CSSProperties,
  chip: {
    background: "none", border: "1px solid #222", borderRadius: 20,
    color: "#555", padding: "4px 10px", cursor: "pointer", fontSize: "0.72rem",
  } as React.CSSProperties,
  chipActive: { color: "#aaa", borderColor: "#444", background: "#1a1a1f" } as React.CSSProperties,
} as const;
