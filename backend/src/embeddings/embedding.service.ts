import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import OpenAI from 'openai';

/**
 * EmbeddingService - Semantic Code Search with pgvector
 *
 * Provides vector embeddings for semantic code search:
 * - Generate embeddings for code files
 * - Store in PostgreSQL with pgvector extension
 * - Search for similar code patterns
 * - Improve agent context with relevant code
 *
 * Uses OpenAI text-embedding-3-small model ($0.02 per 1M tokens)
 */
@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly openai: OpenAI;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');

    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY not configured - embedding features disabled');
    }

    this.openai = new OpenAI({
      apiKey: apiKey || 'dummy-key',
    });
  }

  /**
   * Generate embedding for text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small', // 1536 dimensions, $0.02 per 1M tokens
        input: text,
        encoding_format: 'float',
      });

      return response.data[0].embedding;
    } catch (error) {
      this.logger.error(`Failed to generate embedding: ${error.message}`);
      throw error;
    }
  }

  /**
   * Index a code file with embedding
   */
  async indexCodeFile(
    projectId: string,
    filePath: string,
    content: string,
    language?: string,
  ): Promise<void> {
    this.logger.log(`Indexing code file: ${filePath}`);

    try {
      // Generate embedding
      const embedding = await this.generateEmbedding(content);

      // Store in database with pgvector
      await this.prisma.$executeRaw`
        INSERT INTO "CodeEmbedding" (id, "projectId", "filePath", content, language, embedding, "createdAt", "updatedAt")
        VALUES (
          gen_random_uuid()::text,
          ${projectId},
          ${filePath},
          ${content},
          ${language},
          ${embedding}::vector,
          NOW(),
          NOW()
        )
        ON CONFLICT ("projectId", "filePath")
        DO UPDATE SET
          content = EXCLUDED.content,
          embedding = EXCLUDED.embedding,
          "updatedAt" = NOW()
      `;

      this.logger.log(`Indexed: ${filePath} (${content.length} chars)`);
    } catch (error) {
      this.logger.error(`Failed to index code file: ${filePath} - ${error.message}`);
      throw error;
    }
  }

  /**
   * Index multiple code files in batch
   */
  async indexCodeFiles(
    projectId: string,
    files: Array<{ filePath: string; content: string; language?: string }>,
  ): Promise<{ indexed: number; failed: number }> {
    this.logger.log(`Indexing ${files.length} code files for project ${projectId}`);

    let indexed = 0;
    let failed = 0;

    for (const file of files) {
      try {
        await this.indexCodeFile(projectId, file.filePath, file.content, file.language);
        indexed++;
      } catch (error) {
        this.logger.error(`Failed to index ${file.filePath}: ${error.message}`);
        failed++;
      }
    }

    this.logger.log(`Indexing complete: ${indexed} indexed, ${failed} failed`);

    return { indexed, failed };
  }

  /**
   * Search for similar code using semantic search
   */
  async searchSimilarCode(
    projectId: string,
    query: string,
    limit = 10,
  ): Promise<
    Array<{
      filePath: string;
      content: string;
      language: string | null;
      similarity: number;
    }>
  > {
    this.logger.log(`Searching for similar code: "${query.substring(0, 50)}..."`);

    try {
      // Generate embedding for query
      const queryEmbedding = await this.generateEmbedding(query);

      // Search using cosine similarity
      const results: any[] = await this.prisma.$queryRaw`
        SELECT
          "filePath",
          content,
          language,
          1 - (embedding <=> ${queryEmbedding}::vector) as similarity
        FROM "CodeEmbedding"
        WHERE "projectId" = ${projectId}
        ORDER BY embedding <=> ${queryEmbedding}::vector
        LIMIT ${limit}
      `;

      this.logger.log(`Found ${results.length} similar code snippets`);

      return results.map((r) => ({
        filePath: r.filePath,
        content: r.content,
        language: r.language,
        similarity: parseFloat(r.similarity),
      }));
    } catch (error) {
      this.logger.error(`Semantic search failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Search for code by natural language description
   */
  async searchByDescription(
    projectId: string,
    description: string,
    limit = 5,
  ): Promise<
    Array<{
      filePath: string;
      content: string;
      similarity: number;
    }>
  > {
    return this.searchSimilarCode(projectId, description, limit);
  }

  /**
   * Find files similar to a given file
   */
  async findSimilarFiles(
    projectId: string,
    targetFilePath: string,
    limit = 5,
  ): Promise<
    Array<{
      filePath: string;
      content: string;
      similarity: number;
    }>
  > {
    // Get the target file's content using raw query (CodeEmbedding is a raw SQL table)
    const targetFiles: any[] = await this.prisma.$queryRaw`
      SELECT content FROM "CodeEmbedding"
      WHERE "projectId" = ${projectId} AND "filePath" = ${targetFilePath}
      LIMIT 1
    `;

    if (targetFiles.length === 0) {
      throw new Error(`File not indexed: ${targetFilePath}`);
    }

    const targetFile = targetFiles[0];

    // Search using target file's content
    return this.searchSimilarCode(projectId, targetFile.content, limit + 1).then((results) =>
      // Exclude the target file itself
      results.filter((r) => r.filePath !== targetFilePath).slice(0, limit),
    );
  }

  /**
   * Get embedding statistics for a project
   */
  async getEmbeddingStats(projectId: string): Promise<{
    totalFiles: number;
    totalCharacters: number;
    languages: Record<string, number>;
  }> {
    // Use raw query since CodeEmbedding is not in Prisma schema
    const embeddings: any[] = await this.prisma.$queryRaw`
      SELECT content, language FROM "CodeEmbedding"
      WHERE "projectId" = ${projectId}
    `;

    const languages: Record<string, number> = {};
    let totalCharacters = 0;

    for (const embedding of embeddings) {
      totalCharacters += embedding.content?.length || 0;

      if (embedding.language) {
        languages[embedding.language] = (languages[embedding.language] || 0) + 1;
      }
    }

    return {
      totalFiles: embeddings.length,
      totalCharacters,
      languages,
    };
  }

  /**
   * Delete embeddings for a project
   */
  async deleteProjectEmbeddings(projectId: string): Promise<number> {
    // Use raw query since CodeEmbedding is not in Prisma schema
    const result = await this.prisma.$executeRaw`
      DELETE FROM "CodeEmbedding" WHERE "projectId" = ${projectId}
    `;

    this.logger.log(`Deleted ${result} embeddings for project ${projectId}`);

    return result;
  }

  /**
   * Delete embedding for a specific file
   */
  async deleteFileEmbedding(projectId: string, filePath: string): Promise<void> {
    // Use raw query since CodeEmbedding is not in Prisma schema
    await this.prisma.$executeRaw`
      DELETE FROM "CodeEmbedding"
      WHERE "projectId" = ${projectId} AND "filePath" = ${filePath}
    `;

    this.logger.log(`Deleted embedding for file: ${filePath}`);
  }

  /**
   * Re-index all files for a project
   */
  async reindexProject(projectId: string): Promise<{ indexed: number; failed: number }> {
    this.logger.log(`Re-indexing all files for project ${projectId}`);

    // Delete existing embeddings
    await this.deleteProjectEmbeddings(projectId);

    // Get all files from filesystem (would need FileSystemService integration)
    // For now, return placeholder
    return { indexed: 0, failed: 0 };
  }

  /**
   * Get agent context with relevant code examples
   * Use this to provide better context to AI agents
   */
  async getAgentContext(projectId: string, agentTask: string, maxFiles = 5): Promise<string> {
    const similarCode = await this.searchByDescription(projectId, agentTask, maxFiles);

    if (similarCode.length === 0) {
      return 'No relevant code examples found.';
    }

    let context = '# Relevant Code Examples\n\n';
    context += 'Here are similar implementations in this codebase:\n\n';

    for (const code of similarCode) {
      context += `## ${code.filePath} (Similarity: ${(code.similarity * 100).toFixed(1)}%)\n\n`;
      context += '```\n';
      context += code.content;
      context += '\n```\n\n';
    }

    return context;
  }
}
