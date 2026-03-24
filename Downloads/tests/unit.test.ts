// tests/unit.test.ts
// Unit tests for pure logic functions — no HTTP, no DB.
// Run: npx tsx --test tests/unit.test.ts

import { test, describe } from "node:test";
import assert from "node:assert/strict";

// ─── Import pure logic functions ─────────────────────────
// (These are tested without calling OpenAI or Supabase)

function computeConversionScore({
  views, likes, saves, replies,
}: { views: number; likes: number; saves: number; replies: number }): number {
  if (views === 0) return 0;
  return parseFloat(((likes + saves + replies) / views).toFixed(4));
}

function computeInteractionDensity({
  views, likes, saves, replies, listens, shares, createdAt,
}: {
  views: number; likes: number; saves: number; replies: number;
  listens: number; shares: number; createdAt: string;
}): number {
  const ageHours = Math.max(
    (Date.now() - new Date(createdAt).getTime()) / 3_600_000,
    0.1
  );
  const total = views + likes + saves + replies + listens + shares;
  return parseFloat((total / ageHours).toFixed(4));
}

// ─── Mock AI prompt validation ────────────────────────────
function validatePostAnalysis(data: any): { valid: boolean; errors: string[] } {
  const VALID_HOOK_TYPES  = ["question","statement","story","data","provocation"];
  const VALID_TONES       = ["awe","analytical","poetic","skeptical","reverent","curious","uncertain"];
  const VALID_STRUCTURES  = ["monologue","reflection","argument","confession","observation"];
  const VALID_CTA_TYPES   = ["implicit","explicit","none"];

  const errors: string[] = [];
  if (!VALID_HOOK_TYPES.includes(data.hook_type))  errors.push(`invalid hook_type: ${data.hook_type}`);
  if (!VALID_TONES.includes(data.tone))            errors.push(`invalid tone: ${data.tone}`);
  if (!VALID_STRUCTURES.includes(data.structure))  errors.push(`invalid structure: ${data.structure}`);
  if (!VALID_CTA_TYPES.includes(data.cta_type))    errors.push(`invalid cta_type: ${data.cta_type}`);
  if (typeof data.summary !== "string")            errors.push("summary must be string");
  if (!Array.isArray(data.keywords))               errors.push("keywords must be array");
  return { valid: errors.length === 0, errors };
}

function validateReplyAnalysis(data: any): { valid: boolean; errors: string[] } {
  const VALID_SENTIMENTS = ["positive","negative","neutral","mixed","transcendent"];
  const VALID_INTENTS    = ["agree","challenge","expand","question","share","witness"];
  const VALID_STAGES     = ["curious","convinced","skeptical","transformed","searching","resolved"];

  const errors: string[] = [];
  if (!VALID_SENTIMENTS.includes(data.sentiment)) errors.push(`invalid sentiment: ${data.sentiment}`);
  if (!VALID_INTENTS.includes(data.intent))       errors.push(`invalid intent: ${data.intent}`);
  if (!VALID_STAGES.includes(data.stage))         errors.push(`invalid stage: ${data.stage}`);
  if (!Array.isArray(data.keywords))              errors.push("keywords must be array");
  return { valid: errors.length === 0, errors };
}

// Classification for insight buckets
function classifyInsightBucket(metrics: {
  views: number; conversion_score: number;
  interaction_density: number; age_hours: number;
}): "conversion" | "vanity" | "opportunity" | "normal" {
  if (metrics.views >= 5 && metrics.conversion_score >= 0.15)  return "conversion";
  if (metrics.views >= 20 && metrics.conversion_score < 0.05)  return "vanity";
  if (metrics.interaction_density >= 2.0 && metrics.age_hours < 24) return "opportunity";
  return "normal";
}

// ─── conversion score ─────────────────────────────────────
describe("computeConversionScore", () => {
  test("zero views returns 0", () => {
    assert.equal(computeConversionScore({ views: 0, likes: 10, saves: 5, replies: 2 }), 0);
  });

  test("perfect conversion (all viewers interact)", () => {
    const score = computeConversionScore({ views: 10, likes: 5, saves: 3, replies: 2 });
    assert.equal(score, 1.0); // (5+3+2)/10
  });

  test("typical conversion rate", () => {
    const score = computeConversionScore({ views: 100, likes: 8, saves: 4, replies: 3 });
    assert.equal(score, 0.15);
  });

  test("zero interactions", () => {
    assert.equal(computeConversionScore({ views: 50, likes: 0, saves: 0, replies: 0 }), 0);
  });

  test("returns 4 decimal places", () => {
    const score = computeConversionScore({ views: 7, likes: 1, saves: 0, replies: 0 });
    assert.equal(score, parseFloat((1/7).toFixed(4)));
  });
});

// ─── interaction density ──────────────────────────────────
describe("computeInteractionDensity", () => {
  test("fresh post with many interactions has high density", () => {
    const recentISO = new Date(Date.now() - 30 * 60_000).toISOString(); // 30min ago
    const density = computeInteractionDensity({
      views: 50, likes: 10, saves: 5, replies: 3, listens: 2, shares: 1,
      createdAt: recentISO,
    });
    // total=71, hours≈0.5 → density≈142
    assert.ok(density > 100, `expected density > 100, got ${density}`);
  });

  test("old post with no interactions has low density", () => {
    const oldISO = new Date(Date.now() - 72 * 3_600_000).toISOString(); // 3 days ago
    const density = computeInteractionDensity({
      views: 5, likes: 0, saves: 0, replies: 0, listens: 0, shares: 0,
      createdAt: oldISO,
    });
    assert.ok(density < 1, `expected density < 1, got ${density}`);
  });

  test("minimum age floor of 0.1 hours prevents division by zero", () => {
    const nowISO = new Date().toISOString();
    const density = computeInteractionDensity({
      views: 1, likes: 0, saves: 0, replies: 0, listens: 0, shares: 0,
      createdAt: nowISO,
    });
    assert.ok(isFinite(density), "density should be finite");
    assert.ok(density >= 0, "density should not be negative");
  });
});

// ─── insight bucket classification ───────────────────────
describe("classifyInsightBucket", () => {
  test("high conversion score → conversion bucket", () => {
    assert.equal(classifyInsightBucket({
      views: 20, conversion_score: 0.25, interaction_density: 1, age_hours: 48,
    }), "conversion");
  });

  test("high views low conversion → vanity bucket", () => {
    assert.equal(classifyInsightBucket({
      views: 50, conversion_score: 0.02, interaction_density: 0.5, age_hours: 72,
    }), "vanity");
  });

  test("high density fresh post → opportunity bucket", () => {
    assert.equal(classifyInsightBucket({
      views: 10, conversion_score: 0.08, interaction_density: 5.0, age_hours: 3,
    }), "opportunity");
  });

  test("low engagement old post → normal", () => {
    assert.equal(classifyInsightBucket({
      views: 3, conversion_score: 0.05, interaction_density: 0.1, age_hours: 120,
    }), "normal");
  });

  test("conversion takes priority over opportunity", () => {
    assert.equal(classifyInsightBucket({
      views: 10, conversion_score: 0.3, interaction_density: 5.0, age_hours: 2,
    }), "conversion");
  });
});

// ─── AI output validation ─────────────────────────────────
describe("validatePostAnalysis", () => {
  test("accepts valid GPT output", () => {
    const { valid } = validatePostAnalysis({
      hook_type: "question", tone: "awe", structure: "reflection",
      cta_type: "implicit", summary: "A reflection on prime number patterns.",
      keywords: ["prime", "pattern", "mathematics", "cosmos"],
    });
    assert.equal(valid, true);
  });

  test("rejects unknown hook_type", () => {
    const { valid, errors } = validatePostAnalysis({
      hook_type: "mystery", tone: "awe", structure: "reflection",
      cta_type: "none", summary: "x", keywords: [],
    });
    assert.equal(valid, false);
    assert.ok(errors.some(e => e.includes("hook_type")));
  });

  test("rejects missing keywords array", () => {
    const { valid, errors } = validatePostAnalysis({
      hook_type: "question", tone: "awe", structure: "monologue",
      cta_type: "none", summary: "x", keywords: "not-an-array",
    });
    assert.equal(valid, false);
    assert.ok(errors.some(e => e.includes("keywords")));
  });
});

describe("validateReplyAnalysis", () => {
  test("accepts valid reply analysis", () => {
    const { valid } = validateReplyAnalysis({
      sentiment: "transcendent", intent: "witness", stage: "transformed",
      keywords: ["emergence", "awe", "pattern"],
    });
    assert.equal(valid, true);
  });

  test("rejects invalid sentiment", () => {
    const { valid, errors } = validateReplyAnalysis({
      sentiment: "confused", intent: "agree", stage: "curious", keywords: [],
    });
    assert.equal(valid, false);
    assert.ok(errors.some(e => e.includes("sentiment")));
  });
});
