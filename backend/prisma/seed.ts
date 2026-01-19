import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data (development only)
  if (process.env.NODE_ENV === 'development') {
    console.log('⚠️  Clearing existing data...');
    await prisma.usageMetric.deleteMany();
    await prisma.user.deleteMany();
    await prisma.organization.deleteMany();
    await prisma.project.deleteMany();
  }

  // Create test user
  console.log('👤 Creating test user...');
  const testUser = await prisma.user.create({
    data: {
      email: 'test@fuzzyllama.dev',
      passwordHash: '$2b$10$WgWceNSHcHFRlLFMG9GeQOdj6WhwOcvtrTenrB5uuUXPgG50r3JxO', // "password123"
      name: 'Test User',
      emailVerified: true,
      planTier: 'FREE',
      monthlyAgentExecutions: 0,
    },
  });

  console.log(`✅ Created user: ${testUser.email}`);

  // Note: Agent templates and gate definitions will be loaded from the agent markdown files
  // and constants directory at runtime, not seeded into the database

  console.log('✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
