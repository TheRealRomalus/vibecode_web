import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const patchSchema = z.object({
  workoutType: z.enum(["STRENGTH", "CARDIO", "MOBILITY", "HIIT", "OTHER"]).optional(),
  trainerNotes: z.string().max(2000).optional(),
  status: z.enum(["UPCOMING", "COMPLETED", "CANCELLED"]).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "TRAINER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = patchSchema.safeParse(await req.json());
  if (!result.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  // Verify this session belongs to the trainer
  const booking = await prisma.bookingSession.findUnique({
    where: { id: params.id },
    select: { trainerId: true },
  });
  if (!booking) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (booking.trainerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.bookingSession.update({
    where: { id: params.id },
    data: result.data,
  });

  // When a session is marked completed, increment sessionsUsed on TrainerClient
  if (result.data.status === "COMPLETED") {
    await prisma.trainerClient.updateMany({
      where: { trainerId: session.user.id, clientId: updated.clientId },
      data: { sessionsUsed: { increment: 1 } },
    });
  }

  return NextResponse.json(updated);
}
