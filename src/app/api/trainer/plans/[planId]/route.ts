import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

type Ctx = { params: { planId: string } };

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  active: z.boolean().optional(),
});

async function getOwnedPlan(planId: string, trainerId: string) {
  return prisma.workoutPlan.findFirst({
    where: { id: planId, trainerClient: { trainerId } },
  });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "TRAINER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const plan = await getOwnedPlan(params.planId, session.user.id);
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  const result = patchSchema.safeParse(await req.json());
  if (!result.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  const updated = await prisma.workoutPlan.update({
    where: { id: params.planId },
    data: result.data,
    include: { exercises: { orderBy: { order: "asc" } } },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "TRAINER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const plan = await getOwnedPlan(params.planId, session.user.id);
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  await prisma.workoutPlan.delete({ where: { id: params.planId } });
  return NextResponse.json({ success: true });
}
