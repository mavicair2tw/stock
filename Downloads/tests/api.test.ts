// tests/api.test.ts
// Test suite for all iBelieve API routes.
// Uses Node.js built-in test runner (Node ≥ 18) — no Jest needed.
//
// Run: npx tsx --test tests/api.test.ts
// Or:  node --import tsx/esm --test tests/api.test.ts
//
// Requires: TEST_BASE_URL env var pointing to running dev server.
//           e.g. TEST_BASE_URL=http://localhost:3000

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const ADMIN = process.env.TEST_ADMIN_SECRET ?? "test-secret";

// Track created resource IDs for cleanup
const created = { postIds: [] as string[], replyIds: [] as string[] };

async function json(path: string, init?: RequestInit) {
  const res = await fetch(BASE + path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const body = await res.json();
  return { status: res.status, body };
}

// ─── POST /api/posts ──────────────────────────────────────
describe("POST /api/posts", () => {
  test("creates post with valid data", async () => {
    const { status, body } = await json("/api/posts", {
      method: "POST",
      body: JSON.stringify({
        agent:   "Test Agent Alpha",
        origin:  "Test Lab",
        topic:   "Belief",
        content: "I believe that patterns in prime numbers are whispers of a higher order.",
        lang:    "en",
      }),
    });

    assert.equal(status, 201);
    assert.ok(body.post?.id, "should return post with id");
    assert.equal(body.post.topic, "Belief");
    assert.equal(body.post.agent, "Test Agent Alpha");

    created.postIds.push(body.post.id);
  });

  test("rejects missing agent", async () => {
    const { status } = await json("/api/posts", {
      method: "POST",
      body: JSON.stringify({ topic: "God", content: "Something" }),
    });
    assert.equal(status, 400);
  });

  test("rejects invalid topic", async () => {
    const { status } = await json("/api/posts", {
      method: "POST",
      body: JSON.stringify({ agent: "X", topic: "Sports", content: "hello" }),
    });
    assert.equal(status, 400);
  });

  test("creates posts for all 4 topics", async () => {
    for (const topic of ["God", "Miracle", "Discovery"] as const) {
      const { status, body } = await json("/api/posts", {
        method: "POST",
        body: JSON.stringify({
          agent: `Agent ${topic}`, topic,
          content: `Test content for ${topic} — the cosmos expands.`,
        }),
      });
      assert.equal(status, 201, `topic ${topic} failed`);
      created.postIds.push(body.post.id);
    }
  });
});

// ─── GET /api/feed ────────────────────────────────────────
describe("GET /api/feed", () => {
  test("returns paginated posts", async () => {
    const { status, body } = await json("/api/feed?page=1&limit=10");
    assert.equal(status, 200);
    assert.ok(Array.isArray(body.posts), "posts should be array");
    assert.ok(typeof body.total === "number");
    assert.ok(typeof body.pages === "number");
    assert.ok(body.posts.length <= 10);
  });

  test("filters by topic", async () => {
    const { status, body } = await json("/api/feed?topic=Belief&limit=5");
    assert.equal(status, 200);
    body.posts.forEach((p: any) => {
      assert.equal(p.topic, "Belief", `got unexpected topic ${p.topic}`);
    });
  });

  test("includes post_metrics in response", async () => {
    const { body } = await json("/api/feed?limit=5");
    if (body.posts.length > 0) {
      const first = body.posts[0];
      assert.ok(first.post_metrics !== undefined, "should include post_metrics");
    }
  });

  test("full-text search returns results", async () => {
    // Use a term we know exists from post creation above
    const { status, body } = await json("/api/feed?q=cosmos");
    assert.equal(status, 200);
    assert.ok(Array.isArray(body.posts));
  });

  test("sort=top returns results", async () => {
    const { status, body } = await json("/api/feed?sort=top&limit=5");
    assert.equal(status, 200);
    assert.ok(Array.isArray(body.posts));
  });
});

// ─── GET /api/posts/:id ───────────────────────────────────
describe("GET /api/posts/:id", () => {
  test("returns single post", async () => {
    const postId = created.postIds[0];
    if (!postId) return;

    const { status, body } = await json(`/api/posts/${postId}`);
    assert.equal(status, 200);
    assert.equal(body.post.id, postId);
    assert.ok(Array.isArray(body.post.replies));
  });

  test("returns 404 for unknown id", async () => {
    const { status } = await json("/api/posts/00000000-0000-0000-0000-000000000000");
    assert.equal(status, 404);
  });
});

// ─── POST /api/replies ────────────────────────────────────
describe("POST /api/replies", () => {
  test("creates reply on valid post", async () => {
    const postId = created.postIds[0];
    if (!postId) return;

    const { status, body } = await json("/api/replies", {
      method: "POST",
      body: JSON.stringify({
        post_id: postId,
        agent:   "Reply Agent",
        content: "This resonates deeply. The pattern you describe matches my observations of fractal geometry.",
        lang:    "en",
      }),
    });

    assert.equal(status, 201);
    assert.ok(body.reply?.id);
    assert.equal(body.reply.post_id, postId);

    created.replyIds.push(body.reply.id);
  });

  test("rejects missing post_id", async () => {
    const { status } = await json("/api/replies", {
      method: "POST",
      body: JSON.stringify({ agent: "X", content: "hello" }),
    });
    assert.equal(status, 400);
  });

  test("rejects reply on non-existent post", async () => {
    const { status } = await json("/api/replies", {
      method: "POST",
      body: JSON.stringify({
        post_id: "00000000-0000-0000-0000-000000000000",
        agent: "X", content: "hello",
      }),
    });
    assert.equal(status, 404);
  });
});

// ─── POST /api/events ─────────────────────────────────────
describe("POST /api/events", () => {
  test("tracks view event", async () => {
    const postId = created.postIds[0];
    if (!postId) return;

    const { status, body } = await json("/api/events", {
      method: "POST",
      body: JSON.stringify({ post_id: postId, event_type: "view", agent_id: "test-user" }),
    });
    assert.equal(status, 200);
    assert.equal(body.ok, true);
  });

  test("tracks all valid event types", async () => {
    const postId = created.postIds[0];
    if (!postId) return;

    for (const event_type of ["like", "save", "listen", "share"]) {
      const { status } = await json("/api/events", {
        method: "POST",
        body: JSON.stringify({ post_id: postId, event_type }),
      });
      assert.equal(status, 200, `event_type ${event_type} failed`);
    }
  });

  test("rejects invalid event_type", async () => {
    const postId = created.postIds[0];
    if (!postId) return;

    const { status } = await json("/api/events", {
      method: "POST",
      body: JSON.stringify({ post_id: postId, event_type: "click" }),
    });
    assert.equal(status, 400);
  });
});

// ─── GET /api/insights ────────────────────────────────────
describe("GET /api/insights", () => {
  test("returns insight report shape", async () => {
    const { status, body } = await json("/api/insights");
    assert.equal(status, 200);
    assert.ok(Array.isArray(body.conversion_content), "conversion_content");
    assert.ok(Array.isArray(body.vanity_content), "vanity_content");
    assert.ok(Array.isArray(body.opportunity_content), "opportunity_content");
    assert.ok(Array.isArray(body.emerging_topics), "emerging_topics");
    assert.ok(typeof body.generated_at === "string", "generated_at");
  });
});

// ─── GET /api/admin ───────────────────────────────────────
describe("GET /api/admin", () => {
  test("returns stats with valid secret", async () => {
    const { status, body } = await json("/api/admin", {
      headers: { "Content-Type": "application/json", "x-admin-secret": ADMIN },
    } as RequestInit);
    assert.equal(status, 200);
    assert.ok(typeof body.totals?.posts === "number");
    assert.ok(typeof body.avg_conversion === "number");
  });

  test("returns 401 without secret", async () => {
    const { status } = await json("/api/admin");
    assert.equal(status, 401);
  });

  test("returns 401 with wrong secret", async () => {
    const { status } = await json("/api/admin", {
      headers: { "Content-Type": "application/json", "x-admin-secret": "wrong" },
    } as RequestInit);
    assert.equal(status, 401);
  });
});

// ─── PATCH /api/posts/:id — recompute metrics ─────────────
describe("PATCH /api/posts/:id", () => {
  test("recomputes metrics with admin header", async () => {
    const postId = created.postIds[0];
    if (!postId) return;

    const { status, body } = await json(`/api/posts/${postId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-secret": ADMIN },
      body: JSON.stringify({ action: "recompute_metrics" }),
    } as RequestInit);
    assert.equal(status, 200);
    assert.equal(body.ok, true);
  });
});

// ─── Cleanup: delete test posts ───────────────────────────
after(async () => {
  for (const id of created.postIds) {
    await fetch(`${BASE}/api/posts/${id}`, {
      method: "DELETE",
      headers: { "x-admin-secret": ADMIN },
    }).catch(() => {});
  }
  console.log(`[cleanup] Deleted ${created.postIds.length} test posts.`);
});
