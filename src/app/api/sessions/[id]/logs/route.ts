import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

type Ctx = { params: { id: string } };

const logSchema = z.array(
  z.object({
    exerciseId: z.string(),
    setsLogged: z.number().int().min(1),
    repsLogged: z.string().min(1).max(200),
    weightUsed: z.number().nonnegative().nullable().optional(),
    weightsLogged: z.string().max(200).nullable().optional(),
    notes: z.string().max(500).nullable().optional(),
  })
);

// PUT /api/sessions/[id]/logs — replace all exercise logs for this session
export async function PUT(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "TRAINER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const booking = await prisma.bookingSession.findUnique({
    where: { id: params.id },
    select: { trainerId: true },
  });
  if (!booking || booking.trainerId !== session.user.id) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const result = logSchema.safeParse(await req.json());
  if (!result.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  // Replace all logs for this session in a transaction
  const logs = await prisma.$transaction([
    prisma.exerciseLog.deleteMany({ where: { sessionId: params.id } }),
    ...result.data.map((log) =>
      prisma.exerciseLog.create({
        data: {
          sessionId: params.id,
          exerciseId: log.exerciseId,
          setsLogged: log.setsLogged,
          repsLogged: log.repsLogged,
          weightUsed: log.weightUsed ?? null,
          weightsLogged: log.weightsLogged ?? null,
          notes: log.notes ?? null,
        },
      })
    ),
  ]);

  return NextResponse.json({ saved: logs.length - 1 });
}

// GET /api/sessions/[id]/logs — fetch logs for this session
export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "TRAINER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const booking = await prisma.bookingSession.findUnique({
    where: { id: params.id },
    select: { trainerId: true },
  });
  if (!booking || booking.trainerId !== session.user.id) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const logs = await prisma.exerciseLog.findMany({
    where: { sessionId: params.id },
    include: { exercise: { select: { name: true, targetSets: true, targetReps: true } } },
  });
  return NextResponse.json(logs);
}
