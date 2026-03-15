import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import SignOutButton from "@/components/SignOutButton";
import ClientNav from "@/components/ClientNav";
import TrainerNav from "@/components/TrainerNav";

const ROLE_LABELS: Record<string, string> = {
  CLIENT: "Client",
  TRAINER: "Trainer",
};

function addWeeks(date: Date, weeks: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  return d;
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/");
  if (!session.user.onboardingComplete) redirect("/onboarding");

  const isTrainer = session.user.role === "TRAINER";

  const [stats, trainerClient] = await Promise.all([
    isTrainer
      ? prisma.bookingSession.aggregate({
          where: { trainerId: session.user.id, status: "COMPLETED" },
          _count: { id: true },
        })
      : prisma.bookingSession.aggregate({
          where: { clientId: session.user.id, status: "COMPLETED" },
          _count: { id: true },
        }),
    !isTrainer
      ? prisma.trainerClient.findFirst({
          where: { clientId: session.user.id, active: true },
          include: { trainer: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve(null),
  ]);

  const trainerClients = isTrainer
    ? await prisma.trainerClient.findMany({
        where: { trainerId: session.user.id, active: true },
        include: { client: { select: { name: true, image: true } } },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const workoutPlans = !isTrainer
    ? await prisma.workoutPlan.findMany({
        where: {
          trainerClient: { clientId: session.user.id, active: true },
        },
        include: {
          exercises: { orderBy: { order: "asc" } },
        },
        orderBy: [{ active: "desc" }, { createdAt: "desc" }],
      })
    : [];

  const completedCount = stats._count.id;

  const pkg = trainerClient && trainerClient.packageType === "SESSION_COUNT" && trainerClient.totalSessions != null
    ? {
        type: "SESSION_COUNT" as const,
        total: trainerClient.totalSessions,
        used: trainerClient.sessionsUsed,
        left: trainerClient.totalSessions - trainerClient.sessionsUsed,
        gracePeriodWeeks: trainerClient.gracePeriodWeeks,
        startDate: trainerClient.packageStartDate,
        expiresAt: addWeeks(
          trainerClient.packageStartDate,
          trainerClient.totalSessions + trainerClient.gracePeriodWeeks
        ),
        trainerName: trainerClient.trainer.name,
      }
    : trainerClient && trainerClient.packageType === "WEEKLY"
    ? {
        type: "WEEKLY" as const,
        perWeek: trainerClient.sessionsPerWeek ?? 0,
        used: trainerClient.sessionsUsed,
        gracePeriodWeeks: trainerClient.gracePeriodWeeks,
        startDate: trainerClient.packageStartDate,
        trainerName: trainerClient.trainer.name,
      }
    : null;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white border-b px-4 py-3 sticky top-0 z-10">
        <div className="max-w-lg mx-auto">
          <h1 className="font-bold text-gray-900">Profile</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-8 space-y-5">
        {/* Avatar + name */}
        <div className="flex flex-col items-center gap-3 pb-2">
          {session.user.image ? (
            <Image
              src={session.user.image}
              alt=""
              width={80}
              height={80}
              className="rounded-full ring-2 ring-white shadow"
            />
          ) : (
            <div className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow ${isTrainer ? "bg-violet-500" : "bg-indigo-500"}`}>
              {session.user.name?.[0] ?? "?"}
            </div>
          )}
          <div className="text-center">
            <p className="text-xl font-bold text-gray-900">{session.user.name}</p>
            <p className="text-sm text-gray-400">{session.user.email}</p>
          </div>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${isTrainer ? "bg-violet-100 text-violet-700" : "bg-indigo-100 text-indigo-700"}`}>
            {ROLE_LABELS[session.user.role]}
          </span>
        </div>

        {/* Stats */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-500 mb-4 uppercase tracking-wide">Stats</h2>
          <div className="flex divide-x divide-gray-100">
            <div className="flex-1 text-center">
              <p className="text-3xl font-bold text-gray-900">{completedCount}</p>
              <p className="text-xs text-gray-400 mt-1">Sessions completed</p>
            </div>
            {pkg?.type === "SESSION_COUNT" && (
              <>
                <div className="flex-1 text-center">
                  <p className={`text-3xl font-bold ${pkg.left <= 1 ? "text-red-600" : "text-gray-900"}`}>
                    {pkg.left}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Sessions left</p>
                </div>
                <div className="flex-1 text-center">
                  <p className="text-3xl font-bold text-gray-900">{pkg.total}</p>
                  <p className="text-xs text-gray-400 mt-1">Total bought</p>
                </div>
              </>
            )}
            {pkg?.type === "WEEKLY" && (
              <div className="flex-1 text-center">
                <p className="text-3xl font-bold text-gray-900">{pkg.perWeek}</p>
                <p className="text-xs text-gray-400 mt-1">Sessions / week</p>
              </div>
            )}
          </div>
        </div>

        {/* Package card — clients with an active package */}
        {pkg && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-500 mb-1 uppercase tracking-wide">Your Package</h2>
            {pkg.trainerName && (
              <p className="text-xs text-gray-400 mb-4">Set up by {pkg.trainerName}</p>
            )}
            <div className="divide-y divide-gray-50">
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-gray-500">Package type</span>
                <span className="text-sm font-medium text-gray-900">
                  {pkg.type === "SESSION_COUNT" ? `${pkg.total} sessions` : `${pkg.perWeek}× per week`}
                </span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-gray-500">Sessions used</span>
                <span className="text-sm font-medium text-gray-900">{pkg.used}</span>
              </div>
              {pkg.type === "SESSION_COUNT" && (
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm text-gray-500">Sessions remaining</span>
                  <span className={`text-sm font-semibold ${pkg.left <= 1 ? "text-red-600" : "text-indigo-600"}`}>
                    {pkg.left}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-gray-500">Grace period</span>
                <span className="text-sm font-medium text-gray-900">{pkg.gracePeriodWeeks} weeks</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-sm text-gray-500">Package started</span>
                <span className="text-sm font-medium text-gray-900">{fmtDate(pkg.startDate)}</span>
              </div>
              {pkg.type === "SESSION_COUNT" && (
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm text-gray-500">Expires by</span>
                  <span className="text-sm font-medium text-gray-900">{fmtDate(pkg.expiresAt)}</span>
                </div>
              )}
            </div>

            {pkg.type === "SESSION_COUNT" && pkg.left <= 0 && (
              <div className="mt-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                <p className="text-sm text-red-700 font-medium">Package complete — contact your trainer to renew.</p>
              </div>
            )}
            {pkg.type === "SESSION_COUNT" && pkg.left === 1 && (
              <div className="mt-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                <p className="text-sm text-amber-700 font-medium">Last session remaining — speak to your trainer about renewing.</p>
              </div>
            )}
          </div>
        )}

        {/* Client list — trainers only */}
        {isTrainer && trainerClients.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-500 mb-4 uppercase tracking-wide">
              Clients ({trainerClients.length})
            </h2>
            <div className="divide-y divide-gray-50">
              {trainerClients.map((tc) => {
                const isSessionCount = tc.packageType === "SESSION_COUNT" && tc.totalSessions != null;
                const sessionsLeft = isSessionCount ? tc.totalSessions! - tc.sessionsUsed : null;
                const expiresAt = isSessionCount
                  ? addWeeks(tc.packageStartDate, tc.totalSessions! + tc.gracePeriodWeeks)
                  : null;
                return (
                  <div key={tc.id} className="flex items-center gap-3 py-3">
                    {tc.client.image ? (
                      <Image src={tc.client.image} alt="" width={36} height={36} className="rounded-full flex-shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-semibold text-sm flex-shrink-0">
                        {tc.client.name?.[0] ?? "C"}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{tc.client.name ?? "Client"}</p>
                      <p className="text-xs text-gray-400">
                        {isSessionCount
                          ? `${sessionsLeft} session${sessionsLeft !== 1 ? "s" : ""} left`
                          : `${tc.sessionsPerWeek ?? "?"}×/week`}
                        {expiresAt && ` · expires ${fmtDate(expiresAt)}`}
                      </p>
                    </div>
                    {isSessionCount && sessionsLeft !== null && sessionsLeft <= 1 && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-600 flex-shrink-0">
                        {sessionsLeft === 0 ? "Expired" : "Last session"}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Workout plans — clients only */}
        {!isTrainer && workoutPlans.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-500 mb-4 uppercase tracking-wide">
              My Workout Plans
            </h2>
            <div className="space-y-4">
              {workoutPlans.map((plan) => (
                <div key={plan.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">{plan.name}</p>
                    {plan.active && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">Active</span>
                    )}
                  </div>
                  {plan.exercises.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No exercises added yet.</p>
                  ) : (
                    <div className="bg-gray-50 rounded-xl divide-y divide-gray-100">
                      {plan.exercises.map((ex, i) => (
                        <div key={ex.id} className="flex items-center justify-between gap-2 px-3 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs text-gray-300 font-mono w-4 flex-shrink-0">{i + 1}</span>
                            <span className="text-sm text-gray-800 truncate">{ex.name}</span>
                          </div>
                          <span className="text-xs text-gray-400 flex-shrink-0">
                            {ex.targetSets}×{ex.targetReps}
                            {ex.targetWeight ? ` @ ${ex.targetWeight}kg` : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Account info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          <div className="flex items-center justify-between px-5 py-4">
            <span className="text-sm text-gray-500">Account</span>
            <span className="text-sm font-medium text-gray-900">Google</span>
          </div>
          <div className="flex items-center justify-between px-5 py-4">
            <span className="text-sm text-gray-500">Email</span>
            <span className="text-sm font-medium text-gray-900">{session.user.email}</span>
          </div>
          <div className="flex items-center justify-between px-5 py-4">
            <span className="text-sm text-gray-500">Role</span>
            <span className="text-sm font-medium text-gray-900">{ROLE_LABELS[session.user.role]}</span>
          </div>
        </div>

        {/* Sign out */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 flex items-center justify-between">
            <span className="text-sm text-gray-500">Sign out of FitBook</span>
            <SignOutButton />
          </div>
        </div>
      </main>

      {isTrainer ? <TrainerNav /> : <ClientNav />}
    </div>
  );
}
