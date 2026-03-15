import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const createSchema = z.object({
  clientId: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

// POST /api/trainer/plans — create a workout plan for a client
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "TRAINER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = createSchema.safeParse(await req.json());
  if (!result.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  const tc = await prisma.trainerClient.findUnique({
    where: { trainerId_clientId: { trainerId: session.user.id, clientId: result.data.clientId } },
  });
  if (!tc) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const plan = await prisma.workoutPlan.create({
    data: {
      trainerClientId: tc.id,
      name: result.data.name,
      description: result.data.description ?? null,
    },
    include: { exercises: true },
  });
  return NextResponse.json(plan, { status: 201 });
}
