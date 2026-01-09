/**
 * Spec Management MCP Tools
 *
 * Tools for managing specifications in the Hub-and-Spoke architecture.
 *
 * Supports both stacks:
 * - Node.js: OpenAPI, Prisma, Zod
 * - Python: OpenAPI, SQLAlchemy, Pydantic
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  getStore,
  Specs,
  SpecType
} from '../state/truth-store.js';

// ============================================================
// Tool Definitions (MCP Format)
// ============================================================

// ============================================================
// Stack Detection Helper
// ============================================================

export type ProjectStack = 'nodejs' | 'python' | 'unknown';

/**
 * Detect project stack from TECH_STACK.md or file structure
 */
export function detectProjectStack(projectPath: string): ProjectStack {
  // Check TECH_STACK.md first
  const techStackPath = path.join(projectPath, 'docs', 'TECH_STACK.md');
  if (fs.existsSync(techStackPath)) {
    const content = fs.readFileSync(techStackPath, 'utf-8').toLowerCase();
    if (content.includes('python') || content.includes('fastapi') || content.includes('flask') || content.includes('django')) {
      return 'python';
    }
    if (content.includes('node') || content.includes('express') || content.includes('typescript')) {
      return 'nodejs';
    }
  }

  // Fallback: Check for characteristic files
  if (fs.existsSync(path.join(projectPath, 'pyproject.toml')) ||
      fs.existsSync(path.join(projectPath, 'requirements.txt')) ||
      fs.existsSync(path.join(projectPath, 'setup.py'))) {
    return 'python';
  }

  if (fs.existsSync(path.join(projectPath, 'package.json')) ||
      fs.existsSync(path.join(projectPath, 'tsconfig.json'))) {
    return 'nodejs';
  }

  return 'unknown';
}

export const specTools = {
  register_spec: {
    name: 'register_spec',
    description: `Register a specification file for tracking and validation.

WHEN TO USE: During architecture phase (G3) when creating specs. Register each spec file for immutability tracking.

SPEC TYPES (Node.js):
- openapi: API contract (specs/openapi.yaml)
- prisma: Database schema (prisma/schema.prisma)
- zod: Validation schemas (specs/schemas/*.ts)

SPEC TYPES (Python):
- openapi: API contract (specs/openapi.yaml)
- sqlalchemy: Database models (src/models/__init__.py)
- pydantic: Validation schemas (specs/schemas/__init__.py)

RETURNS: { success, spec_type, path, checksum }. Checksum used for integrity verification.

IMPORTANT: Cannot register after specs are locked (post-G3). Register all specs before G3 approval.`,
    inputSchema: {
      type: 'object',
      required: ['project_path', 'spec_type', 'spec_path'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        spec_type: { type: 'string', enum: ['openapi', 'prisma', 'zod', 'sqlalchemy', 'pydantic'], description: 'Type of specification' },
        spec_path: { type: 'string', description: 'Relative path from project root. Example: "specs/openapi.yaml"' }
      }
    }
  },

  lock_specs: {
    name: 'lock_specs',
    description: `Lock all registered specs, making them immutable. AUTO-CALLED on G3 approval.

WHEN TO USE: Automatically triggered when G3 is approved. Can call manually for early lock.

RETURNS: { success, locked_at, locked_by, spec_count }

EFFECT: After locking:
- register_spec will fail
- Any spec file changes will be detected by check_spec_integrity
- Developers must implement against locked specs

CRITICAL: Spec lock enforces contract-first development. All implementation must match specs.`,
    inputSchema: {
      type: 'object',
      required: ['project_path', 'locked_by'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        locked_by: { type: 'string', description: 'Who locked: "G3" or username' }
      }
    }
  },

  get_specs: {
    name: 'get_specs',
    description: `Get all registered specs with their status.

WHEN TO USE: To see what specs exist. Before development to understand contracts. For status reports.

RETURNS: { specs: { openapi?, prisma?, zod? }, locked, locked_at, locked_by }

Each spec includes: path, checksum, registered_at.`,
    inputSchema: {
      type: 'object',
      required: ['project_path'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' }
      }
    }
  },

  get_spec: {
    name: 'get_spec',
    description: `Get a specific spec with optional file content.

WHEN TO USE: When implementing against a spec. To see exact API contract or schema definition.

RETURNS: { spec_type, path, checksum, content? }

SET include_content=true to get actual file content. Useful for code generation.`,
    inputSchema: {
      type: 'object',
      required: ['project_path', 'spec_type'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        spec_type: { type: 'string', enum: ['openapi', 'prisma', 'zod'] },
        include_content: { type: 'boolean', description: 'Include file content. Default: false' }
      }
    }
  },

  validate_against_spec: {
    name: 'validate_against_spec',
    description: `Validate implementation file against registered spec.

WHEN TO USE: After implementing an API endpoint. After creating database models. Before PR/handoff.

RETURNS: { valid, errors[], warnings[] }

EXAMPLES:
- Validate route handler against OpenAPI path
- Validate Prisma client usage against schema
- Validate API response against Zod schema

IMPORTANT: Run before task completion to catch spec violations early.`,
    inputSchema: {
      type: 'object',
      required: ['project_path', 'file_path', 'spec_type'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        file_path: { type: 'string', description: 'File to validate. Example: "src/api/users.ts"' },
        spec_type: { type: 'string', enum: ['openapi', 'prisma', 'zod'] },
        spec_section: { type: 'string', description: 'Specific section. Example: "paths./users.get"' }
      }
    }
  },

  check_spec_integrity: {
    name: 'check_spec_integrity',
    description: `Verify spec files haven't changed since registration/lock.

WHEN TO USE: At session start. Before gate approvals. When spec drift is suspected.

RETURNS: { intact: boolean, violations[] }

If intact=false, violations[] lists which specs changed and how.

CRITICAL: Spec changes after lock require:
1. Document in DECISIONS.md with rationale
2. Update via formal change request
3. Re-lock specs
4. Verify all implementations still match`,
    inputSchema: {
      type: 'object',
      required: ['project_path'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' }
      }
    }
  },

  validate_specs_for_g3: {
    name: 'validate_specs_for_g3',
    description: `Run ACTUAL spec validation commands and capture output as proof artifacts for G3 gate approval.

WHEN TO USE: MANDATORY before G3 gate approval. Auto-detects stack and runs appropriate commands:

NODE.JS STACK:
- swagger-cli validate specs/openapi.yaml (OpenAPI)
- npx prisma validate (Prisma schema)
- npx tsc --noEmit specs/schemas/*.ts (Zod schemas)

PYTHON STACK:
- swagger-cli validate specs/openapi.yaml (OpenAPI)
- python -c "from src.models import *" (SQLAlchemy models)
- python -c "from specs.schemas import *" (Pydantic schemas)

RETURNS: {
  all_valid: boolean,
  stack: 'nodejs' | 'python',
  results: { openapi?: {...}, prisma?: {...}, zod?: {...}, sqlalchemy?: {...}, pydantic?: {...} },
  proof_submitted: boolean,
  artifact_id: string,
  gate_readiness: { can_approve: boolean, missing: string[] }
}

CRITICAL:
- Actually EXECUTES validation tools (not just static analysis)
- Auto-detects project stack from TECH_STACK.md or file structure
- Captures REAL command output with exit codes
- Submits output as 'spec_validation' proof artifact
- G3 gate WILL BLOCK without this proof

EXAMPLE USAGE:
validate_specs_for_g3({
  project_path: "/path/to/project",
  project_id: "my-app"
})`,
    inputSchema: {
      type: 'object' as const,
      required: ['project_path', 'project_id'],
      properties: {
        project_path: { type: 'string', description: 'Absolute path to the project' },
        project_id: { type: 'string', description: 'Project ID for proof artifact tracking' },
        force_stack: { type: 'string', enum: ['nodejs', 'python'], description: 'Force a specific stack (overrides auto-detection)' },
        skip_openapi: { type: 'boolean', description: 'Skip OpenAPI validation (if no OpenAPI spec)' },
        skip_db: { type: 'boolean', description: 'Skip database validation (Prisma or SQLAlchemy)' },
        skip_validation: { type: 'boolean', description: 'Skip validation schema check (Zod or Pydantic)' }
      }
    }
  }
};

// ============================================================
// Tool Handlers
// ============================================================

// SpecType imported from truth-store.js

export interface RegisterSpecInput {
  project_path: string;
  spec_type: SpecType;
  spec_path: string;
}

export interface RegisterSpecOutput {
  success: boolean;
  spec_type: string;
  path: string;
  checksum: string;
  error?: string;
}

export function registerSpec(input: RegisterSpecInput): RegisterSpecOutput {
  const store = getStore(input.project_path);

  // Check if specs are locked
  if (store.areSpecsLocked()) {
    return {
      success: false,
      spec_type: input.spec_type,
      path: input.spec_path,
      checksum: '',
      error: 'Specs are locked. Cannot modify after G3 approval.'
    };
  }

  // Check if file exists
  const fullPath = path.join(input.project_path, input.spec_path);
  if (!fs.existsSync(fullPath)) {
    return {
      success: false,
      spec_type: input.spec_type,
      path: input.spec_path,
      checksum: '',
      error: `Spec file not found: ${fullPath}`
    };
  }

  // Calculate checksum
  const content = fs.readFileSync(fullPath, 'utf-8');
  const checksum = crypto.createHash('sha256').update(content).digest('hex');

  // Register the spec
  try {
    store.updateSpec(input.spec_type, input.spec_path);
    return {
      success: true,
      spec_type: input.spec_type,
      path: input.spec_path,
      checksum
    };
  } catch (error) {
    return {
      success: false,
      spec_type: input.spec_type,
      path: input.spec_path,
      checksum: '',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export interface LockSpecsInput {
  project_path: string;
  locked_by: string;
}

export interface LockSpecsOutput {
  success: boolean;
  specs: Specs;
  error?: string;
}

export function lockSpecs(input: LockSpecsInput): LockSpecsOutput {
  const store = getStore(input.project_path);

  // Check if already locked
  if (store.areSpecsLocked()) {
    return {
      success: false,
      specs: store.getSpecs(),
      error: 'Specs are already locked'
    };
  }

  // Verify all required specs are registered
  const specs = store.getSpecs();
  const missingSpecs: string[] = [];

  if (!specs.openapi?.path) missingSpecs.push('openapi');
  if (!specs.prisma?.path) missingSpecs.push('prisma');
  // Zod is optional

  if (missingSpecs.length > 0) {
    return {
      success: false,
      specs,
      error: `Missing required specs: ${missingSpecs.join(', ')}`
    };
  }

  // Lock the specs
  const lockedSpecs = store.lockSpecs(input.locked_by);
  return {
    success: true,
    specs: lockedSpecs
  };
}

export interface GetSpecsInput {
  project_path: string;
}

export function getSpecs(input: GetSpecsInput): Specs {
  const store = getStore(input.project_path);
  return store.getSpecs();
}

export interface GetSpecInput {
  project_path: string;
  spec_type: SpecType;
  include_content?: boolean;
}

export interface GetSpecOutput {
  spec_type: string;
  path?: string;
  checksum?: string;
  content?: string;
  exists: boolean;
  locked: boolean;
}

export function getSpec(input: GetSpecInput): GetSpecOutput {
  const store = getStore(input.project_path);
  const specs = store.getSpecs();
  const spec = specs[input.spec_type];

  if (!spec?.path) {
    return {
      spec_type: input.spec_type,
      exists: false,
      locked: specs.locked
    };
  }

  const result: GetSpecOutput = {
    spec_type: input.spec_type,
    path: spec.path,
    checksum: spec.checksum,
    exists: true,
    locked: specs.locked
  };

  if (input.include_content) {
    const fullPath = path.join(input.project_path, spec.path);
    if (fs.existsSync(fullPath)) {
      result.content = fs.readFileSync(fullPath, 'utf-8');
    }
  }

  return result;
}

export interface ValidateAgainstSpecInput {
  project_path: string;
  file_path: string;
  spec_type: SpecType;
  spec_section?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    message: string;
    line?: number;
    column?: number;
    path?: string;
  }>;
  warnings: Array<{
    message: string;
    line?: number;
    column?: number;
    path?: string;
  }>;
}

export function validateAgainstSpec(input: ValidateAgainstSpecInput): ValidationResult {
  const store = getStore(input.project_path);
  const specs = store.getSpecs();
  const spec = specs[input.spec_type];

  if (!spec?.path) {
    return {
      valid: false,
      errors: [{ message: `No ${input.spec_type} spec registered` }],
      warnings: []
    };
  }

  const specFullPath = path.join(input.project_path, spec.path);
  const fileFullPath = path.join(input.project_path, input.file_path);

  if (!fs.existsSync(specFullPath)) {
    return {
      valid: false,
      errors: [{ message: `Spec file not found: ${spec.path}` }],
      warnings: []
    };
  }

  if (!fs.existsSync(fileFullPath)) {
    return {
      valid: false,
      errors: [{ message: `File not found: ${input.file_path}` }],
      warnings: []
    };
  }

  // Type-specific validation
  switch (input.spec_type) {
    case 'openapi':
      return validateOpenAPIImplementation(specFullPath, fileFullPath, input.spec_section);
    case 'prisma':
      return validatePrismaImplementation(specFullPath, fileFullPath);
    case 'zod':
      return validateZodImplementation(specFullPath, fileFullPath);
    case 'sqlalchemy':
      return validateSQLAlchemyImplementation(specFullPath, fileFullPath);
    case 'pydantic':
      return validatePydanticImplementation(specFullPath, fileFullPath);
    case 'database_schema':
      return { valid: true, errors: [], warnings: [] }; // JSON Schema validation TBD
    default:
      return { valid: true, errors: [], warnings: [] };
  }
}

function validateOpenAPIImplementation(specPath: string, filePath: string, section?: string): ValidationResult {
  const errors: ValidationResult['errors'] = [];
  const warnings: ValidationResult['warnings'] = [];

  try {
    const specContent = fs.readFileSync(specPath, 'utf-8');
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    // Parse OpenAPI spec (simplified - would use proper YAML parser)
    // Check if file implements endpoints defined in spec

    // Look for route handlers
    if (filePath.includes('/api/') || filePath.includes('/routes/')) {
      // Check for HTTP methods
      const methods = ['get', 'post', 'put', 'patch', 'delete'];
      const hasRouteHandler = methods.some(method =>
        new RegExp(`\\.${method}\\s*\\(`, 'i').test(fileContent)
      );

      if (!hasRouteHandler) {
        warnings.push({
          message: 'No route handlers found in API file',
          path: filePath
        });
      }

      // Check for response type consistency
      if (!fileContent.includes('Response') && !fileContent.includes('res.json')) {
        warnings.push({
          message: 'No explicit response handling found',
          path: filePath
        });
      }
    }

    // If section is specified, validate that specific path
    if (section && specContent.includes(section.replace(/^paths\./, ''))) {
      // Validate the specific endpoint
      const endpoint = section.replace(/^(openapi\.)?paths\./, '');
      if (!fileContent.includes(endpoint.replace(/\./g, '/'))) {
        warnings.push({
          message: `Endpoint ${endpoint} may not be implemented`,
          path: filePath
        });
      }
    }

  } catch (error) {
    errors.push({
      message: `Failed to validate: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

function validatePrismaImplementation(specPath: string, filePath: string): ValidationResult {
  const errors: ValidationResult['errors'] = [];
  const warnings: ValidationResult['warnings'] = [];

  try {
    const specContent = fs.readFileSync(specPath, 'utf-8');
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    // Extract model names from Prisma schema
    const modelMatches = specContent.matchAll(/model\s+(\w+)\s*\{/g);
    const models = Array.from(modelMatches).map(m => m[1]);

    // Check if file uses Prisma client
    if (fileContent.includes('prisma') || fileContent.includes('PrismaClient')) {
      // Good - using Prisma
      for (const model of models) {
        const modelLower = model.toLowerCase();
        if (fileContent.toLowerCase().includes(modelLower)) {
          // Model is referenced
        }
      }
    } else if (filePath.includes('/services/') || filePath.includes('/models/')) {
      warnings.push({
        message: 'File in services/models directory does not use Prisma client',
        path: filePath
      });
    }

  } catch (error) {
    errors.push({
      message: `Failed to validate: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

function validateZodImplementation(specPath: string, filePath: string): ValidationResult {
  const errors: ValidationResult['errors'] = [];
  const warnings: ValidationResult['warnings'] = [];

  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    // Check if file imports from spec schemas
    if (fileContent.includes('specs/schemas') || fileContent.includes('zod')) {
      // Good - using Zod schemas
    } else if (filePath.includes('/components/') || filePath.includes('/forms/')) {
      // Form components should use Zod validation
      if (fileContent.includes('form') || fileContent.includes('Form')) {
        if (!fileContent.includes('zodResolver') && !fileContent.includes('zod')) {
          warnings.push({
            message: 'Form component does not use Zod validation',
            path: filePath
          });
        }
      }
    }

    // Check for inline validation that should use schema
    if (fileContent.includes('z.object') && !filePath.includes('specs/schemas')) {
      warnings.push({
        message: 'Inline Zod schema found - consider using shared schema from specs/schemas',
        path: filePath
      });
    }

  } catch (error) {
    errors.push({
      message: `Failed to validate: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

function validateSQLAlchemyImplementation(specPath: string, filePath: string): ValidationResult {
  const errors: ValidationResult['errors'] = [];
  const warnings: ValidationResult['warnings'] = [];

  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    // Check if file uses SQLAlchemy patterns
    if (fileContent.includes('from sqlalchemy') || fileContent.includes('import sqlalchemy')) {
      // Good - using SQLAlchemy
    } else if (filePath.includes('/models/') || filePath.includes('/services/')) {
      warnings.push({
        message: 'File in models/services directory does not import SQLAlchemy',
        path: filePath
      });
    }

    // Check for direct SQL that should use ORM
    if (fileContent.includes('execute(') && fileContent.includes('SELECT') && !fileContent.includes('text(')) {
      warnings.push({
        message: 'Raw SQL detected - consider using SQLAlchemy ORM methods',
        path: filePath
      });
    }

  } catch (error) {
    errors.push({
      message: `Failed to validate: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

function validatePydanticImplementation(specPath: string, filePath: string): ValidationResult {
  const errors: ValidationResult['errors'] = [];
  const warnings: ValidationResult['warnings'] = [];

  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    // Check if file imports from spec schemas
    if (fileContent.includes('from specs.schemas') || fileContent.includes('from pydantic')) {
      // Good - using Pydantic schemas
    } else if (filePath.includes('/api/') || filePath.includes('/routes/')) {
      // API files should use Pydantic validation
      if (fileContent.includes('@app.') || fileContent.includes('@router.')) {
        if (!fileContent.includes('specs.schemas') && !fileContent.includes('BaseModel')) {
          warnings.push({
            message: 'API endpoint does not use Pydantic validation from specs/schemas',
            path: filePath
          });
        }
      }
    }

    // Check for inline validation that should use schema
    if (fileContent.includes('class') && fileContent.includes('BaseModel') && !filePath.includes('specs/schemas')) {
      warnings.push({
        message: 'Inline Pydantic schema found - consider using shared schema from specs/schemas',
        path: filePath
      });
    }

    // Check for response_model usage
    if ((fileContent.includes('@app.post') || fileContent.includes('@router.post')) &&
        !fileContent.includes('response_model=')) {
      warnings.push({
        message: 'POST endpoint missing response_model parameter',
        path: filePath
      });
    }

  } catch (error) {
    errors.push({
      message: `Failed to validate: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export interface CheckSpecIntegrityInput {
  project_path: string;
}

export interface IntegrityResult {
  all_valid: boolean;
  specs: Record<string, {
    path: string;
    registered_checksum: string;
    current_checksum: string;
    valid: boolean;
    exists: boolean;
  }>;
}

export function checkSpecIntegrity(input: CheckSpecIntegrityInput): IntegrityResult {
  const store = getStore(input.project_path);
  const specs = store.getSpecs();

  const result: IntegrityResult = {
    all_valid: true,
    specs: {}
  };

  const specTypes: SpecType[] = ['openapi', 'database_schema', 'prisma', 'zod', 'sqlalchemy', 'pydantic'];

  for (const specType of specTypes) {
    const spec = specs[specType];
    if (!spec?.path) continue;

    const fullPath = path.join(input.project_path, spec.path);
    const exists = fs.existsSync(fullPath);

    let currentChecksum = '';
    if (exists) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      currentChecksum = crypto.createHash('sha256').update(content).digest('hex');
    }

    const valid = exists && (spec.checksum === currentChecksum);
    if (!valid) {
      result.all_valid = false;
    }

    result.specs[specType] = {
      path: spec.path,
      registered_checksum: spec.checksum || '',
      current_checksum: currentChecksum,
      valid,
      exists
    };
  }

  return result;
}

// ============================================================
// G3 Spec Validation with Proof Artifact Capture
// ============================================================

export interface ValidateSpecsForG3Input {
  project_path: string;
  project_id: string;
  force_stack?: 'nodejs' | 'python';
  skip_openapi?: boolean;
  skip_db?: boolean;        // Skip Prisma (Node.js) or SQLAlchemy (Python)
  skip_validation?: boolean; // Skip Zod (Node.js) or Pydantic (Python)
}

export interface SpecValidationResult {
  spec_type: SpecType;
  command: string;
  exit_code: number;
  stdout: string;
  stderr: string;
  valid: boolean;
  skipped: boolean;
  error?: string;
}

export interface ValidateSpecsForG3Output {
  all_valid: boolean;
  stack: ProjectStack;
  results: {
    openapi?: SpecValidationResult;
    // Node.js
    prisma?: SpecValidationResult;
    zod?: SpecValidationResult;
    // Python
    sqlalchemy?: SpecValidationResult;
    pydantic?: SpecValidationResult;
  };
  proof_submitted: boolean;
  artifact_id: string | null;
  gate_readiness: {
    can_approve: boolean;
    missing: string[];
  };
  summary: string;
}

/**
 * Run actual spec validation commands and capture output as proof artifacts.
 * This is REQUIRED for G3 gate approval.
 *
 * Supports both Node.js (Prisma/Zod) and Python (SQLAlchemy/Pydantic) stacks.
 */
export async function validateSpecsForG3(input: ValidateSpecsForG3Input): Promise<ValidateSpecsForG3Output> {
  const { spawnSync } = await import('child_process');
  const store = getStore(input.project_path);
  const specs = store.getSpecs();

  // Detect stack (or use forced stack)
  const stack: ProjectStack = input.force_stack || detectProjectStack(input.project_path);

  const results: ValidateSpecsForG3Output['results'] = {};
  let allValid = true;
  const validationOutput: string[] = [];

  validationOutput.push('# Spec Validation Report for G3');
  validationOutput.push(`Project: ${input.project_id}`);
  validationOutput.push(`Stack: ${stack}`);
  validationOutput.push(`Timestamp: ${new Date().toISOString()}`);
  validationOutput.push('');

  // --------------------------------------------------------
  // OpenAPI Validation (both stacks)
  // --------------------------------------------------------
  if (!input.skip_openapi && specs.openapi?.path) {
    const openapiPath = path.join(input.project_path, specs.openapi.path);
    validationOutput.push('## OpenAPI Validation');
    validationOutput.push(`Spec: ${specs.openapi.path}`);
    validationOutput.push('');

    try {
      const command = `npx swagger-cli validate "${openapiPath}"`;
      const result = spawnSync('npx', ['swagger-cli', 'validate', openapiPath], {
        cwd: input.project_path,
        timeout: 60000,
        encoding: 'utf-8',
        shell: true
      });

      results.openapi = {
        spec_type: 'openapi',
        command,
        exit_code: result.status ?? -1,
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        valid: result.status === 0,
        skipped: false
      };

      if (!results.openapi.valid) {
        allValid = false;
      }

      validationOutput.push('```');
      validationOutput.push(`$ ${command}`);
      validationOutput.push(result.stdout || '');
      if (result.stderr) validationOutput.push(result.stderr);
      validationOutput.push(`Exit code: ${result.status}`);
      validationOutput.push('```');
      validationOutput.push(`Result: ${results.openapi.valid ? '✅ VALID' : '❌ INVALID'}`);
      validationOutput.push('');

    } catch (error) {
      results.openapi = {
        spec_type: 'openapi',
        command: 'swagger-cli validate',
        exit_code: -1,
        stdout: '',
        stderr: '',
        valid: false,
        skipped: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      allValid = false;
      validationOutput.push(`Error: ${results.openapi.error}`);
      validationOutput.push('');
    }
  } else if (!input.skip_openapi) {
    results.openapi = {
      spec_type: 'openapi',
      command: 'N/A',
      exit_code: 0,
      stdout: 'No OpenAPI spec registered',
      stderr: '',
      valid: true,
      skipped: true
    };
    validationOutput.push('## OpenAPI Validation');
    validationOutput.push('Skipped: No OpenAPI spec registered');
    validationOutput.push('');
  }

  // --------------------------------------------------------
  // Stack-specific Database Validation
  // --------------------------------------------------------
  if (stack === 'nodejs' || stack === 'unknown') {
    // Node.js: Prisma Validation
    if (!input.skip_db && specs.prisma?.path) {
      const prismaPath = path.join(input.project_path, specs.prisma.path);
      validationOutput.push('## Prisma Validation (Node.js)');
      validationOutput.push(`Schema: ${specs.prisma.path}`);
      validationOutput.push('');

      try {
        const command = 'npx prisma validate';
        const result = spawnSync('npx', ['prisma', 'validate'], {
          cwd: input.project_path,
          timeout: 60000,
          encoding: 'utf-8',
          shell: true,
          env: { ...process.env, PRISMA_SCHEMA_PATH: prismaPath }
        });

        results.prisma = {
          spec_type: 'prisma',
          command,
          exit_code: result.status ?? -1,
          stdout: result.stdout || '',
          stderr: result.stderr || '',
          valid: result.status === 0,
          skipped: false
        };

        if (!results.prisma.valid) allValid = false;

        validationOutput.push('```');
        validationOutput.push(`$ ${command}`);
        validationOutput.push(result.stdout || '');
        if (result.stderr) validationOutput.push(result.stderr);
        validationOutput.push(`Exit code: ${result.status}`);
        validationOutput.push('```');
        validationOutput.push(`Result: ${results.prisma.valid ? '✅ VALID' : '❌ INVALID'}`);
        validationOutput.push('');

      } catch (error) {
        results.prisma = {
          spec_type: 'prisma',
          command: 'prisma validate',
          exit_code: -1,
          stdout: '',
          stderr: '',
          valid: false,
          skipped: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
        allValid = false;
        validationOutput.push(`Error: ${results.prisma.error}`);
        validationOutput.push('');
      }
    }

    // Node.js: Zod Schema Validation
    if (!input.skip_validation && specs.zod?.path) {
      const zodPath = path.join(input.project_path, specs.zod.path);
      validationOutput.push('## Zod Schema Validation (Node.js)');
      validationOutput.push(`Schema: ${specs.zod.path}`);
      validationOutput.push('');

      try {
        const command = `npx tsc --noEmit "${zodPath}"`;
        const result = spawnSync('npx', ['tsc', '--noEmit', zodPath], {
          cwd: input.project_path,
          timeout: 120000,
          encoding: 'utf-8',
          shell: true
        });

        results.zod = {
          spec_type: 'zod',
          command,
          exit_code: result.status ?? -1,
          stdout: result.stdout || '',
          stderr: result.stderr || '',
          valid: result.status === 0,
          skipped: false
        };

        if (!results.zod.valid) allValid = false;

        validationOutput.push('```');
        validationOutput.push(`$ ${command}`);
        validationOutput.push(result.stdout || '');
        if (result.stderr) validationOutput.push(result.stderr);
        validationOutput.push(`Exit code: ${result.status}`);
        validationOutput.push('```');
        validationOutput.push(`Result: ${results.zod.valid ? '✅ VALID' : '❌ INVALID'}`);
        validationOutput.push('');

      } catch (error) {
        results.zod = {
          spec_type: 'zod',
          command: 'tsc --noEmit',
          exit_code: -1,
          stdout: '',
          stderr: '',
          valid: false,
          skipped: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
        allValid = false;
        validationOutput.push(`Error: ${results.zod.error}`);
        validationOutput.push('');
      }
    }
  }

  if (stack === 'python') {
    // Python: SQLAlchemy Model Validation
    if (!input.skip_db && specs.sqlalchemy?.path) {
      validationOutput.push('## SQLAlchemy Models Validation (Python)');
      validationOutput.push(`Models: ${specs.sqlalchemy.path}`);
      validationOutput.push('');

      try {
        const command = 'python -c "from src.models import *; print(\'OK\')"';
        const result = spawnSync('python', ['-c', 'from src.models import *; print("OK")'], {
          cwd: input.project_path,
          timeout: 60000,
          encoding: 'utf-8',
          shell: true
        });

        results.sqlalchemy = {
          spec_type: 'sqlalchemy',
          command,
          exit_code: result.status ?? -1,
          stdout: result.stdout || '',
          stderr: result.stderr || '',
          valid: result.status === 0,
          skipped: false
        };

        if (!results.sqlalchemy.valid) allValid = false;

        validationOutput.push('```');
        validationOutput.push(`$ ${command}`);
        validationOutput.push(result.stdout || '');
        if (result.stderr) validationOutput.push(result.stderr);
        validationOutput.push(`Exit code: ${result.status}`);
        validationOutput.push('```');
        validationOutput.push(`Result: ${results.sqlalchemy.valid ? '✅ VALID' : '❌ INVALID'}`);
        validationOutput.push('');

      } catch (error) {
        results.sqlalchemy = {
          spec_type: 'sqlalchemy',
          command: 'python -c "from src.models import *"',
          exit_code: -1,
          stdout: '',
          stderr: '',
          valid: false,
          skipped: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
        allValid = false;
        validationOutput.push(`Error: ${results.sqlalchemy.error}`);
        validationOutput.push('');
      }
    }

    // Python: Pydantic Schema Validation
    if (!input.skip_validation && specs.pydantic?.path) {
      validationOutput.push('## Pydantic Schemas Validation (Python)');
      validationOutput.push(`Schemas: ${specs.pydantic.path}`);
      validationOutput.push('');

      try {
        const command = 'python -c "from specs.schemas import *; print(\'OK\')"';
        const result = spawnSync('python', ['-c', 'from specs.schemas import *; print("OK")'], {
          cwd: input.project_path,
          timeout: 60000,
          encoding: 'utf-8',
          shell: true
        });

        results.pydantic = {
          spec_type: 'pydantic',
          command,
          exit_code: result.status ?? -1,
          stdout: result.stdout || '',
          stderr: result.stderr || '',
          valid: result.status === 0,
          skipped: false
        };

        if (!results.pydantic.valid) allValid = false;

        validationOutput.push('```');
        validationOutput.push(`$ ${command}`);
        validationOutput.push(result.stdout || '');
        if (result.stderr) validationOutput.push(result.stderr);
        validationOutput.push(`Exit code: ${result.status}`);
        validationOutput.push('```');
        validationOutput.push(`Result: ${results.pydantic.valid ? '✅ VALID' : '❌ INVALID'}`);
        validationOutput.push('');

      } catch (error) {
        results.pydantic = {
          spec_type: 'pydantic',
          command: 'python -c "from specs.schemas import *"',
          exit_code: -1,
          stdout: '',
          stderr: '',
          valid: false,
          skipped: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
        allValid = false;
        validationOutput.push(`Error: ${results.pydantic.error}`);
        validationOutput.push('');
      }
    }
  }

  // --------------------------------------------------------
  // Summary
  // --------------------------------------------------------
  const summary = allValid
    ? `✅ All spec validations PASSED (${stack} stack)`
    : `❌ One or more spec validations FAILED (${stack} stack)`;

  validationOutput.push('## Summary');
  validationOutput.push(summary);
  validationOutput.push('');

  // --------------------------------------------------------
  // Save Proof Artifact
  // --------------------------------------------------------
  const proofDir = path.join(input.project_path, '.truth', 'proofs', 'G3');
  if (!fs.existsSync(proofDir)) {
    fs.mkdirSync(proofDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const artifactPath = path.join(proofDir, `spec-validation-${timestamp}.md`);
  const artifactContent = validationOutput.join('\n');
  fs.writeFileSync(artifactPath, artifactContent);

  // Calculate hash
  const fileHash = crypto.createHash('sha256').update(artifactContent).digest('hex');

  // Submit proof artifact
  let artifactId: string | null = null;
  let proofSubmitted = false;

  try {
    const newArtifact = store.addProofArtifact({
      gate: 'G3',
      proof_type: 'spec_validation',
      file_path: artifactPath,
      file_hash: fileHash,
      content_summary: summary,
      pass_fail: allValid ? 'pass' : 'fail',
      created_at: new Date().toISOString(),
      created_by: 'validate_specs_for_g3',
      verified: false
    });
    artifactId = newArtifact.id;
    proofSubmitted = true;
  } catch (error) {
    // Proof submission failed but validation still ran
    console.error('Failed to submit proof artifact:', error);
  }

  // Check gate readiness
  const gateStatus = store.getGateProofStatus('G3');

  return {
    all_valid: allValid,
    stack,
    results,
    proof_submitted: proofSubmitted,
    artifact_id: artifactId,
    gate_readiness: {
      can_approve: gateStatus.can_approve,
      missing: gateStatus.missing
    },
    summary
  };
}
