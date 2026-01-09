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
      email: 'test@layercake.dev',
      passwordHash: '$2b$10$XjW8.8E5KXrr7T9B9v5dkOq1V1Z9B4Vj4c3X2Q1R0S9W8X7Y6Z5', // "password123"
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
