import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  trainerId: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slotStart: z.string().regex(/^\d{2}:\d{2}$/),
  slotEnd: z.string().regex(/^\d{2}:\d{2}$/),
  workoutType: z.enum(["STRENGTH", "CARDIO", "MOBILITY", "HIIT", "OTHER"]),
  notes: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = bodySchema.safeParse(await req.json());
  if (!result.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const { trainerId, date, slotStart, slotEnd, workoutType, notes } = result.data;
  const startTime = new Date(`${date}T${slotStart}:00`);
  const endTime = new Date(`${date}T${slotEnd}:00`);

  if (startTime <= new Date()) {
    return NextResponse.json({ error: "Cannot book in the past" }, { status: 400 });
  }

  // Verify trainer exists
  const trainer = await prisma.user.findUnique({
    where: { id: trainerId, role: "TRAINER" },
    select: { id: true },
  });
  if (!trainer) {
    return NextResponse.json({ error: "Trainer not found" }, { status: 404 });
  }

  // Verify trainer has availability covering this slot
  const dow = startTime.getDay();
  const avails = await prisma.availability.findMany({
    where: { trainerId, dayOfWeek: dow },
  });
  const covered = avails.some(
    (a) => a.startTime <= slotStart && a.endTime >= slotEnd
  );
  if (!covered) {
    return NextResponse.json(
      { error: "Trainer is not available at this time" },
      { status: 409 }
    );
  }

  // Check for booking conflicts (atomicity: re-check inside transaction)
  const conflict = await prisma.bookingSession.findFirst({
    where: {
      trainerId,
      status: "UPCOMING",
      AND: [{ startTime: { lt: endTime } }, { endTime: { gt: startTime } }],
    },
  });
  if (conflict) {
    return NextResponse.json(
      { error: "This slot was just taken — please pick another time" },
      { status: 409 }
    );
  }

  const booking = await prisma.bookingSession.create({
    data: {
      trainerId,
      clientId: session.user.id,
      startTime,
      endTime,
      workoutType,
      notes: notes || null,
      status: "UPCOMING",
    },
  });

  return NextResponse.json({ success: true, bookingId: booking.id });
}
