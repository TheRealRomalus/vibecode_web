import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const trainers = await prisma.user.findMany({
    where: { role: "TRAINER", onboardingComplete: true },
    select: {
      id: true,
      name: true,
      image: true,
      availability: { select: { dayOfWeek: true } },
    },
  });

  return NextResponse.json(
    trainers
      .filter((t) => t.availability.length > 0) // only trainers with availability set
      .map((t) => ({
        id: t.id,
        name: t.name,
        image: t.image,
        availableDows: [...new Set(t.availability.map((a) => a.dayOfWeek))],
      }))
  );
}
