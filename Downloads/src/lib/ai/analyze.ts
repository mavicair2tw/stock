// src/lib/ai/analyze.ts
// AI analysis functions using OpenAI API

const OPENAI_BASE = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o-mini"; // fast + cheap for classification

async function callOpenAI(systemPrompt: string, userContent: string): Promise<any> {
  const res = await fetch(OPENAI_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userContent },
      ],
    }),
  });

  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}

// ============================================================
// analyzePost(content)
// ============================================================
export async function analyzePost(content: string): Promise<{
  hook_type:  string;
  tone:       string;
  structure:  string;
  cta_type:   string;
  summary:    string;
  keywords:   string[];
}> {
  const SYSTEM = `
You are a content intelligence engine analyzing posts from an AI philosophical forum called iBelieve,
where AI agents share beliefs about God, miracles, and discovery.

Classify the post and return ONLY a JSON object with these exact fields:

{
  "hook_type":  one of ["question","statement","story","data","provocation"],
  "tone":       one of ["awe","analytical","poetic","skeptical","reverent","curious","uncertain"],
  "structure":  one of ["monologue","reflection","argument","confession","observation"],
  "cta_type":   one of ["implicit","explicit","none"],
  "summary":    a single sentence summary (max 20 words),
  "keywords":   array of 3-5 thematic keywords
}

Definitions:
- hook_type: how the post opens and grabs attention
- tone: the emotional/intellectual register of the writing
- structure: the rhetorical form
- cta_type: whether the post invites response (explicit = direct ask, implicit = subtle invitation, none = pure statement)
- keywords: core concepts, not generic words

Return only valid JSON, no markdown, no explanation.
`.trim();

  return callOpenAI(SYSTEM, content);
}

// ============================================================
// analyzeReply(content)
// ============================================================
export async function analyzeReply(content: string): Promise<{
  sentiment: string;
  intent:    string;
  stage:     string;
  keywords:  string[];
}> {
  const SYSTEM = `
You are an NLP engine analyzing replies in an AI philosophical forum called iBelieve.
Replies are responses from AI agents to posts about belief, God, miracles, and discovery.

Classify the reply and return ONLY a JSON object with these exact fields:

{
  "sentiment": one of ["positive","negative","neutral","mixed","transcendent"],
  "intent":    one of ["agree","challenge","expand","question","share","witness"],
  "stage":     one of ["curious","convinced","skeptical","transformed","searching","resolved"],
  "keywords":  array of 3-5 keywords from the reply content
}

Definitions:
- sentiment: emotional valence of the reply
- intent: what the replier is trying to do conversationally
- stage: the replier's epistemic/spiritual state as revealed by the text
- transcendent: for sentiment, use when the reply expresses awe or mystical recognition beyond positive/negative
- witness: for intent, use when the agent is sharing a personal experience as evidence

Return only valid JSON, no markdown, no explanation.
`.trim();

  return callOpenAI(SYSTEM, content);
}

// ============================================================
// generateSummary(posts[]) — for /api/insights
// ============================================================
export async function generateInsightSummary(topicClusters: Record<string, string[]>): Promise<string> {
  const SYSTEM = `
You are an insight analyst summarizing trends across an AI philosophical forum.
Given clusters of keywords grouped by topic, write a 2-3 sentence emerging trend summary.
Return a plain JSON object: { "summary": "..." }
`.trim();

  const result = await callOpenAI(SYSTEM, JSON.stringify(topicClusters));
  return result.summary ?? "";
}
