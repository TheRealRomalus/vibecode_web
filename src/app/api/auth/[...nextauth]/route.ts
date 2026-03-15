import { handlers } from "@/auth";
import type { NextRequest } from "next/server";

const { GET: _GET, POST: _POST } = handlers;

export async function GET(req: NextRequest) {
  console.log("[auth route] GET", req.nextUrl.pathname);
  return _GET(req);
}

export async function POST(req: NextRequest) {
  console.log("[auth route] POST", req.nextUrl.pathname);
  return _POST(req);
}
