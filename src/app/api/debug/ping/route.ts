import { NextResponse } from "next/server";

// Lightweight route to verify API routes are reachable on Vercel.
// Visit /api/debug/ping — should return {"ok":true} with status 200.
export function GET() {
  return NextResponse.json({ ok: true, ts: new Date().toISOString() });
}
