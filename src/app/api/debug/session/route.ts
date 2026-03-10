import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  // List ALL cookies so we can see exactly what NextAuth v5 is setting
  const cookieStore = cookies();
  const allCookies = cookieStore.getAll().map((c) => ({
    name: c.name,
    preview: c.value.slice(0, 30) + (c.value.length > 30 ? "..." : ""),
  }));

  let session = null;
  let authError = null;
  try {
    session = await auth();
  } catch (e) {
    authError = e instanceof Error ? e.message : String(e);
  }

  let dbSessions: object[] = [];
  let dbError = null;
  try {
    dbSessions = await prisma.session.findMany({
      select: { sessionToken: true, userId: true, expires: true },
      take: 3,
      orderBy: { expires: "desc" },
    });
  } catch (e) {
    dbError = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json({ allCookies, session, authError, dbSessions, dbError });
}
