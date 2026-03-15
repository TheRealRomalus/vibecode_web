import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import Link from "next/link";
import TrainerNav from "@/components/TrainerNav";
import PackageEditor from "./PackageEditor";
import WorkoutPlanManager from "./WorkoutPlanManager";

export const dynamic = "force-dynamic";

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function formatTime(d: Date) {
  return new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

const WORKOUT_LABELS: Record<string, string> = {
  STRENGTH: "Strength", CARDIO: "Cardio", MOBILITY: "Mobility", HIIT: "HIIT", OTHER: "Other",
};
const STATUS_STYLES: Record<string, string> = {
  UPCOMING: "bg-indigo-100 text-indigo-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-600",
};

export default async function ClientDetailPage({ params }: { params: { clientId: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/");
  if (session.user.role !== "TRAINER") redirect("/dashboard");

  const tc = await prisma.trainerClient.findUnique({
    where: { trainerId_clientId: { trainerId: session.user.id, clientId: params.clientId } },
    include: {
      client: { select: { id: true, name: true, email: true, image: true, createdAt: true } },
      workoutPlans: {
        orderBy: { createdAt: "desc" },
        include: { exercises: { orderBy: { order: "asc" } } },
      },
    },
  });
  if (!tc) notFound();

  const sessions = await prisma.bookingSession.findMany({
    where: { trainerId: session.user.id, clientId: params.clientId },
    orderBy: { startTime: "desc" },
    take: 20,
    include: {
      exerciseLogs: {
        include: { exercise: { select: { name: true } } },
      },
    },
  });

  // Package expiry calculation
  const expiresAt =
    tc.packageType === "SESSION_COUNT" && tc.totalSessions != null
      ? new Date(
          tc.packageStartDate.getTime() +
            (tc.totalSessions + tc.gracePeriodWeeks) * 7 * 24 * 60 * 60 * 1000
        )
      : null;

  const sessionsLeft =
    tc.packageType === "SESSION_COUNT" && tc.totalSessions != null
      ? Math.max(0, tc.totalSessions - tc.sessionsUsed)
      : null;

  const completedCount = sessions.filter((s) => s.status === "COMPLETED").length;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white border-b px-4 py-3 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link href="/trainer/clients" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          {tc.client.image ? (
            <Image src={tc.client.image} alt="" width={32} height={32} className="rounded-full" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold">
              {tc.client.name?.[0] ?? "C"}
            </div>
          )}
          <div>
            <h1 className="font-bold text-gray-900 leading-tight">{tc.client.name ?? tc.client.email}</h1>
            <p className="text-xs text-gray-400">{tc.client.email}</p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-5 space-y-5">

        {/* ── Stats row ─────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">{completedCount}</p>
            <p className="text-xs text-gray-400 mt-0.5">Done</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">{sessionsLeft ?? "∞"}</p>
            <p className="text-xs text-gray-400 mt-0.5">Remaining</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 text-center">
            <p className="text-2xl font-bold text-gray-900">{tc.workoutPlans.filter(p => p.active).length}</p>
            <p className="text-xs text-gray-400 mt-0.5">Plans</p>
          </div>
        </div>

        {/* ── Package editor ────────────────────────────────── */}
        <PackageEditor
          clientId={tc.client.id}
          packageType={tc.packageType}
          totalSessions={tc.totalSessions}
          sessionsUsed={tc.sessionsUsed}
          sessionsPerWeek={tc.sessionsPerWeek}
          gracePeriodWeeks={tc.gracePeriodWeeks}
          packageStartDate={tc.packageStartDate.toISOString().split("T")[0]}
          expiresAt={expiresAt ? expiresAt.toISOString().split("T")[0] : null}
          sessionsLeft={sessionsLeft}
        />

        {/* ── Workout plan manager ──────────────────────────── */}
        <WorkoutPlanManager
          clientId={tc.client.id}
          plans={tc.workoutPlans.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            active: p.active,
            exercises: p.exercises.map((e) => ({
              id: e.id,
              name: e.name,
              targetSets: e.targetSets,
              targetReps: e.targetReps,
              targetWeight: e.targetWeight,
              order: e.order,
            })),
          }))}
        />

        {/* ── Session history ───────────────────────────────── */}
        <section>
          <h2 className="text-base font-bold text-gray-900 mb-3">Session History</h2>
          {sessions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
              <p className="text-gray-400 text-sm">No sessions yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((s) => (
                <div key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900">{formatDate(s.startTime)}</p>
                      <p className="text-xs text-gray-400">{formatTime(s.startTime)} – {formatTime(s.endTime)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        {WORKOUT_LABELS[s.workoutType] ?? s.workoutType}
                      </span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[s.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {s.status.charAt(0) + s.status.slice(1).toLowerCase()}
                      </span>
                    </div>
                  </div>

                  {s.trainerNotes && (
                    <p className="text-xs text-gray-500 italic border-t pt-2">{s.trainerNotes}</p>
                  )}

                  {s.exerciseLogs.length > 0 && (
                    <div className="border-t pt-2 space-y-1">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Logged</p>
                      {s.exerciseLogs.map((log) => (
                        <div key={log.id} className="flex items-center justify-between text-xs text-gray-700">
                          <span className="font-medium">{log.exercise.name}</span>
                          <span className="text-gray-400">
                            {log.setsLogged} × {log.repsLogged}
                            {log.weightUsed ? ` @ ${log.weightUsed}kg` : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <Link
                    href={`/trainer/sessions/${s.id}/edit`}
                    className="block text-xs text-violet-600 font-medium hover:underline pt-1"
                  >
                    {s.status === "UPCOMING" ? "Edit session →" : "View / edit →"}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <TrainerNav />
    </div>
  );
}
