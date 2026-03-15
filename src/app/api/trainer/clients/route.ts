import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/trainer/clients — list all clients for this trainer
export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "TRAINER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clients = await prisma.trainerClient.findMany({
    where: { trainerId: session.user.id, active: true },
    include: {
      client: { select: { id: true, name: true, email: true, image: true } },
      workoutPlans: { where: { active: true }, select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(clients);
}

const addSchema = z.object({ email: z.string().email() });

// POST /api/trainer/clients — add a client by email
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "TRAINER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = addSchema.safeParse(await req.json());
  if (!result.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const clientUser = await prisma.user.findUnique({
    where: { email: result.data.email },
  });
  if (!clientUser) {
    return NextResponse.json(
      { error: "No account found with that email. Ask them to sign up first." },
      { status: 404 }
    );
  }
  if (clientUser.role !== "CLIENT") {
    return NextResponse.json(
      { error: "That account is registered as a trainer." },
      { status: 400 }
    );
  }
  if (clientUser.id === session.user.id) {
    return NextResponse.json({ error: "You can't add yourself." }, { status: 400 });
  }

  const existing = await prisma.trainerClient.findUnique({
    where: { trainerId_clientId: { trainerId: session.user.id, clientId: clientUser.id } },
  });
  if (existing) {
    if (existing.active) {
      return NextResponse.json({ error: "Client already added." }, { status: 409 });
    }
    // Re-activate
    const updated = await prisma.trainerClient.update({
      where: { id: existing.id },
      data: { active: true, packageStartDate: new Date(), sessionsUsed: 0 },
    });
    return NextResponse.json(updated);
  }

  const tc = await prisma.trainerClient.create({
    data: { trainerId: session.user.id, clientId: clientUser.id },
  });
  return NextResponse.json(tc, { status: 201 });
}
