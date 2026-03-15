import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const trainerClient = await prisma.trainerClient.findUnique({
    where: {
      trainerId_clientId: {
        trainerId: params.id,
        clientId: session.user.id,
      },
    },
    include: {
      workoutPlans: {
        where: { active: true },
        include: {
          exercises: { orderBy: { order: "asc" } },
        },
      },
    },
  });

  if (!trainerClient) {
    return NextResponse.json({ plans: [] });
  }

  return NextResponse.json({ plans: trainerClient.workoutPlans });
}
