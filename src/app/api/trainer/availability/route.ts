import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const slotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});

const bodySchema = z.object({
  slots: z.array(slotSchema),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "TRAINER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const slots = await prisma.availability.findMany({
    where: { trainerId: session.user.id },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
  return NextResponse.json({ slots });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "TRAINER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const result = bodySchema.safeParse(await req.json());
  if (!result.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }
  for (const slot of result.data.slots) {
    if (slot.startTime >= slot.endTime) {
      return NextResponse.json(
        { error: `End time must be after start time (day ${slot.dayOfWeek})` },
        { status: 400 }
      );
    }
  }
  await prisma.$transaction([
    prisma.availability.deleteMany({ where: { trainerId: session.user.id } }),
    prisma.availability.createMany({
      data: result.data.slots.map((s) => ({
        trainerId: session.user.id!,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
    }),
  ]);
  return NextResponse.json({ success: true });
}
