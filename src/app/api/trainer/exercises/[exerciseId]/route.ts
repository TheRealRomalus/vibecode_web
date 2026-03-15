import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

type Ctx = { params: { exerciseId: string } };

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  targetSets: z.number().int().min(1).optional(),
  targetReps: z.string().min(1).max(20).optional(),
  targetWeight: z.number().positive().nullable().optional(),
  order: z.number().int().min(0).optional(),
});

async function getOwnedExercise(exerciseId: string, trainerId: string) {
  return prisma.planExercise.findFirst({
    where: { id: exerciseId, plan: { trainerClient: { trainerId } } },
  });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "TRAINER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ex = await getOwnedExercise(params.exerciseId, session.user.id);
  if (!ex) return NextResponse.json({ error: "Exercise not found" }, { status: 404 });

  const result = patchSchema.safeParse(await req.json());
  if (!result.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  const updated = await prisma.planExercise.update({
    where: { id: params.exerciseId },
    data: result.data,
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "TRAINER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ex = await getOwnedExercise(params.exerciseId, session.user.id);
  if (!ex) return NextResponse.json({ error: "Exercise not found" }, { status: 404 });

  await prisma.planExercise.delete({ where: { id: params.exerciseId } });
  return NextResponse.json({ success: true });
}
