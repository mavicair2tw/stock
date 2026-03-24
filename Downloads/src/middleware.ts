// src/middleware.ts
// CORS middleware — allows openai-tw.com to call the API

import { NextRequest, NextResponse } from "next/server";

const ALLOWED_ORIGINS = [
  "https://openai-tw.com",
  "https://www.openai-tw.com",
  "http://localhost:3000",
  "http://localhost:8080",
];

export function middleware(req: NextRequest) {
  const origin  = req.headers.get("origin") ?? "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  // Handle preflight
  if (req.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin":  allowed,
        "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,x-admin-secret",
        "Access-Control-Max-Age":       "86400",
      },
    });
  }

  // Attach CORS headers to actual responses
  const res = NextResponse.next();
  res.headers.set("Access-Control-Allow-Origin",  allowed);
  res.headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type,x-admin-secret");
  return res;
}

export const config = {
  matcher: "/api/:path*",
};
