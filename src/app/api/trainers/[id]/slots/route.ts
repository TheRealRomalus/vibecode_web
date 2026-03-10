import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/** Generate all 1-hour slots that fit within an availability block */
function generateSlots(startTime: string, endTime: string) {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const endMinutes = eh * 60 + em;
  const slots: { start: string; end: string }[] = [];
  let cur = sh * 60 + sm;

  while (cur + 60 <= endMinutes) {
    const s = `${String(Math.floor(cur / 60)).padStart(2, "0")}:${String(cur % 60).padStart(2, "0")}`;
    const e = `${String(Math.floor((cur + 60) / 60)).padStart(2, "0")}:${String((cur + 60) % 60).padStart(2, "0")}`;
    slots.push({ start: s, end: e });
    cur += 60;
  }
  return slots;
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date"); // "YYYY-MM-DD"
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const dateObj = new Date(`${date}T00:00:00`);
  const dow = dateObj.getDay(); // 0=Sun … 6=Sat

  // Trainer's availability blocks for this day of week
  const avails = await prisma.availability.findMany({
    where: { trainerId: params.id, dayOfWeek: dow },
    orderBy: { startTime: "asc" },
  });

  if (avails.length === 0) return NextResponse.json({ slots: [] });

  // Existing UPCOMING bookings for this trainer on this date
  const dayStart = new Date(`${date}T00:00:00`);
  const dayEnd = new Date(`${date}T23:59:59`);
  const booked = await prisma.bookingSession.findMany({
    where: {
      trainerId: params.id,
      status: "UPCOMING",
      startTime: { gte: dayStart, lte: dayEnd },
    },
    select: { startTime: true, endTime: true },
  });

  // Generate all possible slots across all availability blocks
  const allSlots = avails.flatMap((a) => generateSlots(a.startTime, a.endTime));

  // Filter: must be in the future (≥30 min) and must not overlap any existing booking
  const cutoff = new Date(Date.now() + 30 * 60 * 1000);
  const available = allSlots.filter(({ start, end }) => {
    const slotStart = new Date(`${date}T${start}:00`);
    const slotEnd = new Date(`${date}T${end}:00`);
    if (slotStart < cutoff) return false;
    return !booked.some((b) => slotStart < b.endTime && slotEnd > b.startTime);
  });

  return NextResponse.json({ slots: available });
}
