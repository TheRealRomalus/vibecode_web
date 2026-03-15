const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  await p.exerciseLog.deleteMany({});
  await p.planExercise.deleteMany({});
  await p.workoutPlan.deleteMany({});
  await p.trainerClient.deleteMany({});
  await p.bookingSession.deleteMany({});
  await p.availability.deleteMany({});
  await p.session.deleteMany({});
  await p.account.deleteMany({});
  await p.verificationToken.deleteMany({});
  await p.user.deleteMany({});
  console.log('✅ Database cleared');
}

main().catch(console.error).finally(() => p.$disconnect());
