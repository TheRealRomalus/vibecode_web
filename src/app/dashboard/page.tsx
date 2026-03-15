import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import Link from "next/link";
import SignOutButton from "@/components/SignOutButton";
import Calendar, { type DayData } from "@/components/Calendar";
import ClientNav from "@/components/ClientNav";

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

const WORKOUT_COLORS: Record<string, string> = {
  STRENGTH: "bg-orange-100 text-orange-700",
  CARDIO: "bg-red-100 text-red-700",
  MOBILITY: "bg-blue-100 text-blue-700",
  HIIT: "bg-purple-100 text-purple-700",
  OTHER: "bg-gray-100 text-gray-700",
};

const STATUS_STYLES: Record<string, string> = {
  UPCOMING: "bg-indigo-100 text-indigo-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-600",
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

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

type ExerciseLogItem = {
  id: string;
  setsLogged: number;
  repsLogged: string;
  weightUsed: number | null;
  exercise: { name: string };
};

type BookingWithTrainer = {
  id: string;
  startTime: Date;
  endTime: Date;
  workoutType: string;
  notes: string | null;
  trainerNotes: string | null;
  status: string;
  trainer: { name: string | null; image: string | null };
  exerciseLogs?: ExerciseLogItem[];
};

function SessionCard({ s, past = false }: { s: BookingWithTrainer; past?: boolean }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900">{formatDate(s.startTime)}</p>
          <p className="text-sm text-gray-500">
            {formatTime(s.startTime)} – {formatTime(s.endTime)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${WORKOUT_COLORS[s.workoutType] ?? "bg-gray-100 text-gray-600"}`}>
            {WORKOUT_LABELS[s.workoutType] ?? s.workoutType}
          </span>
          {past && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[s.status] ?? "bg-gray-100 text-gray-600"}`}>
              {s.status.charAt(0) + s.status.slice(1).toLowerCase()}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {s.trainer.image ? (
          <Image src={s.trainer.image} alt="" width={28} height={28} className="rounded-full" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-semibold">
            {s.trainer.name?.[0] ?? "T"}
          </div>
        )}
        <p className="text-sm text-gray-600">{s.trainer.name ?? "Your trainer"}</p>
      </div>

      {s.notes && (
        <p className="text-sm text-gray-500 italic border-t pt-2">{s.notes}</p>
      )}

      {s.exerciseLogs && s.exerciseLogs.length > 0 && (
        <div className="border-t pt-2 space-y-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Exercises</p>
          {s.exerciseLogs.map((log) => (
            <div key={log.id} className="flex items-center justify-between gap-2">
              <span className="text-xs text-gray-700 truncate">{log.exercise.name}</span>
              <span className="text-xs text-gray-400 flex-shrink-0">
                {log.setsLogged}×{log.repsLogged}
                {log.weightUsed ? ` @ ${log.weightUsed}kg` : ""}
              </span>
            </div>
          ))}
        </div>
      )}

      {s.trainerNotes && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3">
          <p className="text-xs font-semibold text-indigo-500 mb-1">Note from trainer</p>
          <p className="text-sm text-indigo-900">{s.trainerNotes}</p>
        </div>
      )}
    </div>
  );
}

function EmptyState({ message, cta }: { message: string; cta?: boolean }) {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
      <p className="text-gray-400 text-sm">{message}</p>
      {cta && (
        <Link href="/book" className="mt-3 inline-block text-sm font-medium text-indigo-600 hover:underline">
          Book your first session →
        </Link>
      )}
    </div>
  );
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/");
  if (!session.user.onboardingComplete) redirect("/onboarding");
  if (session.user.role === "TRAINER") redirect("/trainer");

  const now = new Date();
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const [upcoming, past, calendarRaw] = await Promise.all([
    prisma.bookingSession.findMany({
      where: { clientId: session.user.id, status: "UPCOMING", startTime: { gte: now } },
      include: { trainer: { select: { name: true, image: true } } },
      orderBy: { startTime: "asc" },
      take: 10,
    }),
    prisma.bookingSession.findMany({
      where: { clientId: session.user.id, status: { in: ["COMPLETED", "CANCELLED"] } },
      include: {
        trainer: { select: { name: true, image: true } },
        exerciseLogs: {
          include: { exercise: { select: { name: true } } },
          orderBy: { exercise: { order: "asc" } },
        },
      },
      orderBy: { startTime: "desc" },
      take: 5,
    }),
    prisma.bookingSession.findMany({
      where: { clientId: session.user.id, startTime: { gte: threeMonthsAgo } },
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
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                {session.user.name?.[0] ?? "?"}
              </div>
            )}
            <div>
              <p className="text-xs text-gray-400">{greeting()}</p>
              <p className="font-semibold text-gray-900 leading-tight">
                {session.user.name?.split(" ")[0]}
              </p>
            </div>
          </div>
          <SignOutButton />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-6 space-y-8">
        {/* Calendar */}
        <Calendar days={calendarDays} />

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900">Upcoming Sessions</h2>
            <Link href="/book" className="text-sm font-medium text-indigo-600 hover:underline">
              + Book
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <EmptyState message="No upcoming sessions." cta />
          ) : (
            <div className="space-y-3">
              {upcoming.map((s) => <SessionCard key={s.id} s={s} />)}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Past Sessions</h2>
          {past.length === 0 ? (
            <EmptyState message="No past sessions yet." />
          ) : (
            <div className="space-y-3">
              {past.map((s) => <SessionCard key={s.id} s={s} past />)}
            </div>
          )}
        </section>
      </main>

      <ClientNav />
    </div>
  );
}
