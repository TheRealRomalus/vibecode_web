import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import Link from "next/link";
import TrainerNav from "@/components/TrainerNav";
import AddClientForm from "./AddClientForm";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const session = await auth();
  if (!session?.user) redirect("/");
  if (session.user.role !== "TRAINER") redirect("/dashboard");

  const trainerClients = await prisma.trainerClient.findMany({
    where: { trainerId: session.user.id, active: true },
    include: {
      client: { select: { id: true, name: true, email: true, image: true } },
      workoutPlans: { where: { active: true }, select: { id: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white border-b px-4 py-3 sticky top-0 z-10">
        <div className="max-w-lg mx-auto">
          <h1 className="font-bold text-gray-900">Clients</h1>
          <p className="text-xs text-gray-400">{trainerClients.length} active client{trainerClients.length !== 1 ? "s" : ""}</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-6 space-y-6">
        {/* Add client */}
        <AddClientForm />

        {/* Client list */}
        {trainerClients.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
            <p className="text-gray-400 text-sm">No clients yet.</p>
            <p className="text-gray-400 text-xs mt-1">Add a client above by entering their email address.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {trainerClients.map((tc) => {
              const sessionsLeft =
                tc.packageType === "SESSION_COUNT" && tc.totalSessions != null
                  ? tc.totalSessions - tc.sessionsUsed
                  : null;

              const expiresAt =
                tc.packageType === "SESSION_COUNT" && tc.totalSessions != null
                  ? new Date(
                      tc.packageStartDate.getTime() +
                        (tc.totalSessions + tc.gracePeriodWeeks) * 7 * 24 * 60 * 60 * 1000
                    )
                  : null;

              const isExpiringSoon =
                expiresAt != null &&
                expiresAt.getTime() - Date.now() < 14 * 24 * 60 * 60 * 1000;

              return (
                <Link
                  key={tc.id}
                  href={`/trainer/clients/${tc.client.id}`}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:border-violet-200 hover:bg-violet-50/20 transition-colors"
                >
                  {tc.client.image ? (
                    <Image src={tc.client.image} alt="" width={44} height={44} className="rounded-full flex-shrink-0" />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-lg flex-shrink-0">
                      {tc.client.name?.[0] ?? "C"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{tc.client.name ?? tc.client.email}</p>
                    <p className="text-xs text-gray-400 truncate">{tc.client.email}</p>
                  </div>
                  <div className="flex-shrink-0 text-right space-y-1">
                    {sessionsLeft != null ? (
                      <p className={`text-xs font-semibold ${sessionsLeft <= 1 ? "text-red-500" : "text-violet-600"}`}>
                        {sessionsLeft} session{sessionsLeft !== 1 ? "s" : ""} left
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400">
                        {tc.sessionsPerWeek ?? "—"}×/week
                      </p>
                    )}
                    {isExpiringSoon && (
                      <p className="text-xs text-orange-500 font-medium">Expiring soon</p>
                    )}
                    {tc.workoutPlans.length > 0 && (
                      <p className="text-xs text-gray-400">{tc.workoutPlans.length} plan{tc.workoutPlans.length !== 1 ? "s" : ""}</p>
                    )}
                  </div>
                  <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <TrainerNav />
    </div>
  );
}
