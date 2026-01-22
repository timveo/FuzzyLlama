import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkContent() {
  const doc = await prisma.document.findFirst({
    where: { documentType: 'DESIGN' },
    select: { content: true }
  });

  const content = doc?.content || '';

  // Find all ```html blocks independently
  const htmlBlockRegex = /```html\s*\n([\s\S]*?)```/gi;
  let match;
  let count = 0;
  while ((match = htmlBlockRegex.exec(content)) !== null) {
    count++;
    console.log(`\nHTML Block ${count}:`);
    console.log('  Content length:', match[1]?.length);
    console.log('  Preview:', match[1]?.substring(0, 150));

    // Look backwards for an Option header
    const beforeBlock = content.substring(Math.max(0, match.index - 500), match.index);
    const optionMatch = beforeBlock.match(/#+\s*(?:Option|Design)\s*(\d+)[^\n]*/i);
    console.log('  Preceding Option header:', optionMatch?.[0] || 'none');
  }
  console.log('\nTotal HTML blocks:', count);

  await prisma.$disconnect();
}

checkContent().catch(console.error);
