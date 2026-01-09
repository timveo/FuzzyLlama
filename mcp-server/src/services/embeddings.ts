/**
 * Embeddings Service
 *
 * Provides local embedding generation for semantic search.
 * Uses @xenova/transformers for in-process embeddings (no external API calls).
 *
 * Model: all-MiniLM-L6-v2 (~80MB, 384 dimensions)
 * - Optimized for semantic similarity
 * - Runs entirely in Node.js
 * - Lazy-loaded on first use to avoid startup delay
 *
 * OPTIONAL: This service is optional. If @xenova/transformers is not installed,
 * semantic search will gracefully fall back to keyword matching.
 *
 * Usage:
 *   const embedding = await getEmbedding("search query");
 *   const similarity = cosineSimilarity(embedding1, embedding2);
 */

// Note: @xenova/transformers is an optional dependency
// If not installed, embeddings will be disabled and semantic search
// will fall back to keyword matching

// Use any type to avoid TypeScript errors when module isn't installed
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let transformers: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let embedder: any = null;
let initPromise: Promise<void> | null = null;
let initError: Error | null = null;
let embeddingsChecked = false;
let embeddingsAvailable = false;

/**
 * Check if embeddings are available (without trying to initialize)
 * Call this before attempting to use embeddings to avoid throwing
 */
export function isEmbeddingsAvailable(): boolean {
  if (!embeddingsChecked) {
    // Do a quick check to see if the module is installed
    try {
      require.resolve('@xenova/transformers');
      embeddingsAvailable = true;
    } catch {
      embeddingsAvailable = false;
    }
    embeddingsChecked = true;
  }
  return embeddingsAvailable && initError === null;
}

/**
 * Lazy initialization of the embedding model
 * Only loads on first use to avoid startup delay
 */
async function initEmbedder(): Promise<void> {
  if (initError) {
    throw initError;
  }

  if (embedder) {
    return;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      // Dynamic import to allow graceful degradation if not installed
      // Use string variable to bypass TypeScript module resolution
      const moduleName = '@xenova/transformers';
      transformers = await import(/* webpackIgnore: true */ moduleName);

      // Create feature extraction pipeline
      // Uses 'all-MiniLM-L6-v2' for good quality/speed tradeoff
      embedder = await transformers.pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2',
        {
          // Use quantized model for smaller size and faster inference
          quantized: true,
        }
      );

      embeddingsAvailable = true;
      console.error('Embeddings service initialized with all-MiniLM-L6-v2');
    } catch (error) {
      initError = error instanceof Error ? error : new Error(String(error));
      embeddingsAvailable = false;
      console.error('Embeddings service unavailable:', initError.message);
      console.error('Install @xenova/transformers for semantic search: npm install @xenova/transformers');
      throw initError;
    }
  })();

  return initPromise;
}

/**
 * Generate embedding for a text string
 *
 * @param text - Text to embed
 * @returns Float32Array of 384 dimensions
 * @throws Error if embeddings not available
 */
export async function getEmbedding(text: string): Promise<Float32Array> {
  await initEmbedder();

  if (!embedder) {
    throw new Error('Embedder not initialized');
  }

  // Truncate long text (model max is 512 tokens, ~400 words safe limit)
  const truncated = text.slice(0, 2000);

  // Run inference
  const output = await embedder(truncated, {
    pooling: 'mean',      // Mean pooling for sentence embedding
    normalize: true,      // L2 normalize for cosine similarity
  });

  // Extract the embedding array
  return new Float32Array(output.data);
}

/**
 * Generate embeddings for multiple texts in batch
 * More efficient than calling getEmbedding() multiple times
 *
 * @param texts - Array of texts to embed
 * @returns Array of Float32Array embeddings
 */
export async function getEmbeddings(texts: string[]): Promise<Float32Array[]> {
  await initEmbedder();

  if (!embedder) {
    throw new Error('Embedder not initialized');
  }

  const results: Float32Array[] = [];

  // Process in batches of 8 for memory efficiency
  const batchSize = 8;
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const embeddings = await Promise.all(
      batch.map((text) => getEmbedding(text))
    );
    results.push(...embeddings);
  }

  return results;
}

/**
 * Calculate cosine similarity between two embeddings
 * Both vectors should be normalized (which getEmbedding does)
 *
 * @param a - First embedding
 * @param b - Second embedding
 * @returns Similarity score between -1 and 1 (1 = identical)
 */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error(`Embedding dimension mismatch: ${a.length} vs ${b.length}`);
  }

  // For normalized vectors, cosine similarity = dot product
  let dot = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
  }

  return dot;
}

/**
 * Find most similar items from a set of embeddings
 *
 * @param query - Query embedding
 * @param candidates - Array of candidate embeddings
 * @param topK - Number of results to return
 * @returns Array of { index, similarity } sorted by similarity desc
 */
export function findMostSimilar(
  query: Float32Array,
  candidates: Float32Array[],
  topK: number = 5
): { index: number; similarity: number }[] {
  const similarities = candidates.map((candidate, index) => ({
    index,
    similarity: cosineSimilarity(query, candidate),
  }));

  // Sort by similarity descending
  similarities.sort((a, b) => b.similarity - a.similarity);

  return similarities.slice(0, topK);
}

/**
 * Convert embedding to Buffer for SQLite storage
 */
export function embeddingToBuffer(embedding: Float32Array): Buffer {
  return Buffer.from(embedding.buffer);
}

/**
 * Convert Buffer from SQLite back to Float32Array
 */
export function bufferToEmbedding(buffer: Buffer): Float32Array {
  return new Float32Array(buffer.buffer, buffer.byteOffset, buffer.length / 4);
}

/**
 * Combine multiple texts into a single embedding
 * Useful for multi-field search
 *
 * @param texts - Array of text fields to combine
 * @param weights - Optional weights for each field (default equal)
 * @returns Combined embedding
 */
export async function getCombinedEmbedding(
  texts: string[],
  weights?: number[]
): Promise<Float32Array> {
  if (texts.length === 0) {
    throw new Error('No texts provided');
  }

  const effectiveWeights = weights || texts.map(() => 1 / texts.length);

  if (effectiveWeights.length !== texts.length) {
    throw new Error('Weights length must match texts length');
  }

  // Normalize weights
  const weightSum = effectiveWeights.reduce((a, b) => a + b, 0);
  const normalizedWeights = effectiveWeights.map((w) => w / weightSum);

  // Get embeddings
  const embeddings = await getEmbeddings(texts);

  // Weighted average
  const combined = new Float32Array(embeddings[0].length);
  for (let i = 0; i < embeddings.length; i++) {
    const weight = normalizedWeights[i];
    for (let j = 0; j < combined.length; j++) {
      combined[j] += embeddings[i][j] * weight;
    }
  }

  // L2 normalize the result
  let norm = 0;
  for (let i = 0; i < combined.length; i++) {
    norm += combined[i] * combined[i];
  }
  norm = Math.sqrt(norm);

  if (norm > 0) {
    for (let i = 0; i < combined.length; i++) {
      combined[i] /= norm;
    }
  }

  return combined;
}
