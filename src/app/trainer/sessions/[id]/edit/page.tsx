import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SessionEditForm from "./SessionEditForm";
import TrainerNav from "@/components/TrainerNav";

export default async function EditSessionPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/");
  if (session.user.role !== "TRAINER") redirect("/dashboard");

  const booking = await prisma.bookingSession.findUnique({
    where: { id: params.id },
    include: {
      client: { select: { name: true, image: true } },
      exerciseLogs: true,
    },
  });

  if (!booking || booking.trainerId !== session.user.id) notFound();

  // Find all active plans + previous session for this client
  const [clientPlans, previousSession] = await Promise.all([
    prisma.workoutPlan.findMany({
      where: {
        active: true,
        trainerClient: { trainerId: session.user.id, clientId: booking.clientId },
      },
      include: { exercises: { orderBy: { order: "asc" } } },
      orderBy: { createdAt: "desc" },
    }),
    // Most recent completed session for this client (excluding current)
    prisma.bookingSession.findFirst({
      where: {
        trainerId: session.user.id,
        clientId: booking.clientId,
        status: "COMPLETED",
        id: { not: params.id },
      },
      orderBy: { startTime: "desc" },
      include: {
        exerciseLogs: {
          include: { exercise: { select: { name: true } } },
        },
      },
    }),
  ]);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white border-b px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto">
          <h1 className="font-bold text-gray-900">Edit Session</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-6 pb-12">
        <SessionEditForm
          booking={booking}
          plans={clientPlans.map((p) => ({
            id: p.id,
            name: p.name,
            exercises: p.exercises.map((e) => ({
              id: e.id,
              name: e.name,
              targetSets: e.targetSets,
              targetReps: e.targetReps,
              targetWeight: e.targetWeight,
            })),
          }))}
          existingLogs={booking.exerciseLogs.map((l) => ({
            exerciseId: l.exerciseId,
            setsLogged: l.setsLogged,
            repsLogged: l.repsLogged,
            weightUsed: l.weightUsed,
            weightsLogged: l.weightsLogged,
            notes: l.notes,
          }))}
          previousLogs={previousSession?.exerciseLogs.map((l) => ({
            exerciseId: l.exerciseId,
            exerciseName: l.exercise.name,
            setsLogged: l.setsLogged,
            repsLogged: l.repsLogged,
            weightUsed: l.weightUsed,
          })) ?? []}
          previousSessionDate={previousSession?.startTime ?? null}
        />
      </main>

      <TrainerNav />
    </div>
  );
}
