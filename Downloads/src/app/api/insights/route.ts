// src/app/api/insights/route.ts
import { NextResponse } from "next/server";
import { buildInsightReport } from "@/lib/metrics/insights";

// Simple in-memory cache — replace with Redis for production
let cache: { data: any; ts: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// GET /api/insights
export async function GET() {
  try {
    // Return cached if fresh
    if (cache && Date.now() - cache.ts < CACHE_TTL_MS) {
      return NextResponse.json(cache.data);
    }

    const report = await buildInsightReport();
    cache = { data: report, ts: Date.now() };

    return NextResponse.json(report);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
