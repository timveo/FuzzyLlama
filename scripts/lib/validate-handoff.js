/**
 * Handoff Validation Module
 * =============================================================================
 * Validates agent handoff JSON against the schema.
 * Can be used programmatically or as a CLI tool.
 *
 * Usage (programmatic):
 *   const { validateHandoff, formatErrors } = require('./validate-handoff');
 *   const result = validateHandoff(handoffData);
 *   if (!result.valid) console.log(formatErrors(result.errors));
 *
 * Usage (CLI):
 *   node validate-handoff.js <handoff.json>
 * =============================================================================
 */

const fs = require('fs');
const path = require('path');

// Schema path relative to this file
// Legacy handoff schema is archived; task-completion.schema.json is the new format
const SCHEMA_PATH = path.join(__dirname, '..', '..', 'schemas', 'archive', 'handoff.schema.json');
const TASK_COMPLETION_SCHEMA_PATH = path.join(__dirname, '..', '..', 'schemas', 'task-completion.schema.json');

/**
 * Simple JSON Schema Validator (subset of draft-07)
 * Supports: type, required, properties, items, enum, pattern, format, minimum, maximum
 */
class JSONSchemaValidator {
    constructor(schema) {
        this.schema = schema;
        this.errors = [];
    }

    validate(data, schema = this.schema, currentPath = '') {
        this.errors = [];
        this._validate(data, schema, currentPath);
        return {
            valid: this.errors.length === 0,
            errors: this.errors
        };
    }

    _validate(data, schema, currentPath) {
        if (!schema) return;

        // Handle null values
        if (data === null || data === undefined) {
            // If the field is required, it will be caught by required check
            return;
        }

        // Type validation
        if (schema.type) {
            const actualType = this._getType(data);
            let expectedTypes = Array.isArray(schema.type) ? schema.type : [schema.type];

            // JavaScript doesn't distinguish integer from number, so treat them as equivalent
            if (expectedTypes.includes('integer')) {
                expectedTypes = expectedTypes.map(t => t === 'integer' ? 'number' : t);
                // But if it's supposed to be an integer, check it's a whole number
                if (actualType === 'number' && !Number.isInteger(data)) {
                    this.errors.push({
                        path: currentPath || '/',
                        keyword: 'type',
                        message: `Expected integer but got floating point number`,
                        actual: data,
                        expected: 'integer'
                    });
                    return;
                }
            }

            if (!expectedTypes.includes(actualType)) {
                this.errors.push({
                    path: currentPath || '/',
                    keyword: 'type',
                    message: `Expected type '${expectedTypes.join('|')}' but got '${actualType}'`,
                    actual: actualType,
                    expected: expectedTypes.join('|')
                });
                return; // Stop further validation for this branch
            }
        }

        // Required properties validation
        if (schema.required && schema.type === 'object' && typeof data === 'object') {
            for (const prop of schema.required) {
                if (!(prop in data) || data[prop] === undefined) {
                    this.errors.push({
                        path: `${currentPath}/${prop}`,
                        keyword: 'required',
                        message: `Missing required property '${prop}'`,
                        actual: 'undefined',
                        expected: 'defined'
                    });
                }
            }
        }

        // Properties validation (recursive)
        if (schema.properties && typeof data === 'object' && data !== null) {
            for (const [key, propSchema] of Object.entries(schema.properties)) {
                if (key in data && data[key] !== undefined) {
                    this._validate(data[key], propSchema, `${currentPath}/${key}`);
                }
            }
        }

        // Array items validation (recursive)
        if (schema.items && Array.isArray(data)) {
            data.forEach((item, index) => {
                this._validate(item, schema.items, `${currentPath}[${index}]`);
            });
        }

        // Enum validation
        if (schema.enum && !schema.enum.includes(data)) {
            this.errors.push({
                path: currentPath || '/',
                keyword: 'enum',
                message: `Value must be one of: ${schema.enum.join(', ')}`,
                actual: String(data),
                expected: schema.enum.join(' | ')
            });
        }

        // Pattern validation
        if (schema.pattern && typeof data === 'string') {
            const regex = new RegExp(schema.pattern);
            if (!regex.test(data)) {
                this.errors.push({
                    path: currentPath || '/',
                    keyword: 'pattern',
                    message: `String does not match pattern '${schema.pattern}'`,
                    actual: data,
                    expected: `pattern: ${schema.pattern}`
                });
            }
        }

        // Format validation
        if (schema.format && typeof data === 'string') {
            this._validateFormat(data, schema.format, currentPath);
        }

        // Numeric constraints
        if (typeof data === 'number') {
            if (schema.minimum !== undefined && data < schema.minimum) {
                this.errors.push({
                    path: currentPath || '/',
                    keyword: 'minimum',
                    message: `Number must be >= ${schema.minimum}`,
                    actual: data,
                    expected: `>= ${schema.minimum}`
                });
            }
            if (schema.maximum !== undefined && data > schema.maximum) {
                this.errors.push({
                    path: currentPath || '/',
                    keyword: 'maximum',
                    message: `Number must be <= ${schema.maximum}`,
                    actual: data,
                    expected: `<= ${schema.maximum}`
                });
            }
        }

        // String constraints
        if (typeof data === 'string') {
            if (schema.minLength !== undefined && data.length < schema.minLength) {
                this.errors.push({
                    path: currentPath || '/',
                    keyword: 'minLength',
                    message: `String length must be >= ${schema.minLength}`,
                    actual: data.length,
                    expected: `>= ${schema.minLength}`
                });
            }
            if (schema.maxLength !== undefined && data.length > schema.maxLength) {
                this.errors.push({
                    path: currentPath || '/',
                    keyword: 'maxLength',
                    message: `String length must be <= ${schema.maxLength}`,
                    actual: data.length,
                    expected: `<= ${schema.maxLength}`
                });
            }
        }
    }

    _validateFormat(data, format, currentPath) {
        const formatValidators = {
            'date-time': (str) => {
                const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})?$/;
                return isoRegex.test(str);
            },
            'date': (str) => {
                const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                return dateRegex.test(str);
            },
            'uri': (str) => {
                try {
                    new URL(str);
                    return true;
                } catch {
                    return false;
                }
            },
            'email': (str) => {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return emailRegex.test(str);
            }
        };

        if (formatValidators[format] && !formatValidators[format](data)) {
            this.errors.push({
                path: currentPath || '/',
                keyword: 'format',
                message: `String does not match format '${format}'`,
                actual: data,
                expected: format
            });
        }
    }

    _getType(value) {
        if (value === null) return 'null';
        if (Array.isArray(value)) return 'array';
        return typeof value;
    }
}

/**
 * Validate handoff data against the schema
 * @param {Object} handoffData - The handoff JSON object to validate
 * @param {Object} options - Optional settings
 * @returns {Object} - { valid: boolean, errors: Array }
 */
function validateHandoff(handoffData, options = {}) {
    const schemaPath = options.schemaPath || SCHEMA_PATH;

    // Load schema
    let schema;
    try {
        schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    } catch (err) {
        return {
            valid: false,
            errors: [{
                path: '/',
                keyword: 'schema',
                message: `Failed to load schema: ${err.message}`
            }]
        };
    }

    // Validate
    const validator = new JSONSchemaValidator(schema);
    const result = validator.validate(handoffData);

    // Additional semantic validations
    if (result.valid) {
        const semanticErrors = validateSemantics(handoffData);
        if (semanticErrors.length > 0) {
            result.valid = false;
            result.errors = semanticErrors;
            result.warnings = result.warnings || [];
        }
    }

    return result;
}

/**
 * Perform semantic validations beyond schema compliance
 * @param {Object} data - The handoff data
 * @returns {Array} - Array of error objects
 */
function validateSemantics(data) {
    const errors = [];
    const warnings = [];

    // Check that complete status has verification
    if (data.handoff?.status === 'complete') {
        if (!data.verification) {
            warnings.push({
                path: '/verification',
                keyword: 'semantic',
                message: "Status is 'complete' but verification section is missing",
                severity: 'warning'
            });
        } else {
            // Check verification has actual content
            if (!data.verification.commands_executed || data.verification.commands_executed.length === 0) {
                warnings.push({
                    path: '/verification/commands_executed',
                    keyword: 'semantic',
                    message: "No commands executed in verification",
                    severity: 'warning'
                });
            }
        }
    }

    // Check that files_created entries have paths
    if (data.files_created && Array.isArray(data.files_created)) {
        data.files_created.forEach((file, index) => {
            if (!file.path) {
                errors.push({
                    path: `/files_created[${index}]/path`,
                    keyword: 'semantic',
                    message: "File entry missing 'path' property"
                });
            }
            if (!file.purpose) {
                warnings.push({
                    path: `/files_created[${index}]/purpose`,
                    keyword: 'semantic',
                    message: "File entry missing 'purpose' property",
                    severity: 'warning'
                });
            }
        });
    }

    // Check timestamp is not in the future
    if (data.handoff?.timestamp) {
        const timestamp = new Date(data.handoff.timestamp);
        const now = new Date();
        if (timestamp > now) {
            warnings.push({
                path: '/handoff/timestamp',
                keyword: 'semantic',
                message: "Timestamp is in the future",
                severity: 'warning'
            });
        }
    }

    // Check blockers have resolution_path for non-critical
    if (data.blockers && Array.isArray(data.blockers)) {
        data.blockers.forEach((blocker, index) => {
            if (blocker.severity !== 'critical' && !blocker.resolution_path) {
                warnings.push({
                    path: `/blockers[${index}]/resolution_path`,
                    keyword: 'semantic',
                    message: `Blocker ${blocker.id || index} has no resolution_path`,
                    severity: 'warning'
                });
            }
        });
    }

    return errors;
}

/**
 * Format validation errors for display
 * @param {Array} errors - Array of error objects
 * @returns {string} - Formatted error string
 */
function formatErrors(errors) {
    if (!errors || errors.length === 0) {
        return 'No errors';
    }

    const lines = ['Schema Violations:', ''];
    errors.forEach((err, index) => {
        lines.push(`  ${index + 1}. Path: ${err.path}`);
        lines.push(`     Message: ${err.message}`);
        if (err.actual !== undefined) lines.push(`     Actual: ${err.actual}`);
        if (err.expected !== undefined) lines.push(`     Expected: ${err.expected}`);
        lines.push('');
    });

    return lines.join('\n');
}

/**
 * Format validation result as markdown
 * @param {Object} result - Validation result
 * @param {Object} handoffData - Original handoff data
 * @returns {string} - Markdown formatted result
 */
function formatResultAsMarkdown(result, handoffData) {
    if (result.valid) {
        return `## Handoff Validation Passed

**Agent:** ${handoffData.handoff?.agent || 'Unknown'}
**Status:** ${handoffData.handoff?.status || 'Unknown'}
**Next Agent:** ${handoffData.next_agent || 'None'}

All schema requirements satisfied.`;
    }

    let md = `## Handoff Validation Failed

**Agent:** ${handoffData.handoff?.agent || 'Unknown'}
**Attempt:** Check retry_context for attempt number

### Schema Violations

`;

    result.errors.forEach((err, index) => {
        md += `${index + 1}. **${err.path}**\n`;
        md += `   - ${err.message}\n`;
        if (err.actual !== undefined) md += `   - Actual: \`${err.actual}\`\n`;
        if (err.expected !== undefined) md += `   - Expected: \`${err.expected}\`\n`;
        md += '\n';
    });

    md += `### Required Corrections

Please fix the above issues and resubmit the handoff.`;

    return md;
}

// CLI mode
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.length === 0 || args.includes('--help')) {
        console.log(`
Handoff Validation Tool

Usage:
  node validate-handoff.js <handoff.json>
  node validate-handoff.js --inline '<json-string>'

Options:
  --help      Show this help message
  --format    Output format: json (default), markdown, text
  --inline    Validate JSON string directly
        `);
        process.exit(0);
    }

    let handoffData;
    let formatType = 'text';

    // Parse arguments
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--format' && args[i + 1]) {
            formatType = args[i + 1];
            i++;
        } else if (args[i] === '--inline' && args[i + 1]) {
            try {
                handoffData = JSON.parse(args[i + 1]);
            } catch (err) {
                console.error(`Invalid JSON: ${err.message}`);
                process.exit(1);
            }
            i++;
        } else if (!args[i].startsWith('--')) {
            // File path
            try {
                const content = fs.readFileSync(args[i], 'utf8');
                handoffData = JSON.parse(content);
            } catch (err) {
                console.error(`Failed to read file: ${err.message}`);
                process.exit(1);
            }
        }
    }

    if (!handoffData) {
        console.error('No handoff data provided');
        process.exit(1);
    }

    // Validate
    const result = validateHandoff(handoffData);

    // Output based on format
    switch (formatType) {
        case 'json':
            console.log(JSON.stringify(result, null, 2));
            break;
        case 'markdown':
            console.log(formatResultAsMarkdown(result, handoffData));
            break;
        default:
            if (result.valid) {
                console.log('\n==============================================');
                console.log('  HANDOFF VALIDATION PASSED');
                console.log('==============================================\n');
                console.log(`Agent: ${handoffData.handoff?.agent || 'Unknown'}`);
                console.log(`Status: ${handoffData.handoff?.status || 'Unknown'}`);
                console.log(`Next Agent: ${handoffData.next_agent || 'None'}`);
            } else {
                console.log('\n==============================================');
                console.log('  HANDOFF VALIDATION FAILED');
                console.log('==============================================\n');
                console.log(formatErrors(result.errors));
            }
    }

    process.exit(result.valid ? 0 : 1);
}

// Exports for programmatic use
module.exports = {
    validateHandoff,
    validateSemantics,
    formatErrors,
    formatResultAsMarkdown,
    JSONSchemaValidator
};
