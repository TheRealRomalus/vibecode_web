import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import BookingFlow from "./BookingFlow";
import ClientNav from "@/components/ClientNav";

export default async function BookPage() {
  const session = await auth();
  if (!session?.user) redirect("/");
  if (!session.user.onboardingComplete) redirect("/onboarding");
  if (session.user.role === "TRAINER") redirect("/trainer");

  const trainersRaw = await prisma.user.findMany({
    where: { role: "TRAINER", onboardingComplete: true },
    select: {
      id: true,
      name: true,
      image: true,
      availability: { select: { dayOfWeek: true } },
    },
  });

  const trainers = trainersRaw
    .filter((t) => t.availability.length > 0)
    .map((t) => ({
      id: t.id,
      name: t.name,
      image: t.image,
      availableDows: Array.from(new Set(t.availability.map((a) => a.dayOfWeek))),
    }));

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white border-b px-4 py-3 sticky top-0 z-10">
        <div className="max-w-lg mx-auto">
          <h1 className="font-bold text-gray-900">Book a session</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-6">
        <BookingFlow trainers={trainers} />
      </main>

      <ClientNav />
    </div>
  );
}
