import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

type Ctx = { params: { clientId: string } };

const patchSchema = z.object({
  packageType: z.enum(["SESSION_COUNT", "WEEKLY"]).optional(),
  totalSessions: z.number().int().min(1).nullable().optional(),
  sessionsPerWeek: z.number().int().min(1).nullable().optional(),
  gracePeriodWeeks: z.number().int().min(0).max(52).optional(),
  packageStartDate: z.string().optional(), // ISO date string
  internalNotes: z.string().max(2000).nullable().optional(),
});

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "TRAINER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tc = await prisma.trainerClient.findUnique({
    where: { trainerId_clientId: { trainerId: session.user.id, clientId: params.clientId } },
  });
  if (!tc) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const result = patchSchema.safeParse(await req.json());
  if (!result.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  const { packageStartDate, ...rest } = result.data;
  const updated = await prisma.trainerClient.update({
    where: { id: tc.id },
    data: {
      ...rest,
      ...(packageStartDate ? { packageStartDate: new Date(packageStartDate) } : {}),
    },
  });
  return NextResponse.json(updated);
}
