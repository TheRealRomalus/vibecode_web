import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

type Ctx = { params: { planId: string } };

const schema = z.object({
  name: z.string().min(1).max(100),
  targetSets: z.number().int().min(1).default(3),
  targetReps: z.string().min(1).max(20).default("10"),
  targetWeight: z.number().positive().nullable().optional(),
  order: z.number().int().min(0).optional(),
});

// POST /api/trainer/plans/[planId]/exercises — add exercise to plan
export async function POST(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "TRAINER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const plan = await prisma.workoutPlan.findFirst({
    where: { id: params.planId, trainerClient: { trainerId: session.user.id } },
    include: { exercises: { select: { order: true } } },
  });
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  const result = schema.safeParse(await req.json());
  if (!result.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  const maxOrder = plan.exercises.reduce((m, e) => Math.max(m, e.order), -1);
  const exercise = await prisma.planExercise.create({
    data: {
      planId: params.planId,
      name: result.data.name,
      targetSets: result.data.targetSets,
      targetReps: result.data.targetReps,
      targetWeight: result.data.targetWeight ?? null,
      order: result.data.order ?? maxOrder + 1,
    },
  });
  return NextResponse.json(exercise, { status: 201 });
}
