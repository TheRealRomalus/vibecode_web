import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SessionEditForm from "./SessionEditForm";

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
    include: { client: { select: { name: true, image: true } } },
  });

  if (!booking || booking.trainerId !== session.user.id) notFound();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 py-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <a href="/trainer" className="text-gray-400 hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </a>
          <h1 className="font-bold text-gray-900">Edit Session</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-6 pb-12">
        <SessionEditForm booking={booking} />
      </main>
    </div>
  );
}
