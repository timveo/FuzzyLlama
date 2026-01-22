/**
 * Cleanup script to remove duplicate documents before applying unique constraint
 *
 * Run with: npx ts-node scripts/cleanup-duplicate-documents.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupDuplicateDocuments() {
  console.log('🔍 Finding duplicate documents...\n');

  // Find all documents grouped by projectId + documentType + title
  const allDocs = await prisma.document.findMany({
    orderBy: [
      { projectId: 'asc' },
      { documentType: 'asc' },
      { title: 'asc' },
      { updatedAt: 'desc' }, // Keep the most recently updated
    ],
  });

  // Group documents by unique key
  const grouped = new Map<string, typeof allDocs>();

  for (const doc of allDocs) {
    const key = `${doc.projectId}|${doc.documentType}|${doc.title}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(doc);
  }

  // Find duplicates and delete older versions
  let totalDeleted = 0;
  const toDelete: string[] = [];

  for (const [key, docs] of grouped) {
    if (docs.length > 1) {
      console.log(`📄 Found ${docs.length} duplicates for: ${key}`);

      // Keep the first one (most recently updated due to sorting)
      const [keep, ...duplicates] = docs;
      console.log(`   Keeping: id=${keep.id}, version=${keep.version}, updated=${keep.updatedAt}`);

      for (const dup of duplicates) {
        console.log(`   Deleting: id=${dup.id}, version=${dup.version}, updated=${dup.updatedAt}`);
        toDelete.push(dup.id);
      }
    }
  }

  if (toDelete.length === 0) {
    console.log('\n✅ No duplicates found! Database is clean.');
    return;
  }

  console.log(`\n🗑️  Deleting ${toDelete.length} duplicate documents...`);

  // Delete duplicates
  const result = await prisma.document.deleteMany({
    where: {
      id: { in: toDelete },
    },
  });

  totalDeleted = result.count;
  console.log(`\n✅ Successfully deleted ${totalDeleted} duplicate documents.`);

  // Also clean up any USER_STORY documents (they should be part of PRD)
  console.log('\n🔍 Checking for separate USER_STORY documents...');

  const userStoryDocs = await prisma.document.findMany({
    where: {
      documentType: 'USER_STORY',
    },
  });

  if (userStoryDocs.length > 0) {
    console.log(`📄 Found ${userStoryDocs.length} USER_STORY documents to remove.`);

    const userStoryResult = await prisma.document.deleteMany({
      where: {
        documentType: 'USER_STORY',
      },
    });

    console.log(`✅ Deleted ${userStoryResult.count} USER_STORY documents.`);
  } else {
    console.log('✅ No separate USER_STORY documents found.');
  }

  console.log('\n🎉 Cleanup complete! You can now run: npx prisma db push');
}

cleanupDuplicateDocuments()
  .catch((error) => {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
