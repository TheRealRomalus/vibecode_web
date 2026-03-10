import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

async function main() {
  const roham = await p.user.findFirst({ where: { email: "rohamshahbazi5@gmail.com" } });
  if (!roham) throw new Error("No user found");

  // Create a fake trainer
  const trainer = await p.user.upsert({
    where: { email: "sarah.trainer@fitbook.dev" },
    update: {},
    create: {
      name: "Sarah Johnson",
      email: "sarah.trainer@fitbook.dev",
      role: "TRAINER",
      onboardingComplete: true,
      image: "https://i.pravatar.cc/150?u=sarah",
    },
  });

  // Create a fake client (for Roham to train, visible on trainer dashboard)
  const client = await p.user.upsert({
    where: { email: "alex.client@fitbook.dev" },
    update: {},
    create: {
      name: "Alex Chen",
      email: "alex.client@fitbook.dev",
      role: "CLIENT",
      onboardingComplete: true,
      image: "https://i.pravatar.cc/150?u=alex",
    },
  });

  const now = new Date();
  const d = (offsetDays, h = 10) => {
    const t = new Date(now);
    t.setDate(t.getDate() + offsetDays);
    t.setHours(h, 0, 0, 0);
    return t;
  };
  const e = (offsetDays, h = 11) => {
    const t = new Date(now);
    t.setDate(t.getDate() + offsetDays);
    t.setHours(h, 0, 0, 0);
    return t;
  };

  // ── Sessions where Roham is the CLIENT (for /dashboard) ─────────────────
  await p.bookingSession.createMany({
    data: [
      // Upcoming
      {
        trainerId: trainer.id,
        clientId: roham.id,
        startTime: d(1, 9), endTime: e(1, 10),
        workoutType: "STRENGTH",
        status: "UPCOMING",
        notes: "Focus on upper body push movements",
        trainerNotes: "Great progress last week — we'll increase bench to 80kg today. Make sure to warm up shoulders well.",
      },
      {
        trainerId: trainer.id,
        clientId: roham.id,
        startTime: d(3, 11), endTime: e(3, 12),
        workoutType: "HIIT",
        status: "UPCOMING",
        notes: null,
        trainerNotes: null,
      },
      {
        trainerId: trainer.id,
        clientId: roham.id,
        startTime: d(7, 8), endTime: e(7, 9),
        workoutType: "MOBILITY",
        status: "UPCOMING",
        notes: "Please bring a foam roller",
        trainerNotes: "We'll work on hip flexors and thoracic spine rotation. Wear comfortable clothes.",
      },
      // Past
      {
        trainerId: trainer.id,
        clientId: roham.id,
        startTime: d(-3, 10), endTime: e(-3, 11),
        workoutType: "CARDIO",
        status: "COMPLETED",
        notes: null,
        trainerNotes: "Solid session — hit all targets. Keep up the morning runs.",
      },
      {
        trainerId: trainer.id,
        clientId: roham.id,
        startTime: d(-7, 9), endTime: e(-7, 10),
        workoutType: "STRENGTH",
        status: "COMPLETED",
        notes: null,
        trainerNotes: null,
      },
      {
        trainerId: trainer.id,
        clientId: roham.id,
        startTime: d(-10, 14), endTime: e(-10, 15),
        workoutType: "STRENGTH",
        status: "CANCELLED",
        notes: null,
        trainerNotes: "Session cancelled due to scheduling conflict — rebooked for next week.",
      },
    ],
  });

  // ── Sessions where Roham is the TRAINER (for /trainer) ──────────────────
  await p.bookingSession.createMany({
    data: [
      {
        trainerId: roham.id,
        clientId: client.id,
        startTime: d(2, 10), endTime: e(2, 11),
        workoutType: "STRENGTH",
        status: "UPCOMING",
        notes: "Client wants to focus on legs",
        trainerNotes: "Plan: squat 5x5, leg press, Romanian deadlift. Increase load from last session.",
      },
      {
        trainerId: roham.id,
        clientId: client.id,
        startTime: d(5, 16), endTime: e(5, 17),
        workoutType: "CARDIO",
        status: "UPCOMING",
        notes: null,
        trainerNotes: null,
      },
      {
        trainerId: roham.id,
        clientId: client.id,
        startTime: d(-2, 10), endTime: e(-2, 11),
        workoutType: "HIIT",
        status: "COMPLETED",
        notes: null,
        trainerNotes: "Crushed it today — Alex is improving fast. Suggested adding a 5am run twice a week.",
      },
      {
        trainerId: roham.id,
        clientId: client.id,
        startTime: d(-5, 9), endTime: e(-5, 10),
        workoutType: "MOBILITY",
        status: "COMPLETED",
        notes: "Left knee still sore",
        trainerNotes: "Avoided high-impact. Focused on hip mobility. Recommend physio check-up.",
      },
    ],
  });

  // Switch Roham to CLIENT so he can see client dashboard
  await p.user.update({
    where: { id: roham.id },
    data: { role: "CLIENT" },
  });

  console.log("✅ Seeded successfully");
  console.log("  → Roham is now CLIENT — go to /dashboard to see client view");
  console.log("  → To switch back to trainer: run the switch-to-trainer script");
}

main().catch(console.error).finally(() => p.$disconnect());
