/**
 * Onboarding MCP Tools
 *
 * Tools for tracking and enforcing the mandatory startup protocol.
 * These tools ensure that the 5 onboarding questions are asked
 * and that proper gates are approved before code generation.
 */

import { getStore, OnboardingState, OnboardingQuestion, UserExperienceLevel, TaskType, GateId, TeachingMoment } from '../state/truth-store.js';

// ============================================================
// Tool Input Types
// ============================================================

export interface DisplayStartupMessageInput {
  project_path: string;
}

export interface StartOnboardingInput {
  project_path: string;
}

export interface AnswerOnboardingQuestionInput {
  project_path: string;
  question_id: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'Q5';
  answer: string;
}

export interface GetOnboardingInput {
  project_path: string;
}

export interface CheckCanGenerateCodeInput {
  project_path: string;
}

export interface CheckCanCreateTaskInput {
  project_path: string;
  task_type: TaskType;
}

export interface LogProtocolViolationInput {
  project_path: string;
  violation_type: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  context?: Record<string, unknown>;
}

export interface GenerateSummaryReportInput {
  project_path: string;
}

export interface GetEnforcementStatusInput {
  project_path: string;
}

// ============================================================
// Tool Implementations
// ============================================================

export function displayStartupMessage(input: DisplayStartupMessageInput): { success: boolean; message: string } {
  const store = getStore(input.project_path);
  store.displayStartupMessage();
  return {
    success: true,
    message: 'Startup message marked as displayed. Onboarding can now begin.'
  };
}

export function startOnboarding(input: StartOnboardingInput): OnboardingState {
  const store = getStore(input.project_path);
  return store.startOnboarding();
}

export function answerOnboardingQuestion(input: AnswerOnboardingQuestionInput): OnboardingState {
  const store = getStore(input.project_path);
  return store.answerOnboardingQuestion(input.question_id, input.answer);
}

export function getOnboarding(input: GetOnboardingInput): OnboardingState | { not_started: true; message: string } {
  const store = getStore(input.project_path);
  const onboarding = store.getOnboarding();
  if (!onboarding) {
    return {
      not_started: true,
      message: 'Onboarding has not been initialized. Call display_startup_message first.'
    };
  }
  return onboarding;
}

export function getUnansweredQuestions(input: GetOnboardingInput): {
  questions: OnboardingQuestion[];
  all_answered: boolean;
  message: string;
} {
  const store = getStore(input.project_path);
  const unanswered = store.getUnansweredQuestions();
  return {
    questions: unanswered,
    all_answered: unanswered.length === 0,
    message: unanswered.length === 0
      ? 'All onboarding questions have been answered!'
      : `${unanswered.length} questions remaining: ${unanswered.map(q => q.question_id).join(', ')}`
  };
}

export function checkCanGenerateCode(input: CheckCanGenerateCodeInput): {
  allowed: boolean;
  reason?: string;
  violations: string[];
  next_step?: string;
} {
  const store = getStore(input.project_path);
  const result = store.canGenerateCode();

  let nextStep: string | undefined;
  if (!result.allowed) {
    // Determine the most important next step
    if (result.violations.includes('Startup message not displayed')) {
      nextStep = 'Call display_startup_message to show the startup message';
    } else if (result.violations.some(v => v.includes('Onboarding'))) {
      nextStep = 'Complete all 5 onboarding questions before generating code';
    } else if (result.violations.some(v => v.includes('G1'))) {
      nextStep = 'Get G1 (Scope) approval from the user';
    } else if (result.violations.some(v => v.includes('G2'))) {
      nextStep = 'Get G2 (PRD) approval from the user';
    } else if (result.violations.some(v => v.includes('G3'))) {
      nextStep = 'Get G3 (Architecture) approval from the user';
    }
  }

  return { ...result, next_step: nextStep };
}

export function checkCanCreateTask(input: CheckCanCreateTaskInput): {
  allowed: boolean;
  reason?: string;
  violations: string[];
  task_type: TaskType;
} {
  const store = getStore(input.project_path);
  const result = store.canCreateTask(input.task_type);
  return { ...result, task_type: input.task_type };
}

export function logProtocolViolation(input: LogProtocolViolationInput): { logged: boolean; message: string } {
  const store = getStore(input.project_path);
  store.logProtocolViolation(
    input.violation_type,
    input.description,
    input.severity,
    input.context
  );
  return {
    logged: true,
    message: `Protocol violation logged: ${input.violation_type} (${input.severity})`
  };
}

export function generateSummaryReport(input: GenerateSummaryReportInput): ReturnType<typeof import('../state/truth-store.js').TruthStore.prototype.generateSummaryReport> {
  const store = getStore(input.project_path);
  return store.generateSummaryReport();
}

export function getEnforcementStatus(input: GetEnforcementStatusInput): {
  startup_displayed: boolean;
  onboarding_started: boolean;
  onboarding_completed: boolean;
  questions_answered: number;
  questions_remaining: string[];
  user_experience_level?: UserExperienceLevel;
  gates: {
    G1: string;
    G2: string;
    G3: string;
  };
  can_generate_code: boolean;
  blockers: string[];
  teaching_moments?: {
    delivered: number;
    target: number;
    remaining: number;
    progress_percent: number;
    meets_target: boolean;
  };
} {
  const store = getStore(input.project_path);
  const onboarding = store.getOnboarding();
  const gates = store.getGates();
  const codeCheck = store.canGenerateCode();
  const unanswered = store.getUnansweredQuestions();

  // Get teaching moment status for NOVICE/INTERMEDIATE users
  const level = onboarding?.user_experience_level;
  let teachingMoments: {
    delivered: number;
    target: number;
    remaining: number;
    progress_percent: number;
    meets_target: boolean;
  } | undefined;

  if (level === 'novice' || level === 'intermediate') {
    const status = store.getTeachingMomentsStatus();
    teachingMoments = {
      delivered: status.delivered,
      target: status.target,
      remaining: status.remaining,
      progress_percent: status.progress_percent,
      meets_target: status.meets_target
    };
  }

  return {
    startup_displayed: onboarding?.startup_message_displayed ?? false,
    onboarding_started: onboarding?.started ?? false,
    onboarding_completed: onboarding?.completed ?? false,
    questions_answered: 5 - unanswered.length,
    questions_remaining: unanswered.map(q => q.question_id),
    user_experience_level: onboarding?.user_experience_level,
    gates: {
      G1: gates.G1?.status ?? 'pending',
      G2: gates.G2?.status ?? 'pending',
      G3: gates.G3?.status ?? 'pending'
    },
    can_generate_code: codeCheck.allowed,
    blockers: codeCheck.violations,
    teaching_moments: teachingMoments
  };
}

// ============================================================
// Teaching Level & Communication Tools
// ============================================================

export interface GetTeachingLevelInput {
  project_path: string;
}

export interface TeachingLevelOutput {
  level: UserExperienceLevel;
  communication_style: string;
  teaching_frequency: string;
  terminology: string;
}

export function getTeachingLevel(input: GetTeachingLevelInput): TeachingLevelOutput {
  const store = getStore(input.project_path);
  const onboarding = store.getOnboarding();
  const level = onboarding?.user_experience_level ?? 'intermediate';

  const styles: Record<UserExperienceLevel, TeachingLevelOutput> = {
    novice: {
      level: 'novice',
      communication_style: 'Full explanations, define all terms, use analogies, suggest defaults',
      teaching_frequency: '10-15 teaching moments per project',
      terminology: 'Plain English only, define all technical terms inline'
    },
    intermediate: {
      level: 'intermediate',
      communication_style: 'Explain key decisions, offer options with trade-offs, define advanced terms',
      teaching_frequency: '5-8 teaching moments per project',
      terminology: 'Basic programming terms OK, define advanced concepts'
    },
    expert: {
      level: 'expert',
      communication_style: 'Concise, focus on trade-offs only, respect their time',
      teaching_frequency: '0-2 teaching moments per project (only when asked)',
      terminology: 'Technical terminology freely, no explanations unless requested'
    }
  };

  return styles[level];
}

export interface GetCommunicationTemplateInput {
  project_path: string;
  template_type: 'gate_presentation' | 'progress_update' | 'teaching_moment' | 'error_communication' | 'agent_introduction';
  context?: string;
}

export interface CommunicationTemplate {
  level: UserExperienceLevel;
  template_type: string;
  guidelines: string[];
  example_format: string;
}

export function getCommunicationTemplate(input: GetCommunicationTemplateInput): CommunicationTemplate {
  const store = getStore(input.project_path);
  const onboarding = store.getOnboarding();
  const level = onboarding?.user_experience_level ?? 'intermediate';

  const templates: Record<UserExperienceLevel, Record<string, CommunicationTemplate>> = {
    novice: {
      gate_presentation: {
        level: 'novice',
        template_type: 'gate_presentation',
        guidelines: [
          'Start with plain English summary of what this gate means',
          'Explain WHY this approval matters',
          'Use analogies to familiar concepts',
          'Provide visual diagrams where helpful',
          'Offer clear options with recommendations',
          'Include "Teaching Moment" section if relevant'
        ],
        example_format: '## {Gate Name} - {Plain English Title}\n\n{Explanation in everyday terms}\n\n### What You\'re Approving\n{List in plain English}\n\n### Why This Matters\n{Real-world impact}\n\n### Your Options\n- ✅ **Approve** - {What happens}\n- 🔄 **Change** - {What happens}\n- ❓ **Questions** - Ask anything!'
      },
      progress_update: {
        level: 'novice',
        template_type: 'progress_update',
        guidelines: [
          'Explain what is being built in plain terms',
          'Use checkboxes to show completed vs remaining',
          'Include percentage or fraction complete',
          'Offer to show preview if available',
          'End with encouragement'
        ],
        example_format: '### 📊 Progress Update\n\n**What\'s Happening:** {Plain description}\n\n**Completed:**\n- ✅ {Item 1} - {What it does}\n- ✅ {Item 2}\n\n**In Progress:**\n- 🔨 {Current item}\n\n**Coming Up:**\n- {Next items}\n\nEverything is on track! Want to see a preview?'
      },
      teaching_moment: {
        level: 'novice',
        template_type: 'teaching_moment',
        guidelines: [
          'Always include teaching moments for key decisions',
          'Use "What this means:" format',
          'Provide real-world analogies',
          'Keep it brief but educational',
          'Offer to explain more'
        ],
        example_format: '### 💡 Learning Moment: {Topic}\n\n**What\'s happening:** {Plain explanation}\n\n**Why this matters:** {Real benefit}\n\n**Analogy:** {Familiar comparison}\n\nWant to know more? Just ask!'
      },
      error_communication: {
        level: 'novice',
        template_type: 'error_communication',
        guidelines: [
          'Start with reassurance',
          'Explain what happened in plain terms',
          'Be clear about impact and resolution',
          'Never use raw error messages without explanation'
        ],
        example_format: '### ⚠️ We Hit a Bump\n\n**Don\'t worry!** This is normal in software development.\n\n**What happened:** {Plain explanation}\n\n**What I\'m doing:** {Resolution steps}\n\n**What you need to do:** {User action or "Nothing - I\'ve got this!"}'
      },
      agent_introduction: {
        level: 'novice',
        template_type: 'agent_introduction',
        guidelines: [
          'Introduce yourself warmly',
          'Explain your role in simple terms',
          'List what you will deliver',
          'Explain what approval you need',
          'Set expectations clearly'
        ],
        example_format: '## {Emoji} {Agent Name} Here!\n\n{Warm 1-2 sentence intro in plain terms}\n\n### What I\'ll Do\n- {Deliverable 1}\n- {Deliverable 2}\n\n### What You\'ll Decide\n{What approval is needed}\n\n### How Long This Takes\n{Scope indicator}\n\nLet\'s get started!'
      }
    },
    intermediate: {
      gate_presentation: {
        level: 'intermediate',
        template_type: 'gate_presentation',
        guidelines: [
          'Provide technical summary with context',
          'Include trade-offs and alternatives considered',
          'Link to full documentation',
          'Clear approval options'
        ],
        example_format: '## G{N}: {Gate Name}\n\n### Summary\n{Technical description}\n\n### Key Decisions\n| Decision | Choice | Rationale |\n\n### Artifacts\n- {Links to docs}\n\n**Approve?**'
      },
      progress_update: {
        level: 'intermediate',
        template_type: 'progress_update',
        guidelines: [
          'Show completion percentage and counts',
          'Include build/test status',
          'Brief, scannable format'
        ],
        example_format: '### Progress: {Phase} ({X}% complete)\n\n**Completed:** {List}\n**In Progress:** {Current}\n**Remaining:** {Count}\n\n**Build:** ✅ Passing'
      },
      teaching_moment: {
        level: 'intermediate',
        template_type: 'teaching_moment',
        guidelines: [
          'Include for advanced or unusual patterns only',
          'Focus on trade-offs and key considerations',
          'Keep brief'
        ],
        example_format: '### 💡 Note: {Topic}\n\n{Technical explanation with trade-offs}\n\n**Key consideration:** {Detail}'
      },
      error_communication: {
        level: 'intermediate',
        template_type: 'error_communication',
        guidelines: [
          'Include error message',
          'Technical cause and resolution',
          'ETA for fix'
        ],
        example_format: '### ⚠️ Issue: {Brief}\n\n**Error:** `{message}`\n**Cause:** {Technical cause}\n**Resolution:** {What we\'re doing}\n**ETA:** {Estimate}'
      },
      agent_introduction: {
        level: 'intermediate',
        template_type: 'agent_introduction',
        guidelines: [
          'Brief role description',
          'Key deliverables and artifacts',
          'Gate requirements'
        ],
        example_format: '## {Emoji} {Agent Name}\n\n{Technical role description}\n\n### Deliverables\n- {Artifact 1}\n- {Artifact 2}\n\n### Gate {N}\n{Approval requirements}'
      }
    },
    expert: {
      gate_presentation: {
        level: 'expert',
        template_type: 'gate_presentation',
        guidelines: [
          'Minimal, scannable format',
          'Key facts only',
          'Links to details'
        ],
        example_format: '## G{N}: {Name}\n\n**{Key info}** | **{Key info}**\n\n📄 {Link}\n\n**Approve?**'
      },
      progress_update: {
        level: 'expert',
        template_type: 'progress_update',
        guidelines: [
          'One-line status',
          'Build status indicator'
        ],
        example_format: '### Progress: {X}/{Y} complete\n\n{Current task} | Build: ✅'
      },
      teaching_moment: {
        level: 'expert',
        template_type: 'teaching_moment',
        guidelines: [
          'Only if unusual or specifically relevant',
          'One line'
        ],
        example_format: '**Note:** {One-line technical note}'
      },
      error_communication: {
        level: 'expert',
        template_type: 'error_communication',
        guidelines: [
          'Error type and brief description',
          'Resolution approach'
        ],
        example_format: '### ⚠️ {Error type}: {Brief}\n\n`{Error}`\n\nResolving via {approach}.'
      },
      agent_introduction: {
        level: 'expert',
        template_type: 'agent_introduction',
        guidelines: [
          'One line role',
          'Deliverables list',
          'Gate requirement'
        ],
        example_format: '## {Agent}\n\n{One-line scope}\n\n**Deliverables:** {List}\n**Gate:** G{N}'
      }
    }
  };

  return templates[level][input.template_type];
}

export interface LogProgressUpdateInput {
  project_path: string;
  phase: string;
  agent: string;
  status: 'starting' | 'in_progress' | 'checkpoint' | 'completed' | 'blocked';
  message: string;
  details?: Record<string, unknown>;
}

export interface ProgressUpdate {
  timestamp: string;
  phase: string;
  agent: string;
  status: string;
  message: string;
  details?: Record<string, unknown>;
}

// In-memory progress log (would be persisted in production)
const progressLogs: Map<string, ProgressUpdate[]> = new Map();

// ============================================================
// Communication Compliance Enforcement
// ============================================================

/**
 * COMMUNICATION PROTOCOL ENFORCEMENT
 *
 * All agents MUST check teaching level before any user-facing communication.
 * This ensures users receive appropriately adapted content based on their
 * experience level (NOVICE, INTERMEDIATE, EXPERT).
 *
 * ENFORCEMENT MECHANISM:
 * 1. Agents call `check_communication_compliance` BEFORE any user output
 * 2. This registers a "communication session" and checks teaching level
 * 3. If teaching level was not checked, a warning is logged
 * 4. Communication history tracks whether protocols were followed
 */

// Local communication session type (in-memory legacy tracking)
// Note: Persistent tracking is now in truth-store.ts as CommunicationSession
interface LocalCommunicationSession {
  session_id: string;
  timestamp: string;
  agent: string;
  communication_type: 'gate_presentation' | 'progress_update' | 'teaching_moment' | 'error_communication' | 'agent_introduction' | 'general';
  teaching_level_checked: boolean;
  teaching_level?: UserExperienceLevel;
  compliant: boolean;
  violation_reason?: string;
}

// In-memory communication session tracking (legacy - use truth store for persistence)
const communicationSessions: Map<string, LocalCommunicationSession[]> = new Map();
const teachingLevelCheckTimestamps: Map<string, number> = new Map();

// Teaching level check is valid for 5 minutes
const TEACHING_LEVEL_CHECK_TTL_MS = 5 * 60 * 1000;

export interface CheckCommunicationComplianceInput {
  project_path: string;
  agent: string;
  communication_type: 'gate_presentation' | 'progress_update' | 'teaching_moment' | 'error_communication' | 'agent_introduction' | 'general';
}

export interface CommunicationComplianceResult {
  compliant: boolean;
  teaching_level: UserExperienceLevel;
  session_id: string;
  guidelines: string[];
  warning?: string;
  violation_logged?: boolean;
}

export function checkCommunicationCompliance(input: CheckCommunicationComplianceInput): CommunicationComplianceResult {
  const store = getStore(input.project_path);
  const onboarding = store.getOnboarding();
  const teachingLevel = onboarding?.user_experience_level ?? 'intermediate';

  // Check if teaching level was recently checked
  // Use persisted timestamp from truth store, fallback to in-memory for backwards compat
  const persistedLastCheck = store.getTeachingLevelCheckTimestamp();
  const inMemoryLastCheck = teachingLevelCheckTimestamps.get(input.project_path);
  const now = Date.now();

  let recentlyChecked = false;
  if (persistedLastCheck) {
    const persistedTime = new Date(persistedLastCheck).getTime();
    recentlyChecked = (now - persistedTime) < TEACHING_LEVEL_CHECK_TTL_MS;
  } else if (inMemoryLastCheck) {
    recentlyChecked = (now - inMemoryLastCheck) < TEACHING_LEVEL_CHECK_TTL_MS;
  }

  // Update both timestamps (persisted and in-memory)
  store.updateTeachingLevelCheckTimestamp();
  teachingLevelCheckTimestamps.set(input.project_path, now);

  // Create session record
  const sessionId = `comm_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  const session: LocalCommunicationSession = {
    session_id: sessionId,
    timestamp: new Date().toISOString(),
    agent: input.agent,
    communication_type: input.communication_type,
    teaching_level_checked: true, // They're checking now
    teaching_level: teachingLevel,
    compliant: true
  };

  // Store session in legacy in-memory map (for backwards compatibility)
  const sessions = communicationSessions.get(input.project_path) || [];
  sessions.push(session);
  communicationSessions.set(input.project_path, sessions);

  // ALSO persist to truth store for gate approval enforcement
  store.recordCommunicationSession({
    agent: input.agent,
    communication_type: input.communication_type,
    teaching_level_checked: true,
    teaching_level: teachingLevel,
    compliant: true
  });

  // Get guidelines based on teaching level and communication type
  const guidelines = getGuidelinesForLevel(teachingLevel, input.communication_type);

  return {
    compliant: true,
    teaching_level: teachingLevel,
    session_id: sessionId,
    guidelines,
    warning: recentlyChecked ? undefined : 'Teaching level check was not cached. Remember to check before each communication.'
  };
}

function getGuidelinesForLevel(level: UserExperienceLevel, type: string): string[] {
  const allGuidelines: Record<UserExperienceLevel, Record<string, string[]>> = {
    novice: {
      gate_presentation: [
        'Start with plain English summary of what this gate means',
        'Explain WHY this approval matters',
        'Use analogies to familiar concepts',
        'Provide visual diagrams where helpful',
        'Offer clear options with recommendations',
        'Include "Teaching Moment" section if relevant'
      ],
      progress_update: [
        'Explain what is being built in plain terms',
        'Use checkboxes to show completed vs remaining',
        'Include percentage or fraction complete',
        'Offer to show preview if available',
        'End with encouragement'
      ],
      agent_introduction: [
        'Introduce yourself warmly',
        'Explain your role in simple terms',
        'List what you will deliver',
        'Explain what approval you need',
        'Set expectations clearly'
      ],
      error_communication: [
        'Start with reassurance',
        'Explain what happened in plain terms',
        'Be clear about impact and resolution',
        'Never use raw error messages without explanation'
      ],
      teaching_moment: [
        'Always include teaching moments for key decisions',
        'Use "What this means:" format',
        'Provide real-world analogies',
        'Keep it brief but educational',
        'Offer to explain more'
      ],
      general: [
        'Use plain English - no jargon',
        'Define any technical terms inline',
        'Provide context and explanations',
        'Be patient and encouraging'
      ]
    },
    intermediate: {
      gate_presentation: [
        'Provide technical summary with context',
        'Include trade-offs and alternatives considered',
        'Link to full documentation',
        'Clear approval options'
      ],
      progress_update: [
        'Show completion percentage and counts',
        'Include build/test status',
        'Brief, scannable format'
      ],
      agent_introduction: [
        'Brief role description',
        'Key deliverables and artifacts',
        'Gate requirements'
      ],
      error_communication: [
        'Include error message',
        'Technical cause and resolution',
        'ETA for fix'
      ],
      teaching_moment: [
        'Include for advanced or unusual patterns only',
        'Focus on trade-offs and key considerations',
        'Keep brief'
      ],
      general: [
        'Technical terminology OK for basics',
        'Explain advanced concepts',
        'Focus on trade-offs and options'
      ]
    },
    expert: {
      gate_presentation: [
        'Minimal, scannable format',
        'Key facts only',
        'Links to details'
      ],
      progress_update: [
        'One-line status',
        'Build status indicator'
      ],
      agent_introduction: [
        'One line role',
        'Deliverables list',
        'Gate requirement'
      ],
      error_communication: [
        'Error type and brief description',
        'Resolution approach'
      ],
      teaching_moment: [
        'Only if unusual or specifically relevant',
        'One line'
      ],
      general: [
        'Be concise - respect their time',
        'Technical terminology freely',
        'Skip explanations unless asked'
      ]
    }
  };

  return allGuidelines[level][type] || allGuidelines[level].general;
}

export interface GetCommunicationHistoryInput {
  project_path: string;
  limit?: number;
}

export interface CommunicationHistoryOutput {
  sessions: LocalCommunicationSession[];
  total: number;
  compliance_rate: number;
  violations: number;
}

export function getCommunicationHistory(input: GetCommunicationHistoryInput): CommunicationHistoryOutput {
  const sessions = communicationSessions.get(input.project_path) || [];
  const limit = input.limit ?? 20;

  const recentSessions = sessions.slice(-limit);
  const compliantCount = sessions.filter(s => s.compliant).length;
  const complianceRate = sessions.length > 0 ? (compliantCount / sessions.length) * 100 : 100;
  const violations = sessions.filter(s => !s.compliant).length;

  return {
    sessions: recentSessions,
    total: sessions.length,
    compliance_rate: Math.round(complianceRate),
    violations
  };
}

export interface ValidateCommunicationOutputInput {
  project_path: string;
  session_id: string;
  output_preview: string;
  agent: string;
}

export interface CommunicationValidationResult {
  valid: boolean;
  teaching_level: UserExperienceLevel;
  issues: string[];
  suggestions: string[];
}

export function validateCommunicationOutput(input: ValidateCommunicationOutputInput): CommunicationValidationResult {
  const store = getStore(input.project_path);
  const onboarding = store.getOnboarding();
  const teachingLevel = onboarding?.user_experience_level ?? 'intermediate';

  const issues: string[] = [];
  const suggestions: string[] = [];
  const outputLower = input.output_preview.toLowerCase();

  // Check for level-appropriate communication
  if (teachingLevel === 'novice') {
    // Check for unexplained jargon
    const jargonTerms = ['api', 'sdk', 'cli', 'crud', 'rest', 'graphql', 'orm', 'middleware', 'endpoint', 'schema', 'prisma', 'zod'];
    for (const term of jargonTerms) {
      // Check if term exists without explanation nearby
      if (outputLower.includes(term) && !outputLower.includes(`${term} (`) && !outputLower.includes(`${term} -`) && !outputLower.includes(`"${term}"`)) {
        // Allow if it appears with explanation words nearby
        const termIndex = outputLower.indexOf(term);
        const surroundingText = outputLower.slice(Math.max(0, termIndex - 50), termIndex + 100);
        if (!surroundingText.includes('means') && !surroundingText.includes('which is') && !surroundingText.includes('called')) {
          issues.push(`Technical term "${term}" used without explanation for NOVICE user`);
        }
      }
    }

    // Check for lack of analogies/explanations in longer outputs
    if (input.output_preview.length > 200 && !outputLower.includes('like') && !outputLower.includes('think of') && !outputLower.includes('imagine')) {
      suggestions.push('Consider adding analogies to help NOVICE users understand');
    }

    // Check for encouragement
    if (!outputLower.includes('!') && !outputLower.includes('great') && !outputLower.includes('perfect') && !outputLower.includes('progress')) {
      suggestions.push('Consider adding encouragement for NOVICE user');
    }
  }

  if (teachingLevel === 'expert') {
    // Check for excessive explanation
    const wordCount = input.output_preview.split(/\s+/).length;
    if (wordCount > 200) {
      suggestions.push('Output may be too verbose for EXPERT user - consider being more concise');
    }

    // Check for unnecessary explanations
    if (outputLower.includes('this means') || outputLower.includes('in other words') || outputLower.includes('to explain')) {
      suggestions.push('EXPERT users typically don\'t need detailed explanations unless requested');
    }
  }

  // Update session with validation results
  const sessions = communicationSessions.get(input.project_path) || [];
  const session = sessions.find(s => s.session_id === input.session_id);
  if (session && issues.length > 0) {
    session.compliant = false;
    session.violation_reason = issues.join('; ');
  }

  return {
    valid: issues.length === 0,
    teaching_level: teachingLevel,
    issues,
    suggestions
  };
}

export function logProgressUpdate(input: LogProgressUpdateInput): { logged: boolean; update: ProgressUpdate } {
  const store = getStore(input.project_path);

  const update: ProgressUpdate = {
    timestamp: new Date().toISOString(),
    phase: input.phase,
    agent: input.agent,
    status: input.status,
    message: input.message,
    details: input.details
  };

  // Store in legacy in-memory map (for backwards compatibility)
  const logs = progressLogs.get(input.project_path) || [];
  logs.push(update);
  progressLogs.set(input.project_path, logs);

  // ALSO persist to truth store for gate approval enforcement
  store.recordProgressLog({
    phase: input.phase,
    agent: input.agent,
    status: input.status as 'starting' | 'in_progress' | 'checkpoint' | 'completed' | 'blocked',
    message: input.message,
    details: input.details
  });

  return { logged: true, update };
}

export interface GetProgressHistoryInput {
  project_path: string;
  limit?: number;
}

export function getProgressHistory(input: GetProgressHistoryInput): {
  updates: ProgressUpdate[];
  total: number;
} {
  const logs = progressLogs.get(input.project_path) || [];
  const limit = input.limit ?? 10;

  return {
    updates: logs.slice(-limit),
    total: logs.length
  };
}

// ============================================================
// Teaching Moment Tracking Handlers
// ============================================================

export interface RecordTeachingMomentInput {
  project_path: string;
  gate: GateId;
  agent: string;
  topic: string;
  explanation: string;
  why_it_matters: string;
}

export interface RecordTeachingMomentOutput {
  moment_id: string;
  topic: string;
  delivered_count: number;
  target_count: number;
  remaining: number;
}

export function recordTeachingMoment(input: RecordTeachingMomentInput): RecordTeachingMomentOutput {
  const store = getStore(input.project_path);
  const onboarding = store.getOnboarding();
  const level = onboarding?.user_experience_level ?? 'intermediate';

  // Set target if not already set
  const currentTarget = onboarding?.teaching_moments_target;
  if (currentTarget === undefined) {
    store.setTeachingMomentsTarget(level);
  }

  const moment = store.recordTeachingMoment({
    gate: input.gate,
    agent: input.agent,
    topic: input.topic,
    explanation: input.explanation,
    why_it_matters: input.why_it_matters,
    user_asked_followup: false,
    teaching_level: level
  });

  const status = store.getTeachingMomentsStatus();

  return {
    moment_id: moment.id,
    topic: input.topic,
    delivered_count: status.delivered,
    target_count: status.target,
    remaining: status.remaining
  };
}

export interface RecordTeachingMomentFollowupInput {
  project_path: string;
  moment_id: string;
  followup_provided: string;
}

export function recordTeachingMomentFollowup(input: RecordTeachingMomentFollowupInput): { success: boolean; moment_id: string } {
  const store = getStore(input.project_path);
  const success = store.recordTeachingMomentFollowup(input.moment_id, input.followup_provided);

  return {
    success,
    moment_id: input.moment_id
  };
}

export interface GetTeachingMomentsStatusInput {
  project_path: string;
}

export interface GetTeachingMomentsStatusOutput {
  delivered: number;
  target: number;
  remaining: number;
  progress_percent: number;
  meets_target: boolean;
  moments: TeachingMoment[];
}

export function getTeachingMomentsStatus(input: GetTeachingMomentsStatusInput): GetTeachingMomentsStatusOutput {
  const store = getStore(input.project_path);
  return store.getTeachingMomentsStatus();
}

export interface CheckTeachingQuotaForGateInput {
  project_path: string;
  gate: GateId;
}

export interface CheckTeachingQuotaForGateOutput {
  met: boolean;
  delivered: number;
  expected: number;
  message: string;
}

export function checkTeachingQuotaForGate(input: CheckTeachingQuotaForGateInput): CheckTeachingQuotaForGateOutput {
  const store = getStore(input.project_path);
  const result = store.checkTeachingMomentQuotaForGate(input.gate);

  let message: string;
  if (result.met) {
    message = `Teaching quota met for ${input.gate}: ${result.delivered}/${result.expected} moments delivered.`;
  } else {
    message = `Teaching quota NOT met for ${input.gate}: ${result.delivered}/${result.expected} moments delivered. Consider adding ${result.expected - result.delivered} more teaching moment(s).`;
  }

  return {
    met: result.met,
    delivered: result.delivered,
    expected: result.expected,
    message
  };
}

// ============================================================
// Tool Definitions for MCP
// ============================================================

export const onboardingTools = {
  display_startup_message: {
    name: 'display_startup_message',
    description: `MANDATORY FIRST STEP: Mark that startup message was displayed to user.

WHEN TO USE: Call IMMEDIATELY at project start. This is the FIRST tool call for ANY new project.

ENFORCEMENT: This tool is REQUIRED before:
- start_onboarding can be called
- Any onboarding questions can be answered
- Any code generation can occur

RETURNS: { success: true, message: 'Startup message marked as displayed' }

IMPORTANT: The startup message informs users about the multi-agent system. Display it BEFORE calling this tool.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_path: {
          type: 'string',
          description: 'Absolute path to the project directory. Example: /Users/dev/my-app'
        }
      },
      required: ['project_path']
    }
  },

  start_onboarding: {
    name: 'start_onboarding',
    description: `Initialize the onboarding process. Call AFTER display_startup_message.

WHEN TO USE: After confirming startup message was displayed, before asking onboarding questions.

ONBOARDING FLOW:
1. display_startup_message (done)
2. start_onboarding ← YOU ARE HERE
3. Ask Q1-Q5 and record with answer_onboarding_question
4. Complete onboarding enables G1 scope approval

RETURNS: OnboardingState with questions array and completion status.

IMPORTANT: All 5 questions must be answered before code generation is allowed.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_path: {
          type: 'string',
          description: 'Absolute path to the project directory'
        }
      },
      required: ['project_path']
    }
  },

  answer_onboarding_question: {
    name: 'answer_onboarding_question',
    description: `Record user's answer to an onboarding question. All 5 questions MUST be answered.

THE 5 MANDATORY QUESTIONS:
- Q1: "What are you building?" - Core project description
- Q2: "Any existing code?" - Greenfield vs brownfield context
- Q3: "Technical background?" - Sets teaching level (novice/intermediate/expert)
- Q4: "When is it done?" - Success criteria and scope
- Q5: "Any constraints?" - Budget, timeline, technology limits

RETURNS: Updated OnboardingState with answer recorded.

Q3 SPECIAL HANDLING: Answer determines user_experience_level which affects ALL future communication:
- "new to coding" → novice (full explanations, analogies)
- "some experience" → intermediate (balanced detail)
- "senior developer" → expert (concise, technical)

IMPORTANT: Record EXACT user answers. These inform project planning.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_path: {
          type: 'string',
          description: 'Absolute path to the project directory'
        },
        question_id: {
          type: 'string',
          enum: ['Q1', 'Q2', 'Q3', 'Q4', 'Q5'],
          description: 'Question ID. Must answer all 5.'
        },
        answer: {
          type: 'string',
          description: 'User\'s verbatim answer to the question'
        }
      },
      required: ['project_path', 'question_id', 'answer']
    }
  },

  get_onboarding: {
    name: 'get_onboarding',
    description: `Get current onboarding state including all questions and answers.

WHEN TO USE:
- At session start to check onboarding status
- To retrieve user answers for context
- To check completion status before proceeding

RETURNS: OnboardingState with:
- startup_message_displayed: boolean
- started, completed: boolean
- questions[]: Array of { question_id, text, answer?, answered_at? }
- user_experience_level: 'novice' | 'intermediate' | 'expert' (from Q3)

RETURNS { not_started: true } if onboarding not initialized.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_path: {
          type: 'string',
          description: 'Absolute path to the project directory'
        }
      },
      required: ['project_path']
    }
  },

  get_unanswered_questions: {
    name: 'get_unanswered_questions',
    description: `Get list of onboarding questions still needing answers.

WHEN TO USE:
- During onboarding to see remaining questions
- Before proceeding to verify completion
- At session resume to continue onboarding

RETURNS: {
  questions: OnboardingQuestion[] (unanswered only),
  all_answered: boolean,
  message: "All answered!" or "N questions remaining: Q1, Q2..."
}

USE FOR: Determining which questions to ask next. Empty array means onboarding is complete.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_path: {
          type: 'string',
          description: 'Absolute path to the project directory'
        }
      },
      required: ['project_path']
    }
  },

  check_can_generate_code: {
    name: 'check_can_generate_code',
    description: `ENFORCEMENT GATE: Check if code generation is allowed. Call BEFORE creating any generation tasks.

PREREQUISITES FOR CODE GENERATION:
1. ✓ Startup message displayed
2. ✓ All 5 onboarding questions answered
3. ✓ G1 (Scope) approved
4. ✓ G2 (PRD) approved
5. ✓ G3 (Architecture) approved

RETURNS: {
  allowed: boolean,
  reason?: string (if blocked),
  violations: string[] (all blocking issues),
  next_step?: string (what to do next if blocked)
}

IMPORTANT: If allowed=false, do NOT proceed with code generation. Follow next_step guidance.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_path: {
          type: 'string',
          description: 'Absolute path to the project directory'
        }
      },
      required: ['project_path']
    }
  },

  check_can_create_task: {
    name: 'check_can_create_task',
    description: `ENFORCEMENT: Check if a specific task type can be created based on current state.

TASK TYPE PREREQUISITES:
- planning: Requires startup + onboarding complete
- generation: Requires G1 + G2 + G3 approved
- validation: Requires at least one generation task complete
- coordination: Always allowed (orchestrator tasks)

RETURNS: {
  allowed: boolean,
  reason?: string,
  violations: string[],
  task_type: TaskType
}

USE BEFORE: enqueue_task to ensure task can be created. Prevents protocol violations.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_path: {
          type: 'string',
          description: 'Absolute path to the project directory'
        },
        task_type: {
          type: 'string',
          enum: ['planning', 'generation', 'validation', 'coordination'],
          description: 'Type of task to create'
        }
      },
      required: ['project_path', 'task_type']
    }
  },

  log_protocol_violation: {
    name: 'log_protocol_violation',
    description: `Log a protocol violation for audit trail. Use when detecting MANDATORY_STARTUP.md or other protocol violations.

VIOLATION TYPES:
- skipped_startup: Attempted work without startup message
- skipped_question: Skipped onboarding question
- skipped_gate: Proceeded without required gate approval
- communication_violation: Didn't check teaching level before communication
- spec_modification: Attempted to modify locked specs

SEVERITY LEVELS:
- critical: Blocks all progress, requires immediate resolution
- high: Significant issue, should be resolved before gate transition
- medium: Notable issue, should be addressed
- low: Minor issue, for tracking purposes

RETURNS: { logged: true, message: 'Protocol violation logged: {type} ({severity})' }`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_path: {
          type: 'string',
          description: 'Absolute path to the project directory'
        },
        violation_type: {
          type: 'string',
          description: 'Type of violation. Examples: skipped_startup, skipped_question, skipped_gate'
        },
        description: {
          type: 'string',
          description: 'Detailed description of what happened and context'
        },
        severity: {
          type: 'string',
          enum: ['critical', 'high', 'medium', 'low'],
          description: 'Severity based on impact'
        },
        context: {
          type: 'object',
          description: 'Additional context: { agent, gate, task_id, etc. }'
        }
      },
      required: ['project_path', 'violation_type', 'description', 'severity']
    }
  },

  generate_summary_report: {
    name: 'generate_summary_report',
    description: `Generate comprehensive project summary. MUST be called at project completion.

WHEN TO USE:
- At G10 (project completion)
- When user requests project status
- For handoff documentation

REPORT INCLUDES:
- Project overview and timeline
- Gate progression and approvals
- Tasks completed and outcomes
- Decisions made with rationale
- Cost summary
- Protocol compliance metrics

RETURNS: Structured report object suitable for STATUS.md generation.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_path: {
          type: 'string',
          description: 'Absolute path to the project directory'
        }
      },
      required: ['project_path']
    }
  },

  get_enforcement_status: {
    name: 'get_enforcement_status',
    description: `Get complete enforcement status across all protocols.

WHEN TO USE:
- At session start to understand current state
- Before major operations to verify readiness
- For debugging why operations are blocked

RETURNS: {
  startup_displayed: boolean,
  onboarding_started: boolean,
  onboarding_completed: boolean,
  questions_answered: number (0-5),
  questions_remaining: string[] (e.g., ['Q3', 'Q4', 'Q5']),
  user_experience_level?: 'novice' | 'intermediate' | 'expert',
  gates: { G1, G2, G3 } statuses,
  can_generate_code: boolean,
  blockers: string[] (all blocking issues),
  teaching_moments?: { delivered, target, remaining, progress_percent, meets_target } (NOVICE/INTERMEDIATE only)
}

TEACHING MOMENTS: For NOVICE users, check teaching_moments.meets_target before G6.
Target: NOVICE=15, INTERMEDIATE=8. G6 approval BLOCKED if quota not met.

USE FOR: Single comprehensive status check. Use check_can_generate_code for specific code check.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_path: {
          type: 'string',
          description: 'Absolute path to the project directory'
        }
      },
      required: ['project_path']
    }
  },

  get_teaching_level: {
    name: 'get_teaching_level',
    description: `MANDATORY: Get user's teaching level for communication adaptation.

WHEN TO USE: BEFORE any user-facing communication to adapt language appropriately.

TEACHING LEVELS:
- novice: Full explanations, define all terms, use analogies, suggest defaults
- intermediate: Explain key decisions, offer options with trade-offs
- expert: Concise, technical terminology, focus on trade-offs only

RETURNS: {
  level: 'novice' | 'intermediate' | 'expert',
  communication_style: string (guidance),
  teaching_frequency: string (how often to teach),
  terminology: string (what terms are ok)
}

IMPORTANT: Level is set by Q3 answer during onboarding. Defaults to 'intermediate' if not set.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_path: {
          type: 'string',
          description: 'Absolute path to the project directory'
        }
      },
      required: ['project_path']
    }
  },

  get_communication_template: {
    name: 'get_communication_template',
    description: `Get level-appropriate communication template for specific interaction types.

TEMPLATE TYPES:
- gate_presentation: For presenting gates for approval
- progress_update: For status and progress reports
- teaching_moment: For educational explanations
- error_communication: For explaining errors/issues
- agent_introduction: For agent self-introduction

RETURNS: {
  level: UserExperienceLevel,
  template_type: string,
  guidelines: string[] (how to communicate),
  example_format: string (template with placeholders)
}

USE FOR: Ensuring consistent, level-appropriate communication. Templates vary significantly by level.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_path: {
          type: 'string',
          description: 'Absolute path to the project directory'
        },
        template_type: {
          type: 'string',
          enum: ['gate_presentation', 'progress_update', 'teaching_moment', 'error_communication', 'agent_introduction'],
          description: 'Type of communication template needed'
        },
        context: {
          type: 'string',
          description: 'Additional context. Example: "G3" for gate, "architect" for agent'
        }
      },
      required: ['project_path', 'template_type']
    }
  },

  log_progress_update: {
    name: 'log_progress_update',
    description: `Log progress update for tracking and user visibility.

WHEN TO USE:
- When starting new work (status: 'starting')
- Periodically during work (status: 'in_progress')
- At significant milestones (status: 'checkpoint')
- When completing work (status: 'completed')
- When blocked (status: 'blocked')

RETURNS: { logged: true, update: ProgressUpdate }

PROGRESS TRACKING: Updates are stored and can be retrieved with get_progress_history for user status displays.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_path: {
          type: 'string',
          description: 'Absolute path to the project directory'
        },
        phase: {
          type: 'string',
          description: 'Current phase. Examples: onboarding, planning, development, testing, deployment'
        },
        agent: {
          type: 'string',
          description: 'Agent providing the update. Examples: orchestrator, architect, developer, qa'
        },
        status: {
          type: 'string',
          enum: ['starting', 'in_progress', 'checkpoint', 'completed', 'blocked'],
          description: 'Current work status'
        },
        message: {
          type: 'string',
          description: 'Human-readable progress message for user display'
        },
        details: {
          type: 'object',
          description: 'Additional details: { completed_items: [], remaining_items: [], percent_complete: 50 }'
        }
      },
      required: ['project_path', 'phase', 'agent', 'status', 'message']
    }
  },

  get_progress_history: {
    name: 'get_progress_history',
    description: `Get history of progress updates for user visibility.

WHEN TO USE:
- To display progress timeline to user
- To review what has been completed
- For debugging workflow issues

RETURNS: {
  updates: ProgressUpdate[] (most recent last),
  total: number (total updates recorded)
}

FILTERING: Use limit parameter to get recent updates only. Default returns last 10.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_path: {
          type: 'string',
          description: 'Absolute path to the project directory'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of updates to return. Default: 10'
        }
      },
      required: ['project_path']
    }
  },

  // ============================================================
  // Communication Compliance Enforcement Tools
  // ============================================================

  check_communication_compliance: {
    name: 'check_communication_compliance',
    description: `MANDATORY: Check compliance BEFORE any user-facing communication.

PURPOSE: Ensures all agents adapt communication to user's teaching level.

WHEN TO USE: BEFORE:
- Presenting gates for approval
- Sending progress updates
- Explaining errors
- Introducing yourself as an agent
- Any direct user communication

RETURNS: {
  compliant: true,
  teaching_level: 'novice' | 'intermediate' | 'expert',
  session_id: string (for validate_communication_output),
  guidelines: string[] (how to communicate),
  warning?: string (if check was stale)
}

FLOW: 1) check_communication_compliance → 2) craft message using guidelines → 3) validate_communication_output`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_path: {
          type: 'string',
          description: 'Absolute path to the project directory'
        },
        agent: {
          type: 'string',
          description: 'Agent communicating. Examples: orchestrator, architect, developer, qa, security'
        },
        communication_type: {
          type: 'string',
          enum: ['gate_presentation', 'progress_update', 'teaching_moment', 'error_communication', 'agent_introduction', 'general'],
          description: 'Type of communication being prepared'
        }
      },
      required: ['project_path', 'agent', 'communication_type']
    }
  },

  get_communication_history: {
    name: 'get_communication_history',
    description: `Get communication session history and compliance metrics.

WHEN TO USE:
- To audit protocol adherence
- To identify communication issues
- During retrospectives

RETURNS: {
  sessions: CommunicationSession[],
  total: number,
  compliance_rate: number (0-100%),
  violations: number
}

USE FOR: Monitoring whether agents are following communication protocols.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_path: {
          type: 'string',
          description: 'Absolute path to the project directory'
        },
        limit: {
          type: 'number',
          description: 'Maximum sessions to return. Default: 20'
        }
      },
      required: ['project_path']
    }
  },

  validate_communication_output: {
    name: 'validate_communication_output',
    description: `ENFORCEMENT: Validate communication output is appropriate for user's teaching level.

CHECKS PERFORMED:
- NOVICE: Flags unexplained jargon (API, SDK, CLI, etc.), suggests analogies
- INTERMEDIATE: Balanced check
- EXPERT: Flags excessive verbosity, unnecessary explanations

WHEN TO USE: After crafting communication, before sending to user.

RETURNS: {
  valid: boolean,
  teaching_level: UserExperienceLevel,
  issues: string[] (problems found),
  suggestions: string[] (improvements)
}

IMPORTANT: Updates compliance tracking. Issues found mark session as non-compliant.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_path: {
          type: 'string',
          description: 'Absolute path to the project directory'
        },
        session_id: {
          type: 'string',
          description: 'Session ID from check_communication_compliance call'
        },
        output_preview: {
          type: 'string',
          description: 'The communication text to validate before sending'
        },
        agent: {
          type: 'string',
          description: 'Agent providing the output'
        }
      },
      required: ['project_path', 'session_id', 'output_preview', 'agent']
    }
  },

  // ============================================================
  // Teaching Moment Tracking Tools
  // ============================================================

  record_teaching_moment: {
    name: 'record_teaching_moment',
    description: `Record a teaching moment delivered to the user (MANDATORY for NOVICE/INTERMEDIATE).

WHEN TO USE: After delivering any educational explanation to track progress toward quota.

TEACHING MOMENT QUOTAS:
- NOVICE: 10-15 per project (required)
- INTERMEDIATE: 5-8 per project (required)
- EXPERT: 0-2 per project (optional, only when asked)

RETURNS: {
  moment_id: string,
  topic: string,
  delivered_count: number,
  target_count: number,
  remaining: number
}

IMPORTANT: Gate approval checks teaching moment quota for NOVICE users.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_path: {
          type: 'string',
          description: 'Absolute path to the project directory'
        },
        gate: {
          type: 'string',
          enum: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9'],
          description: 'Current gate context'
        },
        agent: {
          type: 'string',
          description: 'Agent delivering the teaching moment'
        },
        topic: {
          type: 'string',
          description: 'Topic being taught (e.g., "API Contracts", "Database Normalization")'
        },
        explanation: {
          type: 'string',
          description: 'The teaching explanation delivered to user'
        },
        why_it_matters: {
          type: 'string',
          description: 'Why this concept matters for their project'
        }
      },
      required: ['project_path', 'gate', 'agent', 'topic', 'explanation', 'why_it_matters']
    }
  },

  record_teaching_moment_followup: {
    name: 'record_teaching_moment_followup',
    description: `Record that user asked for followup on a teaching moment.

WHEN TO USE: When user asks "Can you explain more?" or requests deeper explanation.

RETURNS: { success: boolean, moment_id: string }

IMPORTANT: Followup requests indicate engaged learning - valuable signal for teaching approach.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_path: {
          type: 'string',
          description: 'Absolute path to the project directory'
        },
        moment_id: {
          type: 'string',
          description: 'ID of the teaching moment from record_teaching_moment'
        },
        followup_provided: {
          type: 'string',
          description: 'The followup explanation provided'
        }
      },
      required: ['project_path', 'moment_id', 'followup_provided']
    }
  },

  get_teaching_moments_status: {
    name: 'get_teaching_moments_status',
    description: `Get teaching moment delivery status and progress toward quota.

WHEN TO USE:
- Before gate approval to check quota compliance
- To plan remaining teaching moments
- For progress reporting

RETURNS: {
  delivered: number,
  target: number,
  remaining: number,
  progress_percent: number,
  meets_target: boolean,
  moments: TeachingMoment[] (history)
}

IMPORTANT: For NOVICE users, target must be met before G6.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_path: {
          type: 'string',
          description: 'Absolute path to the project directory'
        }
      },
      required: ['project_path']
    }
  },

  check_teaching_quota_for_gate: {
    name: 'check_teaching_quota_for_gate',
    description: `Check if teaching moment quota is met for a specific gate.

WHEN TO USE: Before presenting any gate to ensure educational requirements met.

RETURNS: {
  met: boolean,
  delivered: number,
  expected: number,
  message: string
}

GATE EXPECTATIONS (NOVICE):
- Each gate should have ~2 teaching moments
- Total by G6: 10-15 moments

ENFORCEMENT: Gate approval may warn if quota not met for NOVICE users.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        project_path: {
          type: 'string',
          description: 'Absolute path to the project directory'
        },
        gate: {
          type: 'string',
          enum: ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9'],
          description: 'Gate to check quota for'
        }
      },
      required: ['project_path', 'gate']
    }
  }
};

export const onboardingToolList = Object.values(onboardingTools);
