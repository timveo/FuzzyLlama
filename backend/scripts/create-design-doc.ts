import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createDesignDoc() {
  const project = await prisma.project.findFirst({
    orderBy: { createdAt: 'desc' }
  });

  const uxAgent = await prisma.agent.findFirst({
    where: {
      projectId: project?.id,
      agentType: 'UX_UI_DESIGNER'
    },
    select: { id: true, outputResult: true }
  });

  if (!project || !uxAgent) {
    console.log('Project or agent not found');
    return;
  }

  // Check if DESIGN doc already exists
  const existing = await prisma.document.findFirst({
    where: {
      projectId: project.id,
      documentType: 'DESIGN'
    }
  });

  if (existing) {
    console.log('DESIGN document already exists:', existing.id);
    return;
  }

  // Create the DESIGN document
  const doc = await prisma.document.create({
    data: {
      projectId: project.id,
      agentId: uxAgent.id,
      documentType: 'DESIGN',
      title: 'UX/UI Design System',
      content: uxAgent.outputResult || '',
      version: 1,
      createdById: project.ownerId
    }
  });

  console.log('Created DESIGN document:', doc.id);
  console.log('Title:', doc.title);
  console.log('Content length:', doc.content.length);

  await prisma.$disconnect();
}

createDesignDoc().catch(console.error);
