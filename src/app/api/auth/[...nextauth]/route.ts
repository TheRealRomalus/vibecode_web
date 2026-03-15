import { handlers } from "@/auth";
import type { NextRequest } from "next/server";

const { GET: _GET, POST: _POST } = handlers;

export async function GET(req: NextRequest, ctx: { params: Promise<{ nextauth: string[] }> }) {
  const params = await ctx.params;
  console.log("[auth route] GET", req.nextUrl.pathname, params.nextauth);
  return _GET(req, ctx);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ nextauth: string[] }> }) {
  const params = await ctx.params;
  console.log("[auth route] POST", req.nextUrl.pathname, params.nextauth);
  return _POST(req, ctx);
}
