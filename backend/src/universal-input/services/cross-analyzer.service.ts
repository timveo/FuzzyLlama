import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { ExtractedAPIEndpoint, ExtractedBackendRoute } from '../dto/input-analysis.dto';

interface CrossAnalysisResult {
  missingBackendEndpoints: ExtractedAPIEndpoint[];
  unusedBackendEndpoints: ExtractedBackendRoute[];
  typeMismatches: {
    endpoint: string;
    uiExpects: string;
    backendProvides: string;
    file: string;
    severity: 'breaking' | 'warning' | 'info';
  }[];
  authMisalignments: {
    endpoint: string;
    uiExpectsAuth: boolean;
    backendHasAuth: boolean;
    recommendation: string;
  }[];
  overallCompatibility: {
    score: number; // 0-100
    summary: string;
    criticalIssues: number;
    warnings: number;
  };
  reconciliationPlan: {
    priority: 'high' | 'medium' | 'low';
    action: string;
    affected: string[];
    effort: 'trivial' | 'minor' | 'moderate' | 'significant';
  }[];
}

@Injectable()
export class CrossAnalyzerService {
  private readonly logger = new Logger(CrossAnalyzerService.name);
  private readonly anthropic: Anthropic;

  constructor(private readonly configService: ConfigService) {
    this.anthropic = new Anthropic({
      apiKey: this.configService.get<string>('ANTHROPIC_API_KEY'),
    });
  }

  /**
   * AI-Native Cross-Analysis - Compares UI requirements against backend implementation
   * Finds gaps, mismatches, and alignment issues
   */
  async analyzeCross(
    uiEndpoints: ExtractedAPIEndpoint[],
    backendRoutes: ExtractedBackendRoute[],
    uiFileContents: string,
    backendFileContents: string,
  ): Promise<CrossAnalysisResult> {
    this.logger.log(
      `Cross-analyzing ${uiEndpoints.length} UI endpoints vs ${backendRoutes.length} backend routes`,
    );

    if (uiEndpoints.length === 0 && backendRoutes.length === 0) {
      return this.createEmptyResult();
    }

    // Run AI cross-analysis
    const result = await this.runCrossAnalysis(
      uiEndpoints,
      backendRoutes,
      uiFileContents,
      backendFileContents,
    );

    this.logger.log(
      `Cross-analysis complete: ${result.missingBackendEndpoints.length} missing, ` +
        `${result.unusedBackendEndpoints.length} unused, ${result.typeMismatches.length} type mismatches`,
    );

    return result;
  }

  /**
   * AI-Native comprehensive cross-analysis
   */
  private async runCrossAnalysis(
    uiEndpoints: ExtractedAPIEndpoint[],
    backendRoutes: ExtractedBackendRoute[],
    uiFileContents: string,
    backendFileContents: string,
  ): Promise<CrossAnalysisResult> {
    const systemPrompt = `You are an expert full-stack integration analyst. Your job is to compare UI API requirements against backend implementation and find gaps.

ANALYSIS TASKS:

1. MISSING BACKEND ENDPOINTS
   - Find UI endpoints that have no matching backend route
   - Consider path variations (with/without trailing slash, param names)
   - Account for API prefixes (/api/v1/ vs /api/ vs /)

2. UNUSED BACKEND ENDPOINTS
   - Find backend routes that the UI never calls
   - These might be dead code or features not yet implemented in UI

3. TYPE MISMATCHES
   - Compare request/response types between UI expectations and backend definitions
   - Flag breaking changes (UI expects field that backend doesn't provide)
   - Flag warnings (backend provides extra fields UI ignores)
   - Check array vs object mismatches
   - Check null/undefined handling

4. AUTH MISALIGNMENTS
   - UI expects auth but backend doesn't require it (security issue)
   - Backend requires auth but UI doesn't send it (will fail)
   - Mismatch in auth methods (bearer token vs cookie)

5. OVERALL COMPATIBILITY SCORE
   - 90-100: Excellent - minor or no issues
   - 70-89: Good - some warnings but functional
   - 50-69: Fair - has issues that need attention
   - Below 50: Poor - significant gaps

6. RECONCILIATION PLAN
   - Prioritized list of fixes needed
   - What action to take
   - Affected files/endpoints
   - Estimated effort

Be thorough and practical. Focus on real integration issues, not style differences.

Return ONLY valid JSON, no markdown code blocks.`;

    // Prepare endpoint summary for comparison
    const uiSummary = uiEndpoints
      .map(
        (e) =>
          `${e.method} ${e.path} (from ${e.sourceFile}:${e.sourceLine}) - Request: ${e.inferredRequestType || 'unknown'}, Response: ${e.inferredResponseType || 'unknown'}, Auth: ${e.isAuthenticated ? 'yes' : 'no'}`,
      )
      .join('\n');

    const backendSummary = backendRoutes
      .map(
        (r) =>
          `${r.method} ${r.path} (${r.controllerFile}::${r.controllerMethod}) - Request: ${r.requestDto || 'none'}, Response: ${r.responseDto || 'none'}, Auth: ${r.hasAuth ? 'yes' : 'no'} ${r.authGuards.length ? `(${r.authGuards.join(', ')})` : ''}`,
      )
      .join('\n');

    const userPrompt = `Compare these UI API requirements against backend implementation:

=== UI ENDPOINTS (what frontend calls) ===
${uiSummary || 'No endpoints extracted'}

=== BACKEND ROUTES (what backend provides) ===
${backendSummary || 'No routes extracted'}

=== UI CODE CONTEXT ===
${uiFileContents.substring(0, 30000)}

=== BACKEND CODE CONTEXT ===
${backendFileContents.substring(0, 30000)}

Return a JSON object:
{
  "missingBackendEndpoints": [
    {
      "method": "GET",
      "path": "/api/comments",
      "sourceFile": "src/hooks/useComments.ts",
      "sourceLine": 10,
      "inferredRequestType": null,
      "inferredResponseType": "Comment[]",
      "isAuthenticated": true
    }
  ],
  "unusedBackendEndpoints": [
    {
      "method": "DELETE",
      "path": "/api/admin/purge",
      "controllerFile": "src/admin/admin.controller.ts",
      "controllerMethod": "purgeData",
      "hasAuth": true,
      "authGuards": ["AdminGuard"],
      "requestDto": null,
      "responseDto": null
    }
  ],
  "typeMismatches": [
    {
      "endpoint": "GET /api/users/:id",
      "uiExpects": "{ id, name, email, role }",
      "backendProvides": "{ id, name, email, roles[] }",
      "file": "src/types/user.ts",
      "severity": "breaking|warning|info"
    }
  ],
  "authMisalignments": [
    {
      "endpoint": "POST /api/orders",
      "uiExpectsAuth": true,
      "backendHasAuth": false,
      "recommendation": "Add JwtAuthGuard to CreateOrder endpoint"
    }
  ],
  "overallCompatibility": {
    "score": 0-100,
    "summary": "Brief assessment of integration health",
    "criticalIssues": number,
    "warnings": number
  },
  "reconciliationPlan": [
    {
      "priority": "high|medium|low",
      "action": "Add GET /api/comments endpoint to backend",
      "affected": ["CommentsController"],
      "effort": "trivial|minor|moderate|significant"
    }
  ]
}`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 6000,
        messages: [{ role: 'user', content: userPrompt }],
        system: systemPrompt,
      });

      const textBlock = response.content.find((block) => block.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('No text response from Claude');
      }

      const result = JSON.parse(textBlock.text.trim());

      return {
        missingBackendEndpoints: result.missingBackendEndpoints || [],
        unusedBackendEndpoints: result.unusedBackendEndpoints || [],
        typeMismatches: result.typeMismatches || [],
        authMisalignments: result.authMisalignments || [],
        overallCompatibility: result.overallCompatibility || {
          score: 0,
          summary: 'Unable to assess',
          criticalIssues: 0,
          warnings: 0,
        },
        reconciliationPlan: result.reconciliationPlan || [],
      };
    } catch (error) {
      this.logger.error('Cross-analysis failed', error);
      return this.createEmptyResult();
    }
  }

  private createEmptyResult(): CrossAnalysisResult {
    return {
      missingBackendEndpoints: [],
      unusedBackendEndpoints: [],
      typeMismatches: [],
      authMisalignments: [],
      overallCompatibility: {
        score: 100,
        summary: 'No cross-analysis performed (missing UI or backend)',
        criticalIssues: 0,
        warnings: 0,
      },
      reconciliationPlan: [],
    };
  }
}
