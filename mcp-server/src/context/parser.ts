/**
 * Document Parsers for Dynamic Context Loading
 *
 * Extracts structured data from PRD.md, OpenAPI specs, and Prisma schemas.
 * Uses simple regex parsing (no external dependencies).
 */

import type {
  ParsedUserStory,
  ParsedApiEndpoint,
  ParsedDbModel,
  ParsedZodSchema,
  Priority,
} from '../types/context.js';

// ============================================================================
// PRD Parser - Extract User Stories
// ============================================================================

/**
 * Extract user stories from PRD.md content
 *
 * Expected format:
 * ```markdown
 * ### Epic 1: [Epic Name]
 *
 * #### User Story 1.1
 * **As a** [user type]
 * **I want to** [action]
 * **So that** [benefit]
 *
 * **Acceptance Criteria:**
 * - [ ] [Criterion 1]
 * - [ ] [Criterion 2]
 *
 * **Priority:** High / Medium / Low
 * ```
 */
export function extractUserStories(prdContent: string): ParsedUserStory[] {
  const stories: ParsedUserStory[] = [];
  const lines = prdContent.split('\n');

  let currentEpic = 'Uncategorized';
  let storyStart = -1;
  let storyBuffer: string[] = [];
  let storyCounter = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect epic headers: "### Epic 1: Authentication" or "## Epic: User Management"
    const epicMatch = line.match(/^#{2,3}\s+Epic\s*\d*:?\s*(.+)/i);
    if (epicMatch) {
      currentEpic = epicMatch[1].trim();
      continue;
    }

    // Detect user story headers: "#### User Story 1.1" or "#### US-001"
    const storyHeaderMatch = line.match(
      /^#{3,4}\s+(User Story\s+[\d.]+|US-\d+)\s*:?\s*(.*)/i
    );
    if (storyHeaderMatch) {
      // If we have a previous story buffer, parse it
      if (storyBuffer.length > 0 && storyStart >= 0) {
        const parsed = parseStoryBuffer(
          storyBuffer,
          currentEpic,
          storyStart,
          i - 1,
          storyCounter
        );
        if (parsed) {
          stories.push(parsed);
          storyCounter++;
        }
      }

      storyBuffer = [line];
      storyStart = i;
      continue;
    }

    // Detect next section (end of stories)
    if (
      line.match(/^#{1,3}\s+\d*\.?\s*(Functional|Non-Functional|Technical)/i)
    ) {
      // Parse any remaining story
      if (storyBuffer.length > 0 && storyStart >= 0) {
        const parsed = parseStoryBuffer(
          storyBuffer,
          currentEpic,
          storyStart,
          i - 1,
          storyCounter
        );
        if (parsed) {
          stories.push(parsed);
        }
      }
      break;
    }

    // Accumulate lines into current story buffer
    if (storyStart >= 0) {
      storyBuffer.push(line);
    }
  }

  // Handle last story if file doesn't have a "Functional Requirements" section
  if (storyBuffer.length > 0 && storyStart >= 0) {
    const parsed = parseStoryBuffer(
      storyBuffer,
      currentEpic,
      storyStart,
      lines.length - 1,
      storyCounter
    );
    if (parsed) {
      stories.push(parsed);
    }
  }

  return stories;
}

function parseStoryBuffer(
  buffer: string[],
  epic: string,
  lineStart: number,
  lineEnd: number,
  counter: number
): ParsedUserStory | null {
  const content = buffer.join('\n');

  // Extract story ID from header or generate one
  const headerMatch = buffer[0].match(
    /#{3,4}\s+(User Story\s+([\d.]+)|US-(\d+))\s*:?\s*(.*)/i
  );
  let id: string;
  let title: string;

  if (headerMatch) {
    if (headerMatch[3]) {
      id = `US-${headerMatch[3].padStart(3, '0')}`;
    } else if (headerMatch[2]) {
      const num = headerMatch[2].replace('.', '');
      id = `US-${num.padStart(3, '0')}`;
    } else {
      id = `US-${String(counter + 1).padStart(3, '0')}`;
    }
    title = headerMatch[4]?.trim() || '';
  } else {
    id = `US-${String(counter + 1).padStart(3, '0')}`;
    title = '';
  }

  // Extract "As a ... I want ... So that ..."
  const asAMatch = content.match(/\*\*As a\*\*\s*(.+?)(?=\n|\*\*I want)/is);
  const iWantMatch = content.match(
    /\*\*I want to?\*\*\s*(.+?)(?=\n|\*\*So that)/is
  );
  const soThatMatch = content.match(/\*\*So that\*\*\s*(.+?)(?=\n\n|\n\*\*)/is);

  const as_a = asAMatch ? asAMatch[1].trim() : '';
  const i_want = iWantMatch ? iWantMatch[1].trim() : '';
  const so_that = soThatMatch ? soThatMatch[1].trim() : '';

  // Build title from story content if not in header
  if (!title && as_a && i_want) {
    title = i_want.slice(0, 60) + (i_want.length > 60 ? '...' : '');
  }

  // Extract acceptance criteria
  const acceptance_criteria: string[] = [];
  const criteriaSection = content.match(
    /\*\*Acceptance Criteria:?\*\*\s*([\s\S]*?)(?=\n\n\*\*|\n---|\n#{2,4}|$)/i
  );
  if (criteriaSection) {
    const criteriaLines = criteriaSection[1].split('\n');
    for (const line of criteriaLines) {
      // Match "- [ ] criteria" or "- criteria" or "* criteria"
      const criteriaMatch = line.match(/^[-*]\s*\[?\s*[xX\s]?\]?\s*(.+)/);
      if (criteriaMatch && criteriaMatch[1].trim()) {
        acceptance_criteria.push(criteriaMatch[1].trim());
      }
    }
  }

  // Extract priority
  let priority: Priority | undefined;
  const priorityMatch = content.match(
    /\*\*Priority:?\*\*\s*(P0|P1|P2|P3|High|Medium|Low|Critical)/i
  );
  if (priorityMatch) {
    const p = priorityMatch[1].toLowerCase();
    if (p === 'critical' || p === 'p0') priority = 'P0';
    else if (p === 'high' || p === 'p1') priority = 'P1';
    else if (p === 'medium' || p === 'p2') priority = 'P2';
    else if (p === 'low' || p === 'p3') priority = 'P3';
  }

  // Only return if we have meaningful content
  if (!as_a && !i_want && acceptance_criteria.length === 0) {
    return null;
  }

  return {
    id,
    title,
    as_a,
    i_want,
    so_that,
    acceptance_criteria,
    epic,
    priority,
    line_start: lineStart + 1, // Convert to 1-indexed
    line_end: lineEnd + 1,
  };
}

// ============================================================================
// OpenAPI Parser - Extract API Endpoints
// ============================================================================

/**
 * Extract API endpoints from OpenAPI YAML content
 * Handles both OpenAPI 3.x format
 */
export function extractOpenApiEndpoints(yamlContent: string): ParsedApiEndpoint[] {
  const endpoints: ParsedApiEndpoint[] = [];
  const lines = yamlContent.split('\n');

  // Find paths section
  let inPaths = false;
  let currentPath = '';
  let currentMethod = '';
  let pathIndent = 0;
  let methodIndent = 0;
  let methodBody: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const currentIndent = line.search(/\S/);

    // Detect paths: section
    if (trimmed === 'paths:') {
      inPaths = true;
      pathIndent = currentIndent;
      continue;
    }

    // Exit paths section when we hit components: or another top-level key
    if (inPaths && currentIndent <= pathIndent && trimmed && trimmed !== 'paths:') {
      if (trimmed.match(/^\w+:/)) {
        // Save any pending method
        if (currentMethod && methodBody.length > 0) {
          const endpoint = parseMethodBody(currentPath, currentMethod, methodBody.join('\n'));
          if (endpoint) endpoints.push(endpoint);
        }
        break;
      }
    }

    if (!inPaths) continue;

    // Detect path definition (e.g., "  /auth/register:")
    const pathMatch = trimmed.match(/^(['"]?)(\/[^'":\s]+)\1:\s*$/);
    if (pathMatch && currentIndent > pathIndent) {
      // Save previous method if exists
      if (currentMethod && methodBody.length > 0) {
        const endpoint = parseMethodBody(currentPath, currentMethod, methodBody.join('\n'));
        if (endpoint) endpoints.push(endpoint);
      }
      currentPath = pathMatch[2];
      currentMethod = '';
      methodBody = [];
      methodIndent = currentIndent + 2; // Methods are indented under path
      continue;
    }

    // Detect HTTP method (e.g., "    get:", "    post:")
    const methodMatch = trimmed.match(/^(get|post|put|patch|delete|head|options):\s*$/i);
    if (methodMatch && currentPath) {
      // Save previous method if exists
      if (currentMethod && methodBody.length > 0) {
        const endpoint = parseMethodBody(currentPath, currentMethod, methodBody.join('\n'));
        if (endpoint) endpoints.push(endpoint);
      }
      currentMethod = methodMatch[1].toUpperCase();
      methodBody = [];
      continue;
    }

    // Accumulate method body lines
    if (currentMethod && currentPath) {
      methodBody.push(line);
    }
  }

  // Don't forget the last method
  if (currentMethod && methodBody.length > 0) {
    const endpoint = parseMethodBody(currentPath, currentMethod, methodBody.join('\n'));
    if (endpoint) endpoints.push(endpoint);
  }

  return endpoints;
}

function parseMethodBody(path: string, method: string, body: string): ParsedApiEndpoint | null {
  // Extract operationId
  const operationIdMatch = body.match(/operationId:\s*['"]?(\w+)['"]?/);
  const operationId = operationIdMatch ? operationIdMatch[1] : `${method.toLowerCase()}_${path.replace(/\//g, '_').replace(/[{}]/g, '')}`;

  // Extract summary
  const summaryMatch = body.match(/summary:\s*['"]?([^'"\n]+)['"]?/);
  const summary = summaryMatch ? summaryMatch[1].trim() : undefined;

  // Extract description
  const descriptionMatch = body.match(/description:\s*['"]?([^'"\n]+)['"]?/);
  const description = descriptionMatch ? descriptionMatch[1].trim() : undefined;

  // Extract tags
  const tags: string[] = [];
  const tagsMatch = body.match(/tags:\s*\n((?:\s+-\s*.+\n?)+)/);
  if (tagsMatch) {
    const tagLines = tagsMatch[1].split('\n');
    for (const line of tagLines) {
      const tagMatch = line.match(/^\s*-\s*['"]?([^'"]+)['"]?/);
      if (tagMatch) tags.push(tagMatch[1].trim());
    }
  }

  // Extract request schema reference
  let requestSchema: string | undefined;
  const requestBodyMatch = body.match(/requestBody:[\s\S]*?\$ref:\s*['"]?#\/components\/schemas\/(\w+)['"]?/);
  if (requestBodyMatch) {
    requestSchema = requestBodyMatch[1];
  }

  // Extract response schema reference (from 200 or 201 response)
  let responseSchema: string | undefined;
  const responseMatch = body.match(/'?(200|201)'?:[\s\S]*?\$ref:\s*['"]?#\/components\/schemas\/(\w+)['"]?/);
  if (responseMatch) {
    responseSchema = responseMatch[2];
  }

  // Extract parameters
  const parameters: string[] = [];
  const paramsMatch = body.match(/parameters:\s*\n((?:\s+-[\s\S]*?(?=\s+-\s*name:|\n\s{4}\w+:|\n\s{2}\/|$))+)/);
  if (paramsMatch) {
    const paramMatches = paramsMatch[1].matchAll(/name:\s*['"]?(\w+)['"]?/g);
    for (const pm of paramMatches) {
      parameters.push(pm[1]);
    }
  }

  return {
    path,
    method,
    operationId,
    summary,
    description,
    tags,
    requestSchema,
    responseSchema,
    parameters,
  };
}

/**
 * Extract a specific endpoint's YAML snippet from OpenAPI content
 */
export function extractOpenApiSnippet(yamlContent: string, path: string, method?: string): string {
  const lines = yamlContent.split('\n');
  let inPaths = false;
  let inTargetPath = false;
  let inTargetMethod = false;
  let pathIndent = 0;
  let methodIndent = 0;
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const currentIndent = line.search(/\S/);

    // Detect paths: section
    if (trimmed === 'paths:') {
      inPaths = true;
      continue;
    }

    if (!inPaths) continue;

    // Detect target path (accounting for quotes)
    const pathMatch = line.match(/^(\s*)['"]?([^'":\s]+)['"]?:\s*$/);
    if (pathMatch && pathMatch[2] === path) {
      inTargetPath = true;
      pathIndent = currentIndent;
      result.push(line);
      continue;
    }

    // If we're past the target path section
    if (inTargetPath && currentIndent <= pathIndent && trimmed && !inTargetMethod) {
      break;
    }

    if (!inTargetPath) continue;

    // If no specific method requested, capture entire path
    if (!method) {
      result.push(line);
      continue;
    }

    // Detect target method
    const methodMatch = line.match(/^(\s*)(get|post|put|patch|delete|head|options):\s*$/i);
    if (methodMatch && methodMatch[2].toLowerCase() === method.toLowerCase()) {
      inTargetMethod = true;
      methodIndent = currentIndent;
      result.push(line);
      continue;
    }

    // If we're past the target method section
    if (inTargetMethod && currentIndent <= methodIndent && trimmed) {
      const isAnotherMethod = line.match(/^\s*(get|post|put|patch|delete|head|options):\s*$/i);
      if (isAnotherMethod) break;
    }

    if (inTargetMethod) {
      result.push(line);
    }
  }

  return result.join('\n');
}

// ============================================================================
// Prisma Parser - Extract Database Models
// ============================================================================

/**
 * Extract models from Prisma schema content
 */
export function extractPrismaModels(schemaContent: string): ParsedDbModel[] {
  const models: ParsedDbModel[] = [];

  // Match model blocks: "model User { ... }"
  const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
  let modelMatch;

  while ((modelMatch = modelRegex.exec(schemaContent)) !== null) {
    const name = modelMatch[1];
    const body = modelMatch[2];

    const fields: ParsedDbModel['fields'] = [];
    const relations: string[] = [];

    // Parse each line in the model body
    const lines = body.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('@@')) continue;

      // Match field definition: "id String @id @default(uuid())"
      const fieldMatch = trimmed.match(/^(\w+)\s+(\w+)(\?|\[\])?\s*(.*)/);
      if (fieldMatch) {
        const fieldName = fieldMatch[1];
        const fieldType = fieldMatch[2] + (fieldMatch[3] || '');
        const attributes = fieldMatch[4] || '';

        fields.push({
          name: fieldName,
          type: fieldType,
          attributes: attributes.split(/\s+/).filter((a) => a.startsWith('@')),
        });

        // Track relations
        if (attributes.includes('@relation')) {
          relations.push(fieldType.replace('[]', '').replace('?', ''));
        }
      }
    }

    models.push({ name, fields, relations });
  }

  return models;
}

/**
 * Extract a specific model's Prisma snippet
 */
export function extractPrismaModelSnippet(schemaContent: string, modelName: string): string {
  const modelRegex = new RegExp(`model\\s+${modelName}\\s*\\{[^}]+\\}`, 'g');
  const match = modelRegex.exec(schemaContent);
  return match ? match[0] : '';
}

// ============================================================================
// Zod Schema Parser
// ============================================================================

/**
 * Extract Zod schema definitions from TypeScript files
 */
export function extractZodSchemas(content: string, fileName: string): ParsedZodSchema[] {
  const schemas: ParsedZodSchema[] = [];

  // Match exported Zod schema definitions
  // e.g., "export const UserSchema = z.object({ ... })"
  const schemaRegex =
    /export\s+const\s+(\w+Schema)\s*=\s*z\.(object|string|number|array|enum)\s*\(([\s\S]*?)\);/g;
  let match;

  while ((match = schemaRegex.exec(content)) !== null) {
    const name = match[1];
    const fullMatch = match[0];

    schemas.push({
      name,
      file: fileName,
      content: fullMatch,
    });
  }

  // Also match type exports derived from schemas
  // e.g., "export type User = z.infer<typeof UserSchema>"
  const typeRegex = /export\s+type\s+(\w+)\s*=\s*z\.infer<typeof\s+(\w+)>/g;
  while ((match = typeRegex.exec(content)) !== null) {
    // Find the corresponding schema and append the type definition
    const typeName = match[1];
    const schemaName = match[2];
    const existingSchema = schemas.find((s) => s.name === schemaName);
    if (existingSchema) {
      existingSchema.content += `\nexport type ${typeName} = z.infer<typeof ${schemaName}>;`;
    }
  }

  return schemas;
}

// ============================================================================
// Keyword Extraction
// ============================================================================

// Common domain terms to look for
const DOMAIN_TERMS = [
  'auth',
  'authentication',
  'authorization',
  'login',
  'logout',
  'register',
  'signup',
  'signin',
  'password',
  'email',
  'user',
  'admin',
  'role',
  'permission',
  'token',
  'session',
  'refresh',
  'verify',
  'reset',
  'dashboard',
  'profile',
  'settings',
  'notification',
  'message',
  'chat',
  'comment',
  'post',
  'article',
  'blog',
  'product',
  'cart',
  'checkout',
  'order',
  'payment',
  'invoice',
  'subscription',
  'plan',
  'billing',
  'api',
  'endpoint',
  'crud',
  'create',
  'read',
  'update',
  'delete',
  'list',
  'search',
  'filter',
  'sort',
  'paginate',
  'upload',
  'download',
  'file',
  'image',
  'media',
  'storage',
  'database',
  'cache',
  'queue',
  'webhook',
  'event',
  'log',
  'audit',
  'analytics',
  'metric',
  'report',
  'export',
  'import',
];

/**
 * Extract keywords from text for matching purposes
 * Uses simple pattern matching (no embeddings)
 */
export function extractKeywords(text: string): string[] {
  const normalizedText = text.toLowerCase();
  const keywords = new Set<string>();

  // Match domain terms
  for (const term of DOMAIN_TERMS) {
    if (normalizedText.includes(term)) {
      keywords.add(term);
    }
  }

  // Match CamelCase entity names (e.g., "UserProfile", "OrderItem")
  const camelCaseMatches = text.match(/\b[A-Z][a-z]+(?:[A-Z][a-z]+)+\b/g);
  if (camelCaseMatches) {
    for (const match of camelCaseMatches) {
      keywords.add(match.toLowerCase());
    }
  }

  // Match PascalCase single words (e.g., "User", "Order")
  const pascalMatches = text.match(/\b[A-Z][a-z]{2,}\b/g);
  if (pascalMatches) {
    for (const match of pascalMatches) {
      const lower = match.toLowerCase();
      // Only add if it's a meaningful entity name
      if (lower.length >= 3 && !['the', 'and', 'for', 'with'].includes(lower)) {
        keywords.add(lower);
      }
    }
  }

  // Match API paths segments (e.g., "/users/profile" -> ["users", "profile"])
  const pathMatches = text.match(/\/([a-z][a-z0-9-]+)/gi);
  if (pathMatches) {
    for (const match of pathMatches) {
      const segment = match.slice(1).toLowerCase();
      if (segment.length >= 3) {
        keywords.add(segment);
      }
    }
  }

  return Array.from(keywords);
}

/**
 * Calculate keyword overlap score between two sets
 */
export function calculateKeywordOverlap(keywords1: string[], keywords2: string[]): number {
  const set1 = new Set(keywords1.map((k) => k.toLowerCase()));
  const set2 = new Set(keywords2.map((k) => k.toLowerCase()));

  let overlap = 0;
  for (const k of set1) {
    if (set2.has(k)) overlap++;
  }

  return overlap;
}

/**
 * Find matching items based on keyword overlap
 */
export function matchByKeywords<T extends { keywords?: string[] }>(
  items: T[],
  targetKeywords: string[],
  minOverlap: number = 1
): T[] {
  return items.filter((item) => {
    const itemKeywords = item.keywords || [];
    const overlap = calculateKeywordOverlap(itemKeywords, targetKeywords);
    return overlap >= minOverlap;
  });
}
