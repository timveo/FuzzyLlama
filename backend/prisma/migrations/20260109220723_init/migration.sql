-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('FREE', 'PRO', 'TEAM', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');

-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('traditional', 'ai_ml', 'hybrid', 'enhancement');

-- CreateEnum
CREATE TYPE "Phase" AS ENUM ('pre_startup', 'intake', 'assessment', 'planning', 'planning_complete', 'architecture', 'architecture_complete', 'design', 'design_complete', 'development', 'development_foundation', 'development_data', 'development_components', 'development_integration', 'development_polish', 'development_complete', 'testing', 'testing_complete', 'security_review', 'security_complete', 'pre_deployment', 'deployment_approved', 'production', 'completion', 'completed', 'blocked');

-- CreateEnum
CREATE TYPE "PhaseStatus" AS ENUM ('in_progress', 'completed', 'skipped', 'failed');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('not_started', 'in_progress', 'complete', 'blocked', 'skipped');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('critical', 'high', 'medium', 'low');

-- CreateEnum
CREATE TYPE "EscalationLevel" AS ENUM ('L1', 'L2', 'L3');

-- CreateEnum
CREATE TYPE "Probability" AS ENUM ('high', 'medium', 'low');

-- CreateEnum
CREATE TYPE "Impact" AS ENUM ('high', 'medium', 'low');

-- CreateEnum
CREATE TYPE "RiskStatus" AS ENUM ('identified', 'mitigating', 'mitigated', 'accepted', 'realized');

-- CreateEnum
CREATE TYPE "DeliverableStatus" AS ENUM ('not_started', 'in_progress', 'in_review', 'complete', 'blocked');

-- CreateEnum
CREATE TYPE "HandoffStatus" AS ENUM ('complete', 'partial', 'blocked');

-- CreateEnum
CREATE TYPE "QueryType" AS ENUM ('clarification', 'validation', 'consultation', 'estimation');

-- CreateEnum
CREATE TYPE "QueryStatus" AS ENUM ('pending', 'answered', 'expired');

-- CreateEnum
CREATE TYPE "EscalationType" AS ENUM ('blocker', 'decision', 'technical', 'scope');

-- CreateEnum
CREATE TYPE "EscalationStatus" AS ENUM ('pending', 'resolved', 'auto_resolved');

-- CreateEnum
CREATE TYPE "QualityGateStatus" AS ENUM ('passing', 'failing', 'pending');

-- CreateEnum
CREATE TYPE "LoopStrategy" AS ENUM ('sequential', 'parallel');

-- CreateEnum
CREATE TYPE "LoopPhase" AS ENUM ('QUEUED', 'REFINING', 'BUILDING', 'TESTING', 'ACCEPTING', 'COMPLETE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "TeachingLevel" AS ENUM ('NOVICE', 'INTERMEDIATE', 'EXPERT');

-- CreateEnum
CREATE TYPE "ActionStatus" AS ENUM ('pending', 'in_progress', 'complete');

-- CreateEnum
CREATE TYPE "MemoryType" AS ENUM ('decision_worked', 'decision_failed', 'pattern_discovered', 'gotcha');

-- CreateEnum
CREATE TYPE "EnhancedMemoryType" AS ENUM ('pattern', 'decision', 'failure', 'gotcha', 'success', 'integration', 'performance', 'security');

-- CreateEnum
CREATE TYPE "MemoryScope" AS ENUM ('universal', 'stack_specific', 'domain_specific', 'project_specific');

-- CreateEnum
CREATE TYPE "LinkSourceType" AS ENUM ('memory', 'decision', 'error', 'task', 'handoff');

-- CreateEnum
CREATE TYPE "LinkTargetType" AS ENUM ('memory', 'decision', 'error', 'task', 'file');

-- CreateEnum
CREATE TYPE "LinkType" AS ENUM ('caused_by', 'related_to', 'supersedes', 'depends_on', 'fixes', 'references');

-- CreateEnum
CREATE TYPE "ErrorType" AS ENUM ('build', 'test', 'lint', 'runtime', 'validation', 'network', 'auth', 'unknown');

-- CreateEnum
CREATE TYPE "ContextType" AS ENUM ('conversation', 'working_set', 'agent_state', 'user_preference', 'temporary');

-- CreateEnum
CREATE TYPE "ProofType" AS ENUM ('test_output', 'coverage_report', 'lint_output', 'security_scan', 'build_output', 'lighthouse_report', 'accessibility_scan', 'spec_validation', 'deployment_log', 'smoke_test', 'screenshot', 'manual_verification');

-- CreateEnum
CREATE TYPE "PassFail" AS ENUM ('pass', 'fail', 'warning', 'info');

-- CreateEnum
CREATE TYPE "ExtractionSource" AS ENUM ('decision', 'error', 'blocker', 'handoff');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('in_progress', 'complete', 'failed', 'partial');

-- CreateEnum
CREATE TYPE "Recommendation" AS ENUM ('MAINTAIN', 'ENHANCE', 'REFACTOR', 'REWRITE');

-- CreateEnum
CREATE TYPE "AssessmentSection" AS ENUM ('architecture', 'security', 'quality', 'devops', 'frontend_code', 'backend_code', 'ai_ml', 'data');

-- CreateEnum
CREATE TYPE "AssessmentResultStatus" AS ENUM ('pending', 'in_progress', 'complete', 'timed_out', 'failed');

-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('REQUIREMENTS', 'ARCHITECTURE', 'API_SPEC', 'DATABASE_SCHEMA', 'USER_STORY', 'TEST_PLAN', 'DEPLOYMENT_GUIDE', 'CODE', 'OTHER');

-- CreateEnum
CREATE TYPE "SpecificationType" AS ENUM ('OPENAPI', 'PRISMA', 'ZOD', 'GRAPHQL', 'PROTOBUF', 'OTHER');

-- CreateEnum
CREATE TYPE "GateStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'BLOCKED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "githubId" TEXT,
    "googleId" TEXT,
    "planTier" "PlanTier" NOT NULL DEFAULT 'FREE',
    "stripeCustomerId" TEXT,
    "monthlyAgentExecutions" INTEGER NOT NULL DEFAULT 0,
    "lastExecutionReset" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "planTier" "PlanTier" NOT NULL DEFAULT 'FREE',
    "stripeSubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMember" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL DEFAULT 'MEMBER',

    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ProjectType" NOT NULL,
    "repository" TEXT,
    "ownerId" TEXT NOT NULL,
    "organizationId" TEXT,
    "githubRepoUrl" TEXT,
    "githubRepoId" TEXT,
    "railwayProjectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectState" (
    "projectId" TEXT NOT NULL,
    "currentPhase" "Phase" NOT NULL,
    "currentGate" TEXT NOT NULL,
    "currentAgent" TEXT,
    "percentComplete" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectState_pkey" PRIMARY KEY ("projectId")
);

-- CreateTable
CREATE TABLE "PhaseHistory" (
    "id" SERIAL NOT NULL,
    "projectId" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "agent" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "status" "PhaseStatus" NOT NULL DEFAULT 'in_progress',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhaseHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'not_started',
    "owner" TEXT,
    "title" TEXT,
    "priority" TEXT,
    "estimatedEffort" INTEGER,
    "actualEffort" INTEGER,
    "agentId" TEXT,
    "assignedToId" TEXT,
    "parentTaskId" TEXT,
    "blockingReason" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Blocker" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "Severity" NOT NULL,
    "owner" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "escalated" BOOLEAN NOT NULL DEFAULT false,
    "escalationLevel" "EscalationLevel",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Blocker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockerAgent" (
    "blockerId" TEXT NOT NULL,
    "agent" TEXT NOT NULL,

    CONSTRAINT "BlockerAgent_pkey" PRIMARY KEY ("blockerId","agent")
);

-- CreateTable
CREATE TABLE "Risk" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "probability" "Probability" NOT NULL,
    "impact" "Impact" NOT NULL,
    "mitigation" TEXT,
    "owner" TEXT,
    "status" "RiskStatus" NOT NULL DEFAULT 'identified',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Risk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deliverable" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT,
    "status" "DeliverableStatus" NOT NULL DEFAULT 'not_started',
    "owner" TEXT,
    "version" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deliverable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Handoff" (
    "id" SERIAL NOT NULL,
    "projectId" TEXT NOT NULL,
    "fromAgent" TEXT NOT NULL,
    "toAgent" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "status" "HandoffStatus" NOT NULL,
    "retryAttempt" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Handoff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HandoffDeliverable" (
    "handoffId" INTEGER NOT NULL,
    "deliverable" TEXT NOT NULL,

    CONSTRAINT "HandoffDeliverable_pkey" PRIMARY KEY ("handoffId","deliverable")
);

-- CreateTable
CREATE TABLE "Query" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fromAgent" TEXT NOT NULL,
    "toAgent" TEXT NOT NULL,
    "type" "QueryType" NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "status" "QueryStatus" NOT NULL DEFAULT 'pending',
    "answeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Query_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Escalation" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "level" "EscalationLevel" NOT NULL,
    "fromAgent" TEXT NOT NULL,
    "severity" "Severity" NOT NULL,
    "type" "EscalationType" NOT NULL,
    "summary" TEXT NOT NULL,
    "status" "EscalationStatus" NOT NULL DEFAULT 'pending',
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Escalation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Decision" (
    "id" SERIAL NOT NULL,
    "projectId" TEXT NOT NULL,
    "gate" TEXT NOT NULL,
    "agent" TEXT NOT NULL,
    "decisionType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rationale" TEXT,
    "alternativesConsidered" TEXT,
    "outcome" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Decision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Metrics" (
    "projectId" TEXT NOT NULL,
    "storiesTotal" INTEGER NOT NULL DEFAULT 0,
    "storiesCompleted" INTEGER NOT NULL DEFAULT 0,
    "bugsOpen" INTEGER NOT NULL DEFAULT 0,
    "bugsResolved" INTEGER NOT NULL DEFAULT 0,
    "testCoverage" TEXT NOT NULL DEFAULT '0%',
    "qualityGateStatus" "QualityGateStatus" NOT NULL DEFAULT 'pending',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Metrics_pkey" PRIMARY KEY ("projectId")
);

-- CreateTable
CREATE TABLE "FeatureLoops" (
    "projectId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "strategy" "LoopStrategy" NOT NULL DEFAULT 'sequential',
    "maxIterations" INTEGER NOT NULL DEFAULT 3,
    "totalLoops" INTEGER NOT NULL DEFAULT 0,
    "completedLoops" INTEGER NOT NULL DEFAULT 0,
    "avgIterations" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgDurationMinutes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "firstPassAcceptanceRate" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "FeatureLoops_pkey" PRIMARY KEY ("projectId")
);

-- CreateTable
CREATE TABLE "ActiveLoop" (
    "projectId" TEXT NOT NULL,
    "storyId" TEXT,
    "storyTitle" TEXT,
    "phase" "LoopPhase",
    "agent" TEXT,
    "iteration" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),

    CONSTRAINT "ActiveLoop_pkey" PRIMARY KEY ("projectId")
);

-- CreateTable
CREATE TABLE "LoopQueue" (
    "id" SERIAL NOT NULL,
    "projectId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "dependencies" TEXT,

    CONSTRAINT "LoopQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompletedLoop" (
    "id" SERIAL NOT NULL,
    "projectId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "iterations" INTEGER NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "issuesFound" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompletedLoop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelUsage" (
    "id" SERIAL NOT NULL,
    "projectId" TEXT NOT NULL,
    "agent" TEXT NOT NULL,
    "tier" INTEGER NOT NULL,
    "task" TEXT NOT NULL,
    "tokensEstimated" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModelUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Teaching" (
    "projectId" TEXT NOT NULL,
    "level" "TeachingLevel" NOT NULL DEFAULT 'INTERMEDIATE',
    "targetPerPhase" TEXT NOT NULL DEFAULT '5-8',
    "momentsDelivered" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Teaching_pkey" PRIMARY KEY ("projectId")
);

-- CreateTable
CREATE TABLE "TeachingByAgent" (
    "projectId" TEXT NOT NULL,
    "agent" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TeachingByAgent_pkey" PRIMARY KEY ("projectId","agent")
);

-- CreateTable
CREATE TABLE "TeachingTopic" (
    "id" SERIAL NOT NULL,
    "projectId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "agent" TEXT NOT NULL,
    "gate" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeachingTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NextAction" (
    "id" SERIAL NOT NULL,
    "projectId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "priority" "Severity" NOT NULL DEFAULT 'medium',
    "status" "ActionStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NextAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Memory" (
    "id" SERIAL NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "MemoryType" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Memory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" SERIAL NOT NULL,
    "projectId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnhancedMemory" (
    "id" SERIAL NOT NULL,
    "projectId" TEXT NOT NULL,
    "memoryType" "EnhancedMemoryType" NOT NULL,
    "scope" "MemoryScope" NOT NULL DEFAULT 'project_specific',
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "context" TEXT,
    "exampleCode" TEXT,
    "tags" TEXT,
    "agents" TEXT,
    "gate" TEXT,
    "outcome" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "embedding" BYTEA,
    "syncedToSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnhancedMemory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemoryLink" (
    "id" SERIAL NOT NULL,
    "sourceType" "LinkSourceType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetType" "LinkTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "linkType" "LinkType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemoryLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToolResult" (
    "id" SERIAL NOT NULL,
    "projectId" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "inputJson" TEXT NOT NULL,
    "outputJson" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "errorMessage" TEXT,
    "executionTimeMs" INTEGER,
    "taskId" TEXT,
    "workerId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToolResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErrorHistory" (
    "id" SERIAL NOT NULL,
    "projectId" TEXT NOT NULL,
    "taskId" TEXT,
    "errorType" "ErrorType" NOT NULL,
    "errorMessage" TEXT NOT NULL,
    "stackTrace" TEXT,
    "filePath" TEXT,
    "lineNumber" INTEGER,
    "contextJson" TEXT,
    "resolution" TEXT,
    "resolutionAgent" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "embedding" BYTEA,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErrorHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionContext" (
    "id" SERIAL NOT NULL,
    "projectId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "contextType" "ContextType" NOT NULL,
    "key" TEXT NOT NULL,
    "valueJson" TEXT NOT NULL,
    "ttlSeconds" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionContext_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProofArtifact" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "gate" TEXT NOT NULL,
    "proofType" "ProofType" NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "contentSummary" TEXT NOT NULL,
    "passFail" "PassFail" NOT NULL,
    "createdBy" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "gateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProofArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningExtraction" (
    "id" SERIAL NOT NULL,
    "projectId" TEXT NOT NULL,
    "sourceType" "ExtractionSource" NOT NULL,
    "sourceId" INTEGER NOT NULL,
    "extractedMemoryId" INTEGER,
    "confidence" DOUBLE PRECISION NOT NULL,
    "autoSynced" BOOLEAN NOT NULL DEFAULT false,
    "reviewed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningExtraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParallelAssessment" (
    "id" SERIAL NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" "AssessmentStatus" NOT NULL DEFAULT 'in_progress',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "aggregatedScore" DOUBLE PRECISION,
    "recommendation" "Recommendation",
    "totalAgents" INTEGER NOT NULL DEFAULT 0,
    "completedAgents" INTEGER NOT NULL DEFAULT 0,
    "timedOutAgents" INTEGER NOT NULL DEFAULT 0,
    "failedAgents" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ParallelAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentResult" (
    "id" SERIAL NOT NULL,
    "parallelAssessmentId" INTEGER NOT NULL,
    "agent" TEXT NOT NULL,
    "section" "AssessmentSection" NOT NULL,
    "score" INTEGER,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "status" "AssessmentResultStatus" NOT NULL DEFAULT 'pending',
    "findingsJson" TEXT,
    "metricsJson" TEXT,
    "detailsJson" TEXT,
    "startedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "errorMessage" TEXT,

    CONSTRAINT "AssessmentResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageMetric" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "agentExecutions" INTEGER NOT NULL DEFAULT 0,
    "apiTokensUsed" INTEGER NOT NULL DEFAULT 0,
    "cost" DECIMAL(10,2) NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "agentType" TEXT NOT NULL,
    "status" "AgentStatus" NOT NULL DEFAULT 'PENDING',
    "inputPrompt" TEXT NOT NULL,
    "outputResult" TEXT,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "contextData" JSONB,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "filePath" TEXT,
    "language" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "agentId" TEXT,
    "gateId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Specification" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "specificationType" "SpecificationType" NOT NULL,
    "content" JSONB NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "agentId" TEXT,
    "gateId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Specification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gate" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "gateType" TEXT NOT NULL,
    "status" "GateStatus" NOT NULL DEFAULT 'PENDING',
    "description" TEXT,
    "passingCriteria" TEXT,
    "reviewNotes" TEXT,
    "blockingReason" TEXT,
    "requiresProof" BOOLEAN NOT NULL DEFAULT false,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Gate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_githubId_key" ON "User"("githubId");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_stripeSubscriptionId_key" ON "Organization"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMember_organizationId_userId_key" ON "OrganizationMember"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "Project_ownerId_idx" ON "Project"("ownerId");

-- CreateIndex
CREATE INDEX "Project_type_idx" ON "Project"("type");

-- CreateIndex
CREATE INDEX "PhaseHistory_projectId_idx" ON "PhaseHistory"("projectId");

-- CreateIndex
CREATE INDEX "Task_projectId_phase_idx" ON "Task"("projectId", "phase");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "Task_agentId_idx" ON "Task"("agentId");

-- CreateIndex
CREATE INDEX "Task_assignedToId_idx" ON "Task"("assignedToId");

-- CreateIndex
CREATE INDEX "Blocker_projectId_idx" ON "Blocker"("projectId");

-- CreateIndex
CREATE INDEX "Blocker_resolvedAt_idx" ON "Blocker"("resolvedAt");

-- CreateIndex
CREATE INDEX "Handoff_projectId_idx" ON "Handoff"("projectId");

-- CreateIndex
CREATE INDEX "Query_status_idx" ON "Query"("status");

-- CreateIndex
CREATE INDEX "Escalation_status_idx" ON "Escalation"("status");

-- CreateIndex
CREATE INDEX "Decision_projectId_gate_idx" ON "Decision"("projectId", "gate");

-- CreateIndex
CREATE INDEX "EnhancedMemory_projectId_idx" ON "EnhancedMemory"("projectId");

-- CreateIndex
CREATE INDEX "EnhancedMemory_memoryType_idx" ON "EnhancedMemory"("memoryType");

-- CreateIndex
CREATE INDEX "EnhancedMemory_scope_idx" ON "EnhancedMemory"("scope");

-- CreateIndex
CREATE INDEX "MemoryLink_sourceType_sourceId_idx" ON "MemoryLink"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "MemoryLink_targetType_targetId_idx" ON "MemoryLink"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "ToolResult_projectId_toolName_inputHash_idx" ON "ToolResult"("projectId", "toolName", "inputHash");

-- CreateIndex
CREATE INDEX "ToolResult_taskId_idx" ON "ToolResult"("taskId");

-- CreateIndex
CREATE INDEX "ErrorHistory_projectId_idx" ON "ErrorHistory"("projectId");

-- CreateIndex
CREATE INDEX "ErrorHistory_taskId_idx" ON "ErrorHistory"("taskId");

-- CreateIndex
CREATE INDEX "ErrorHistory_errorType_idx" ON "ErrorHistory"("errorType");

-- CreateIndex
CREATE INDEX "SessionContext_projectId_sessionId_contextType_idx" ON "SessionContext"("projectId", "sessionId", "contextType");

-- CreateIndex
CREATE INDEX "SessionContext_expiresAt_idx" ON "SessionContext"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "SessionContext_projectId_sessionId_contextType_key_key" ON "SessionContext"("projectId", "sessionId", "contextType", "key");

-- CreateIndex
CREATE INDEX "ProofArtifact_projectId_idx" ON "ProofArtifact"("projectId");

-- CreateIndex
CREATE INDEX "ProofArtifact_gate_idx" ON "ProofArtifact"("gate");

-- CreateIndex
CREATE INDEX "ProofArtifact_proofType_idx" ON "ProofArtifact"("proofType");

-- CreateIndex
CREATE INDEX "LearningExtraction_projectId_idx" ON "LearningExtraction"("projectId");

-- CreateIndex
CREATE INDEX "ParallelAssessment_projectId_idx" ON "ParallelAssessment"("projectId");

-- CreateIndex
CREATE INDEX "AssessmentResult_parallelAssessmentId_idx" ON "AssessmentResult"("parallelAssessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentResult_parallelAssessmentId_agent_key" ON "AssessmentResult"("parallelAssessmentId", "agent");

-- CreateIndex
CREATE INDEX "UsageMetric_userId_periodStart_idx" ON "UsageMetric"("userId", "periodStart");

-- CreateIndex
CREATE INDEX "UsageMetric_projectId_idx" ON "UsageMetric"("projectId");

-- CreateIndex
CREATE INDEX "Agent_projectId_idx" ON "Agent"("projectId");

-- CreateIndex
CREATE INDEX "Agent_status_idx" ON "Agent"("status");

-- CreateIndex
CREATE INDEX "Agent_agentType_idx" ON "Agent"("agentType");

-- CreateIndex
CREATE INDEX "Document_projectId_idx" ON "Document"("projectId");

-- CreateIndex
CREATE INDEX "Document_documentType_idx" ON "Document"("documentType");

-- CreateIndex
CREATE INDEX "Document_agentId_idx" ON "Document"("agentId");

-- CreateIndex
CREATE INDEX "Document_gateId_idx" ON "Document"("gateId");

-- CreateIndex
CREATE INDEX "Specification_projectId_idx" ON "Specification"("projectId");

-- CreateIndex
CREATE INDEX "Specification_specificationType_idx" ON "Specification"("specificationType");

-- CreateIndex
CREATE INDEX "Specification_agentId_idx" ON "Specification"("agentId");

-- CreateIndex
CREATE INDEX "Specification_gateId_idx" ON "Specification"("gateId");

-- CreateIndex
CREATE INDEX "Gate_projectId_idx" ON "Gate"("projectId");

-- CreateIndex
CREATE INDEX "Gate_gateType_idx" ON "Gate"("gateType");

-- CreateIndex
CREATE INDEX "Gate_status_idx" ON "Gate"("status");

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectState" ADD CONSTRAINT "ProjectState_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhaseHistory" ADD CONSTRAINT "PhaseHistory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_parentTaskId_fkey" FOREIGN KEY ("parentTaskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Blocker" ADD CONSTRAINT "Blocker_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlockerAgent" ADD CONSTRAINT "BlockerAgent_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "Blocker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Risk" ADD CONSTRAINT "Risk_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deliverable" ADD CONSTRAINT "Deliverable_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Handoff" ADD CONSTRAINT "Handoff_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HandoffDeliverable" ADD CONSTRAINT "HandoffDeliverable_handoffId_fkey" FOREIGN KEY ("handoffId") REFERENCES "Handoff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Query" ADD CONSTRAINT "Query_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escalation" ADD CONSTRAINT "Escalation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Decision" ADD CONSTRAINT "Decision_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Metrics" ADD CONSTRAINT "Metrics_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureLoops" ADD CONSTRAINT "FeatureLoops_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActiveLoop" ADD CONSTRAINT "ActiveLoop_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoopQueue" ADD CONSTRAINT "LoopQueue_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompletedLoop" ADD CONSTRAINT "CompletedLoop_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelUsage" ADD CONSTRAINT "ModelUsage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Teaching" ADD CONSTRAINT "Teaching_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingByAgent" ADD CONSTRAINT "TeachingByAgent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeachingTopic" ADD CONSTRAINT "TeachingTopic_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NextAction" ADD CONSTRAINT "NextAction_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Memory" ADD CONSTRAINT "Memory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnhancedMemory" ADD CONSTRAINT "EnhancedMemory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolResult" ADD CONSTRAINT "ToolResult_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolResult" ADD CONSTRAINT "ToolResult_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErrorHistory" ADD CONSTRAINT "ErrorHistory_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErrorHistory" ADD CONSTRAINT "ErrorHistory_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionContext" ADD CONSTRAINT "SessionContext_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProofArtifact" ADD CONSTRAINT "ProofArtifact_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProofArtifact" ADD CONSTRAINT "ProofArtifact_gateId_fkey" FOREIGN KEY ("gateId") REFERENCES "Gate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningExtraction" ADD CONSTRAINT "LearningExtraction_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningExtraction" ADD CONSTRAINT "LearningExtraction_extractedMemoryId_fkey" FOREIGN KEY ("extractedMemoryId") REFERENCES "EnhancedMemory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningExtraction" ADD CONSTRAINT "decision_extraction_fk" FOREIGN KEY ("sourceId") REFERENCES "Decision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningExtraction" ADD CONSTRAINT "error_extraction_fk" FOREIGN KEY ("sourceId") REFERENCES "ErrorHistory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningExtraction" ADD CONSTRAINT "handoff_extraction_fk" FOREIGN KEY ("sourceId") REFERENCES "Handoff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParallelAssessment" ADD CONSTRAINT "ParallelAssessment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentResult" ADD CONSTRAINT "AssessmentResult_parallelAssessmentId_fkey" FOREIGN KEY ("parallelAssessmentId") REFERENCES "ParallelAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Specification" ADD CONSTRAINT "Specification_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Specification" ADD CONSTRAINT "Specification_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gate" ADD CONSTRAINT "Gate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gate" ADD CONSTRAINT "Gate_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
