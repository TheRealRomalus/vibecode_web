import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import Link from "next/link";
import SignOutButton from "@/components/SignOutButton";
import Calendar, { type DayData } from "@/components/Calendar";
import TrainerNav from "@/components/TrainerNav";

function toLocalDateStr(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

const WORKOUT_LABELS: Record<string, string> = {
  STRENGTH: "Strength",
  CARDIO: "Cardio",
  MOBILITY: "Mobility",
  HIIT: "HIIT",
  OTHER: "Other",
};

const STATUS_STYLES: Record<string, string> = {
  UPCOMING: "bg-indigo-100 text-indigo-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-600",
};

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(d: Date) {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default async function TrainerPage() {
  const session = await auth();
  if (!session?.user) redirect("/");
  if (!session.user.onboardingComplete) redirect("/onboarding");
  if (session.user.role !== "TRAINER") redirect("/dashboard");

  const now = new Date();
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const [upcoming, recent, calendarRaw] = await Promise.all([
    prisma.bookingSession.findMany({
      where: { trainerId: session.user.id, status: "UPCOMING", startTime: { gte: now } },
      include: { client: { select: { name: true, image: true } } },
      orderBy: { startTime: "asc" },
      take: 20,
    }),
    prisma.bookingSession.findMany({
      where: { trainerId: session.user.id, status: { in: ["COMPLETED", "CANCELLED"] } },
      include: { client: { select: { name: true, image: true } } },
      orderBy: { startTime: "desc" },
      take: 5,
    }),
    prisma.bookingSession.findMany({
      where: { trainerId: session.user.id, startTime: { gte: threeMonthsAgo } },
      select: { startTime: true, status: true },
    }),
  ]);

  const calendarMap = new Map<string, DayData>();
  for (const s of calendarRaw) {
    const date = toLocalDateStr(s.startTime);
    const existing = calendarMap.get(date) ?? { date, upcoming: 0, past: 0 };
    if (s.status === "UPCOMING") existing.upcoming++;
    else existing.past++;
    calendarMap.set(date, existing);
  }
  const calendarDays = Array.from(calendarMap.values());

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {session.user.image ? (
              <Image src={session.user.image} alt="" width={40} height={40} className="rounded-full" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold">
                {session.user.name?.[0] ?? "?"}
              </div>
            )}
            <div>
              <p className="text-xs text-gray-400">Trainer</p>
              <p className="font-semibold text-gray-900 leading-tight">
                {session.user.name?.split(" ")[0]}
              </p>
            </div>
          </div>
          <SignOutButton />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-6 space-y-8">
        {/* Calendar — showCounts so trainer can see multi-client days */}
        <Calendar days={calendarDays} showCounts />

        {/* Upcoming */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Upcoming Sessions</h2>
          {upcoming.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
              <p className="text-gray-400 text-sm">No upcoming sessions scheduled.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map((s) => (
                <div key={s.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <p className="font-semibold text-gray-900">{formatDate(s.startTime)}</p>
                      <p className="text-sm text-gray-500">
                        {formatTime(s.startTime)} – {formatTime(s.endTime)}
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[s.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {WORKOUT_LABELS[s.workoutType] ?? s.workoutType}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {s.client.image ? (
                        <Image src={s.client.image} alt="" width={28} height={28} className="rounded-full" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-xs font-semibold">
                          {s.client.name?.[0] ?? "C"}
                        </div>
                      )}
                      <p className="text-sm text-gray-700">{s.client.name ?? "Client"}</p>
                    </div>
                    <Link
                      href={`/trainer/sessions/${s.id}/edit`}
                      className="text-sm font-medium text-indigo-600 hover:underline"
                    >
                      Edit
                    </Link>
                  </div>

                  {s.trainerNotes && (
                    <p className="mt-2 text-xs text-gray-400 italic border-t pt-2 line-clamp-1">
                      Note: {s.trainerNotes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Recent Sessions</h2>
          {recent.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
              <p className="text-gray-400 text-sm">No past sessions yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recent.map((s) => (
                <div key={s.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-semibold text-gray-900">{formatDate(s.startTime)}</p>
                      <p className="text-sm text-gray-500">
                        {s.client.name ?? "Client"} · {WORKOUT_LABELS[s.workoutType] ?? s.workoutType}
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[s.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {s.status.charAt(0) + s.status.slice(1).toLowerCase()}
                    </span>
                  </div>
                  <Link
                    href={`/trainer/sessions/${s.id}/edit`}
                    className="text-sm font-medium text-indigo-600 hover:underline"
                  >
                    View / edit
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
