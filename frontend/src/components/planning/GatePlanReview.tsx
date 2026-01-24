import { useState, useMemo } from 'react';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Shield,
  Gauge,
  Loader2,
  ArrowRight,
  FileCode,
  Database,
  Layout,
  Server,
  TestTube,
  Lock,
  Rocket,
  Flag,
} from 'lucide-react';
import type {
  GatePlan,
  GateRecommendation,
  GateAction,
  GateDecision,
  GatePlanHighlight,
} from '../../api/universal-input';

interface GatePlanReviewProps {
  plan: GatePlan;
  onConfirm: (decisions: GateDecision[]) => void;
  onCancel: () => void;
  isConfirming?: boolean;
}

const gateIcons: Record<string, React.ElementType> = {
  G1: Flag,
  G2: FileCode,
  G3: Database,
  G4: Layout,
  G5: Server,
  G6: TestTube,
  G7: Lock,
  G8: Rocket,
  G9: CheckCircle,
};

const actionColors: Record<GateAction, { bg: string; text: string; border: string }> = {
  skip: { bg: 'bg-slate-700', text: 'text-slate-300', border: 'border-slate-600' },
  validate: { bg: 'bg-blue-900/50', text: 'text-blue-300', border: 'border-blue-700' },
  delta: { bg: 'bg-amber-900/50', text: 'text-amber-300', border: 'border-amber-700' },
  full: { bg: 'bg-teal-900/50', text: 'text-teal-300', border: 'border-teal-700' },
};

const highlightIcons: Record<GatePlanHighlight['type'], React.ElementType> = {
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
  info: Info,
};

const highlightColors: Record<GatePlanHighlight['type'], string> = {
  success: 'text-green-400 bg-green-900/20 border-green-800',
  warning: 'text-amber-400 bg-amber-900/20 border-amber-800',
  error: 'text-red-400 bg-red-900/20 border-red-800',
  info: 'text-blue-400 bg-blue-900/20 border-blue-800',
};

export function GatePlanReview({
  plan,
  onConfirm,
  onCancel,
  isConfirming = false,
}: GatePlanReviewProps) {
  // Track user's decisions (defaults to recommended actions)
  const [decisions, setDecisions] = useState<Record<string, GateAction>>(() => {
    const initial: Record<string, GateAction> = {};
    plan.recommendations.forEach((rec) => {
      initial[rec.gate] = rec.recommendedAction;
    });
    return initial;
  });

  const [expandedGates, setExpandedGates] = useState<Set<string>>(new Set());

  const handleActionChange = (gate: string, action: GateAction) => {
    setDecisions((prev) => ({ ...prev, [gate]: action }));
  };

  const toggleGateExpanded = (gate: string) => {
    setExpandedGates((prev) => {
      const next = new Set(prev);
      if (next.has(gate)) {
        next.delete(gate);
      } else {
        next.add(gate);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    const gateDecisions: GateDecision[] = Object.entries(decisions).map(([gate, action]) => ({
      gate,
      action,
    }));
    onConfirm(gateDecisions);
  };

  // Summary stats
  const stats = useMemo(() => {
    const counts = { skip: 0, validate: 0, delta: 0, full: 0 };
    Object.values(decisions).forEach((action) => {
      counts[action]++;
    });
    return counts;
  }, [decisions]);

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-700">
        <h2 className="text-xl font-semibold text-slate-100">Review Gate Plan</h2>
        <p className="text-sm text-slate-400 mt-1">{plan.summary}</p>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        {/* Highlights */}
        {plan.highlights.length > 0 && (
          <div className="px-6 py-4 space-y-2">
            {plan.highlights.map((highlight, idx) => {
              const Icon = highlightIcons[highlight.type];
              return (
                <div
                  key={idx}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${highlightColors[highlight.type]}`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium">{highlight.title}</div>
                    <div className="text-sm opacity-80">{highlight.description}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Security Summary */}
        {plan.securitySummary && (
          <div className="px-6 py-4 border-b border-slate-800">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-5 h-5 text-slate-400" />
              <h3 className="text-sm font-medium text-slate-300">Security Summary</h3>
            </div>
            <div className="flex gap-4 text-sm">
              {plan.securitySummary.criticalCount > 0 && (
                <span className="text-red-400">
                  {plan.securitySummary.criticalCount} Critical
                </span>
              )}
              {plan.securitySummary.highCount > 0 && (
                <span className="text-orange-400">
                  {plan.securitySummary.highCount} High
                </span>
              )}
              {plan.securitySummary.mediumCount > 0 && (
                <span className="text-amber-400">
                  {plan.securitySummary.mediumCount} Medium
                </span>
              )}
              {plan.securitySummary.lowCount > 0 && (
                <span className="text-slate-400">
                  {plan.securitySummary.lowCount} Low
                </span>
              )}
            </div>
          </div>
        )}

        {/* Quality Summary */}
        {plan.qualitySummary && (
          <div className="px-6 py-4 border-b border-slate-800">
            <div className="flex items-center gap-2 mb-3">
              <Gauge className="w-5 h-5 text-slate-400" />
              <h3 className="text-sm font-medium text-slate-300">Quality Summary</h3>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-slate-400">
                Test Coverage: <span className="text-slate-200">{plan.qualitySummary.testCoverage}%</span>
              </span>
              <span className="text-slate-400">
                Overall Score:{' '}
                <span
                  className={
                    plan.qualitySummary.overallScore >= 80
                      ? 'text-green-400'
                      : plan.qualitySummary.overallScore >= 60
                        ? 'text-amber-400'
                        : 'text-red-400'
                  }
                >
                  {plan.qualitySummary.overallScore}/100
                </span>
              </span>
            </div>
          </div>
        )}

        {/* Gate Recommendations */}
        <div className="px-6 py-4 space-y-3">
          <h3 className="text-sm font-medium text-slate-300 mb-4">
            Gate Decisions
          </h3>

          {plan.recommendations.map((rec) => (
            <GateDecisionCard
              key={rec.gate}
              recommendation={rec}
              selectedAction={decisions[rec.gate]}
              onActionChange={(action) => handleActionChange(rec.gate, action)}
              isExpanded={expandedGates.has(rec.gate)}
              onToggleExpanded={() => toggleGateExpanded(rec.gate)}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-700 bg-slate-800/50">
        {/* Summary badges */}
        <div className="flex items-center gap-4 mb-4 text-sm">
          <span className="text-slate-400">Plan Summary:</span>
          {stats.skip > 0 && (
            <span className="px-2 py-1 bg-slate-700 rounded text-slate-300">
              {stats.skip} Skip
            </span>
          )}
          {stats.validate > 0 && (
            <span className="px-2 py-1 bg-blue-900/50 rounded text-blue-300">
              {stats.validate} Validate
            </span>
          )}
          {stats.delta > 0 && (
            <span className="px-2 py-1 bg-amber-900/50 rounded text-amber-300">
              {stats.delta} Delta
            </span>
          )}
          {stats.full > 0 && (
            <span className="px-2 py-1 bg-teal-900/50 rounded text-teal-300">
              {stats.full} Full
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={onCancel}
            disabled={isConfirming}
            className="px-4 py-2 text-sm text-slate-300 hover:text-slate-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isConfirming}
            className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg text-sm font-medium text-white transition-colors"
          >
            {isConfirming ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Confirming...
              </>
            ) : (
              <>
                Confirm & Start
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

interface GateDecisionCardProps {
  recommendation: GateRecommendation;
  selectedAction: GateAction;
  onActionChange: (action: GateAction) => void;
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

function GateDecisionCard({
  recommendation,
  selectedAction,
  onActionChange,
  isExpanded,
  onToggleExpanded,
}: GateDecisionCardProps) {
  const Icon = gateIcons[recommendation.gate] || Flag;
  const isModified = selectedAction !== recommendation.recommendedAction;

  return (
    <div
      className={`border rounded-lg transition-colors ${
        isModified ? 'border-amber-600 bg-amber-900/10' : 'border-slate-700 bg-slate-800/50'
      }`}
    >
      {/* Header - Always visible */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer"
        onClick={onToggleExpanded}
      >
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-700">
          <Icon className="w-5 h-5 text-slate-300" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-200">{recommendation.gate}</span>
            <span className="text-slate-400">—</span>
            <span className="text-slate-300">{recommendation.gateName}</span>
            {isModified && (
              <span className="text-xs px-2 py-0.5 bg-amber-800 text-amber-200 rounded">
                Modified
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 truncate">{recommendation.reason}</p>
        </div>

        <div className={`px-3 py-1.5 rounded-md text-sm font-medium ${actionColors[selectedAction].bg} ${actionColors[selectedAction].text}`}>
          {selectedAction.charAt(0).toUpperCase() + selectedAction.slice(1)}
        </div>

        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        )}
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-slate-700/50 pt-4">
          {/* Question */}
          <p className="text-sm text-slate-300 mb-4">{recommendation.userQuestion}</p>

          {/* Existing artifacts */}
          {recommendation.existingArtifacts.length > 0 && (
            <div className="mb-4">
              <span className="text-xs text-slate-500 uppercase tracking-wide">
                Found Artifacts:
              </span>
              <div className="flex flex-wrap gap-2 mt-1">
                {recommendation.existingArtifacts.map((artifact, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-2 py-1 bg-slate-700 text-slate-300 rounded"
                  >
                    {artifact}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Options */}
          <div className="space-y-2">
            {recommendation.options.map((option) => (
              <label
                key={option.action}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedAction === option.action
                    ? `${actionColors[option.action].border} ${actionColors[option.action].bg}`
                    : 'border-slate-700 hover:border-slate-600'
                }`}
              >
                <input
                  type="radio"
                  name={`gate-${recommendation.gate}`}
                  checked={selectedAction === option.action}
                  onChange={() => onActionChange(option.action)}
                  className="mt-1 accent-teal-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-200">{option.label}</span>
                    {option.isRecommended && (
                      <span className="text-xs px-1.5 py-0.5 bg-teal-800 text-teal-200 rounded">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400 mt-0.5">{option.description}</p>
                </div>
              </label>
            ))}
          </div>

          {/* Confidence indicator */}
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
            <span>AI Confidence:</span>
            <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden max-w-[100px]">
              <div
                className={`h-full rounded-full ${
                  recommendation.confidence >= 0.8
                    ? 'bg-green-500'
                    : recommendation.confidence >= 0.5
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                }`}
                style={{ width: `${recommendation.confidence * 100}%` }}
              />
            </div>
            <span>{Math.round(recommendation.confidence * 100)}%</span>
          </div>
        </div>
      )}
    </div>
  );
}
