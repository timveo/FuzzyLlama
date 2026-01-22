import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkContent() {
  const doc = await prisma.document.findFirst({
    where: { documentType: 'DESIGN' },
    select: { content: true }
  });

  const content = doc?.content || '';

  // Check for html blocks
  const htmlBlockMatches = content.match(/```html/gi);
  console.log('Number of ```html blocks:', htmlBlockMatches?.length || 0);

  // Check for Option/Design headers
  const optionHeaders = content.match(/#+\s*(?:Option|Design)\s*\d+/gi);
  console.log('Option/Design headers found:', optionHeaders);

  // Try to parse with the same regex as frontend
  const htmlBlockRegex = /(?:#+\s*(?:Option|Design)\s*(\d+)[^\n]*\n)?```html\s*\n([\s\S]*?)```/gi;
  let match;
  let count = 0;
  while ((match = htmlBlockRegex.exec(content)) !== null) {
    count++;
    console.log(`\nMatch ${count}:`);
    console.log('  Captured group 1 (number):', match[1]);
    console.log('  HTML content length:', match[2]?.length);
    console.log('  HTML preview:', match[2]?.substring(0, 100));
  }
  console.log('\nTotal matches with regex:', count);

  await prisma.$disconnect();
}

checkContent().catch(console.error);
