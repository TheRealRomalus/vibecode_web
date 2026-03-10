import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  role: z.enum(["TRAINER", "CLIENT"]),
  trainerCode: z.string().optional(),
});

// POST /api/user/role — set the user's role during onboarding
export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const result = bodySchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid role. Must be TRAINER or CLIENT." },
      { status: 400 }
    );
  }

  // Trainer role requires a secret code validated server-side.
  // The code never reaches the client — comparison happens here only.
  if (result.data.role === "TRAINER") {
    const expected = process.env.TRAINER_SECRET_CODE;
    if (!expected) {
      return NextResponse.json(
        { error: "Trainer sign-ups are not currently enabled." },
        { status: 403 }
      );
    }
    if (result.data.trainerCode !== expected) {
      return NextResponse.json(
        { error: "Incorrect trainer code. Please check with your administrator." },
        { status: 403 }
      );
    }
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      role: result.data.role,
      onboardingComplete: true,
    },
  });

  return NextResponse.json({ success: true, role: result.data.role });
}
