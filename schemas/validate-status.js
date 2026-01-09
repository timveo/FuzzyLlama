#!/usr/bin/env node

/**
 * STATUS.md JSON Schema Validator
 * 
 * Usage:
 *   node validate-status.js <path-to-status.json>
 *   node validate-status.js ../my-project/docs/STATUS.md
 * 
 * Install dependencies:
 *   npm install ajv ajv-formats
 */

const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const fs = require('fs');
const path = require('path');

// Load schemas
const statusSchema = require('./status.schema.json');
const handoffSchema = require('./handoff.schema.json');

// Initialize validator
const ajv = new Ajv({ allErrors: true, verbose: true });
addFormats(ajv);

// Add schemas
ajv.addSchema(handoffSchema, 'handoff');
const validateStatus = ajv.compile(statusSchema);

/**
 * Extract JSON from markdown file
 * Looks for ```json ... ``` blocks or raw JSON
 */
function extractJson(content) {
  // Try to find JSON code block
  const codeBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }
  
  // Try to parse as raw JSON
  const trimmed = content.trim();
  if (trimmed.startsWith('{')) {
    return trimmed;
  }
  
  throw new Error('No JSON found in file. Expected ```json block or raw JSON.');
}

/**
 * Format validation errors for display
 */
function formatErrors(errors) {
  return errors.map(err => {
    const path = err.instancePath || '(root)';
    const message = err.message;
    const params = JSON.stringify(err.params);
    return `  - ${path}: ${message} (${params})`;
  }).join('\n');
}

/**
 * Validate a STATUS.md file
 */
function validateFile(filePath) {
  console.log(`\nValidating: ${filePath}\n`);
  
  // Read file
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    console.error(`❌ Error reading file: ${err.message}`);
    return false;
  }
  
  // Extract JSON
  let jsonStr;
  try {
    jsonStr = extractJson(content);
  } catch (err) {
    console.error(`❌ ${err.message}`);
    return false;
  }
  
  // Parse JSON
  let data;
  try {
    data = JSON.parse(jsonStr);
  } catch (err) {
    console.error(`❌ Invalid JSON: ${err.message}`);
    return false;
  }
  
  // Validate against schema
  const valid = validateStatus(data);
  
  if (valid) {
    console.log('✅ STATUS.md is valid!\n');
    
    // Print summary
    console.log('Summary:');
    console.log(`  Project: ${data.project?.name || 'Unknown'}`);
    console.log(`  Phase: ${data.current_phase}`);
    console.log(`  Agent: ${data.current_agent}`);
    console.log(`  Last Updated: ${data.last_updated}`);
    
    if (data.blockers?.length > 0) {
      console.log(`\n⚠️  Active Blockers: ${data.blockers.length}`);
      data.blockers.forEach(b => {
        console.log(`    - [${b.severity}] ${b.id}: ${b.description}`);
      });
    }
    
    if (data.next_actions?.length > 0) {
      console.log(`\n📋 Next Actions: ${data.next_actions.length}`);
      data.next_actions.slice(0, 3).forEach(a => {
        console.log(`    - [${a.priority}] ${a.action} (${a.owner})`);
      });
    }
    
    return true;
  } else {
    console.error('❌ Validation failed!\n');
    console.error('Errors:');
    console.error(formatErrors(validateStatus.errors));
    return false;
  }
}

/**
 * Validate a handoff JSON
 */
function validateHandoff(data) {
  const validateHandoffSchema = ajv.compile(handoffSchema);
  const valid = validateHandoffSchema(data);
  
  if (!valid) {
    console.error('Handoff validation errors:');
    console.error(formatErrors(validateHandoffSchema.errors));
  }
  
  return valid;
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node validate-status.js <path-to-status-file>');
    console.log('       node validate-status.js --handoff <json-string>');
    process.exit(1);
  }
  
  if (args[0] === '--handoff') {
    // Validate handoff JSON from command line
    try {
      const data = JSON.parse(args[1]);
      const valid = validateHandoff(data);
      process.exit(valid ? 0 : 1);
    } catch (err) {
      console.error(`Invalid JSON: ${err.message}`);
      process.exit(1);
    }
  } else {
    // Validate file
    const filePath = path.resolve(args[0]);
    const valid = validateFile(filePath);
    process.exit(valid ? 0 : 1);
  }
}

module.exports = { validateFile, validateHandoff, extractJson };
