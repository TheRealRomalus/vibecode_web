import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import AvailabilityForm from "@/components/AvailabilityForm";

export default async function AvailabilityPage() {
  const session = await auth();
  if (!session?.user) redirect("/");
  if (session.user.role !== "TRAINER") redirect("/dashboard");

  const slots = await prisma.availability.findMany({
    where: { trainerId: session.user.id },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white border-b px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link href="/trainer" className="text-gray-400 hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="font-bold text-gray-900">Availability</h1>
            <p className="text-xs text-gray-400">Set your bookable hours</p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-6 pb-12">
        <AvailabilityForm
          initial={slots.map((s) => ({
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
          }))}
        />
      </main>
    </div>
  );
}
