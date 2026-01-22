import { PrismaClient } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';
import { uxUiDesignerTemplate } from '../src/agents/templates/ux-ui-designer.template';

const prisma = new PrismaClient();
const anthropic = new Anthropic();

async function rerunUxDesigner() {
  // Get project info
  const project = await prisma.project.findFirst({
    orderBy: { createdAt: 'desc' },
    include: { state: true }
  });

  if (!project) {
    console.log('No project found');
    return;
  }

  console.log('Project:', project.name);
  console.log('Project ID:', project.id);

  // Get PRD and Architecture documents for context
  const prd = await prisma.document.findFirst({
    where: { projectId: project.id, documentType: 'REQUIREMENTS' }
  });

  const arch = await prisma.document.findFirst({
    where: { projectId: project.id, documentType: 'ARCHITECTURE' }
  });

  console.log('PRD found:', !!prd);
  console.log('Architecture found:', !!arch);

  // Build context
  const context = `
## Project: ${project.name}

## Product Requirements Document
${prd?.content || 'No PRD available'}

## System Architecture
${arch?.content || 'No architecture available'}
`;

  const userPrompt = `Create 3 distinct, viewable HTML design options for ${project.name}.

Each design MUST be a complete, self-contained HTML document with embedded CSS and any necessary JavaScript.
Each design should be wrapped in \`\`\`html code blocks.

Requirements:
1. Option 1: Conservative - Clean, professional, familiar patterns
2. Option 2: Modern - Contemporary design trends, fresh approach
3. Option 3: Bold - Unique, differentiated, memorable

Make sure each HTML document is COMPLETE with proper closing tags.`;

  console.log('\nStarting UX/UI Designer agent...');
  console.log('Max tokens:', 32000);

  try {
    let output = '';

    const stream = await anthropic.messages.stream({
      model: uxUiDesignerTemplate.defaultModel,
      max_tokens: 32000,
      system: uxUiDesignerTemplate.systemPrompt,
      messages: [
        {
          role: 'user',
          content: context + '\n\n' + userPrompt
        }
      ]
    });

    process.stdout.write('Generating');
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        output += event.delta.text;
        process.stdout.write('.');
      }
    }
    console.log(' Done!');
    console.log('\nAgent completed!');
    console.log('Output length:', output.length);

    // Count HTML blocks
    const htmlBlocks = output.match(/```html[\s\S]*?```/g);
    console.log('HTML blocks found:', htmlBlocks?.length || 0);

    // Update the existing DESIGN document
    const existingDoc = await prisma.document.findFirst({
      where: { projectId: project.id, documentType: 'DESIGN' }
    });

    if (existingDoc) {
      await prisma.document.update({
        where: { id: existingDoc.id },
        data: {
          content: output,
          version: existingDoc.version + 1,
          updatedAt: new Date()
        }
      });
      console.log('\nUpdated existing DESIGN document:', existingDoc.id);
    } else {
      const newDoc = await prisma.document.create({
        data: {
          projectId: project.id,
          documentType: 'DESIGN',
          title: 'UX/UI Design System',
          content: output,
          version: 1,
          createdById: project.ownerId
        }
      });
      console.log('\nCreated new DESIGN document:', newDoc.id);
    }

    console.log('\nDone! Refresh the Preview tab to see all designs.');

  } catch (error) {
    console.error('Error running agent:', error);
  }

  await prisma.$disconnect();
}

rerunUxDesigner().catch(console.error);
