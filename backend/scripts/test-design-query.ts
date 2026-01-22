import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  // Get all documents for the project
  const project = await prisma.project.findFirst({
    orderBy: { createdAt: 'desc' }
  });

  console.log('Project:', project?.id, project?.name);

  // Get all documents
  const allDocs = await prisma.document.findMany({
    where: { projectId: project?.id },
    select: { id: true, title: true, documentType: true }
  });

  console.log('\nAll documents:', allDocs.length);
  allDocs.forEach(d => console.log(' -', d.documentType, ':', d.title));

  // Get DESIGN documents specifically
  const designDocs = await prisma.document.findMany({
    where: {
      projectId: project?.id,
      documentType: 'DESIGN'
    },
    select: { id: true, title: true, documentType: true, content: true }
  });

  console.log('\nDESIGN documents:', designDocs.length);
  designDocs.forEach(d => {
    console.log(' - ID:', d.id);
    console.log('   Title:', d.title);
    console.log('   Content length:', d.content?.length);
    console.log('   Has HTML:', d.content?.includes('```html'));
  });

  await prisma.$disconnect();
}

test().catch(console.error);
