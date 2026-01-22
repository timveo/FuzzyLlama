import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkContent() {
  const doc = await prisma.document.findFirst({
    where: { documentType: 'DESIGN' },
    select: { content: true }
  });

  const content = doc?.content || '';

  console.log('Total content length:', content.length);
  console.log('\n--- Last 2000 characters ---');
  console.log(content.substring(content.length - 2000));

  await prisma.$disconnect();
}

checkContent().catch(console.error);
