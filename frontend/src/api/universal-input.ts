import apiClient from '../lib/api-client';

// ============================================================================
// Type Definitions
// ============================================================================

export type CompletenessLevel =
  | 'prompt-only'
  | 'ui-only'
  | 'backend-only'
  | 'full-stack'
  | 'contracts-only'
  | 'docs-only';

export type UIFramework = 'react' | 'vue' | 'angular' | 'svelte' | 'html' | 'nextjs' | 'unknown';
export type BackendFramework = 'nestjs' | 'express' | 'fastapi' | 'django' | 'flask' | 'hono' | 'elysia' | 'unknown';
export type ORMType = 'prisma' | 'typeorm' | 'sequelize' | 'drizzle' | 'sqlalchemy' | 'mongoose' | 'none' | 'unknown';
export type AuthType = 'jwt' | 'session' | 'oauth' | 'api-key' | 'basic' | 'none' | 'unknown';
export type GateAction = 'skip' | 'validate' | 'delta' | 'full';

export interface DetectedArtifacts {
  hasPRD: boolean;
  prdFiles: string[];
  hasArchitectureDoc: boolean;
  architectureFiles: string[];
  hasReadme: boolean;
  hasOpenAPI: boolean;
  openAPIFiles: string[];
  hasPrismaSchema: boolean;
  prismaSchemaPath?: string;
  hasGraphQLSchema: boolean;
  graphQLFiles: string[];
  hasUICode: boolean;
  uiCodePaths: string[];
  hasDesignMockups: boolean;
  mockupFiles: string[];
  hasFigmaLinks: boolean;
  hasBackendCode: boolean;
  backendCodePaths: string[];
  hasControllers: boolean;
  hasServices: boolean;
  hasModels: boolean;
  hasTests: boolean;
  testFiles: string[];
  hasCI: boolean;
  ciFiles: string[];
  hasDockerfile: boolean;
}

export interface InputClassification {
  completeness: CompletenessLevel;
  uiFramework?: UIFramework;
  uiFrameworkVersion?: string;
  backendFramework?: BackendFramework;
  backendFrameworkVersion?: string;
  orm?: ORMType;
  databaseType?: 'postgresql' | 'mysql' | 'sqlite' | 'mongodb' | 'unknown';
  authType?: AuthType;
  validationLibrary?: string;
  packageManager?: 'npm' | 'yarn' | 'pnpm' | 'bun';
  artifacts: DetectedArtifacts;
  totalFiles: number;
  codeFiles: number;
  configFiles: number;
  docFiles: number;
  assetFiles: number;
  confidence: number;
}

export interface SecurityIssue {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  title: string;
  description: string;
  file?: string;
  line?: number;
  recommendation: string;
}

export interface AnalysisStatus {
  sessionId: string;
  status: 'pending' | 'classifying' | 'analyzing-ui' | 'analyzing-backend' | 'cross-analyzing' | 'complete' | 'failed';
  progress: number;
  currentPhase: string;
  classification?: InputClassification;
  result?: InputAnalysisResult;
  error?: string;
}

export interface InputAnalysisResult {
  classification: InputClassification;
  uiAnalysis?: {
    extractedEndpoints: Array<{
      method: string;
      path: string;
      sourceFile: string;
      sourceLine: number;
      inferredRequestType?: string;
      inferredResponseType?: string;
      isAuthenticated?: boolean;
    }>;
    stateManagement?: string;
    routingLibrary?: string;
    stylingApproach?: string;
    componentCount: number;
    pageCount: number;
  };
  backendAnalysis?: {
    extractedRoutes: Array<{
      method: string;
      path: string;
      controllerFile: string;
      controllerMethod: string;
      hasAuth: boolean;
      authGuards: string[];
      requestDto?: string;
      responseDto?: string;
    }>;
    extractedSchema?: string;
    generatedOpenAPI?: object;
    authPatterns: Array<{
      type: string;
      details: string;
      files: string[];
    }>;
    securityIssues: SecurityIssue[];
    qualityMetrics: {
      testCoverage?: number;
      typeCoverage?: number;
      lintErrors: number;
      lintWarnings: number;
    };
  };
  crossAnalysis?: {
    missingBackendEndpoints: Array<{ method: string; path: string }>;
    unusedBackendEndpoints: Array<{ method: string; path: string }>;
    typeMismatches: Array<{
      endpoint: string;
      uiExpects: string;
      backendProvides: string;
    }>;
    authMisalignments: Array<{
      endpoint: string;
      uiExpectsAuth: boolean;
      backendHasAuth: boolean;
    }>;
  };
  startedAt: string;
  completedAt: string;
  durationMs: number;
}

export interface GateActionOption {
  action: GateAction;
  label: string;
  description: string;
  isRecommended: boolean;
}

export interface GateRecommendation {
  gate: 'G1' | 'G2' | 'G3' | 'G4' | 'G5' | 'G6' | 'G7' | 'G8' | 'G9';
  gateName: string;
  recommendedAction: GateAction;
  reason: string;
  confidence: number;
  existingArtifacts: string[];
  userQuestion: string;
  options: GateActionOption[];
}

export interface GatePlanHighlight {
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  description: string;
  relatedGate?: string;
}

export interface GatePlan {
  sessionId: string;
  analysisId: string;
  completenessLevel: string;
  summary: string;
  recommendations: GateRecommendation[];
  highlights: GatePlanHighlight[];
  securitySummary?: {
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    topIssues: SecurityIssue[];
  };
  qualitySummary?: {
    testCoverage: number;
    overallScore: number;
    recommendations: string[];
  };
}

export interface GateDecision {
  gate: string;
  action: GateAction;
  reason?: string;
}

export interface GateContext {
  classification: {
    completeness: string;
    hasUI: boolean;
    hasBackend: boolean;
    uiFramework?: string;
    backendFramework?: string;
    orm?: string;
  };
  extractedArtifacts: {
    openApiSpec?: object;
    prismaSchema?: string;
    uiRequirements?: Array<{ method: string; path: string }>;
    securityIssues?: SecurityIssue[];
  };
  decisions: Record<string, { action: GateAction; reason?: string }>;
  routing: {
    skipGates: string[];
    deltaGates: string[];
    validateGates: string[];
    fullGates: string[];
    focusAreas: string[];
  };
  assetIds: string[];
}

// ============================================================================
// API Client
// ============================================================================

export const universalInputApi = {
  /**
   * Start analysis of uploaded assets
   * Kicks off the Universal Input Handler workflow
   */
  startAnalysis: async (
    sessionId: string,
    assetIds: string[],
    options?: {
      includeSecurityScan?: boolean;
      includeQualityMetrics?: boolean;
    }
  ): Promise<AnalysisStatus> => {
    const response = await apiClient.post<AnalysisStatus>('/universal-input/analyze', {
      sessionId,
      assetIds,
      ...options,
    });
    return response.data;
  },

  /**
   * Get analysis status and results
   * Poll this endpoint to track analysis progress
   */
  getStatus: async (sessionId: string): Promise<AnalysisStatus> => {
    const response = await apiClient.get<AnalysisStatus>(
      `/universal-input/status/${sessionId}`
    );
    return response.data;
  },

  /**
   * Get gate plan (recommendations) after analysis is complete
   * Returns AI-generated recommendations for each gate
   */
  getGatePlan: async (sessionId: string): Promise<{ success: boolean; plan?: GatePlan; error?: string }> => {
    const response = await apiClient.get<{ success: boolean; plan?: GatePlan; error?: string }>(
      `/universal-input/gate-plan/${sessionId}`
    );
    return response.data;
  },

  /**
   * Confirm gate plan with user decisions
   * User can accept, modify, or override AI recommendations
   */
  confirmGatePlan: async (
    sessionId: string,
    decisions: GateDecision[]
  ): Promise<{ success: boolean; context?: GateContext; error?: string }> => {
    const response = await apiClient.post<{ success: boolean; context?: GateContext; error?: string }>(
      '/universal-input/confirm-plan',
      { sessionId, decisions }
    );
    return response.data;
  },
};

// ============================================================================
// React Query Hooks (optional - for component use)
// ============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const useAnalysisStatus = (sessionId: string | null, enabled = true) => {
  return useQuery({
    queryKey: ['universal-input', 'status', sessionId],
    queryFn: () => universalInputApi.getStatus(sessionId!),
    enabled: !!sessionId && enabled,
    refetchInterval: (query) => {
      // Poll every 2 seconds while analysis is in progress
      const status = query.state.data?.status;
      if (status && status !== 'complete' && status !== 'failed') {
        return 2000;
      }
      return false;
    },
  });
};

export const useGatePlan = (sessionId: string | null, enabled = true) => {
  return useQuery({
    queryKey: ['universal-input', 'gate-plan', sessionId],
    queryFn: () => universalInputApi.getGatePlan(sessionId!),
    enabled: !!sessionId && enabled,
  });
};

export const useStartAnalysis = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      assetIds,
      options,
    }: {
      sessionId: string;
      assetIds: string[];
      options?: { includeSecurityScan?: boolean; includeQualityMetrics?: boolean };
    }) => universalInputApi.startAnalysis(sessionId, assetIds, options),
    onSuccess: (data) => {
      queryClient.setQueryData(['universal-input', 'status', data.sessionId], data);
    },
  });
};

export const useConfirmGatePlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      decisions,
    }: {
      sessionId: string;
      decisions: GateDecision[];
    }) => universalInputApi.confirmGatePlan(sessionId, decisions),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['universal-input', 'gate-plan', variables.sessionId] });
    },
  });
};
