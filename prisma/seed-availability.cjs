const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const sarah = await p.user.findFirst({ where: { email: 'sarah.trainer@fitbook.dev' } });
  if (!sarah) { console.log('Sarah not found'); return; }

  await p.availability.deleteMany({ where: { trainerId: sarah.id } });

  await p.availability.createMany({
    data: [
      // Monday: 7am-12pm, 2pm-7pm
      { trainerId: sarah.id, dayOfWeek: 1, startTime: '07:00', endTime: '12:00' },
      { trainerId: sarah.id, dayOfWeek: 1, startTime: '14:00', endTime: '19:00' },
      // Wednesday: 7am-12pm, 2pm-7pm
      { trainerId: sarah.id, dayOfWeek: 3, startTime: '07:00', endTime: '12:00' },
      { trainerId: sarah.id, dayOfWeek: 3, startTime: '14:00', endTime: '19:00' },
      // Friday: 7am-12pm, 2pm-7pm
      { trainerId: sarah.id, dayOfWeek: 5, startTime: '07:00', endTime: '12:00' },
      { trainerId: sarah.id, dayOfWeek: 5, startTime: '14:00', endTime: '19:00' },
      // Saturday: 9am-1pm
      { trainerId: sarah.id, dayOfWeek: 6, startTime: '09:00', endTime: '13:00' },
    ],
  });
  console.log('✅ Availability seeded for Sarah Johnson (Mon/Wed/Fri + Sat)');
}

main().catch(console.error).finally(() => p.$disconnect());
