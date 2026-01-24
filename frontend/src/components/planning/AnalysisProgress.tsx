import { useMemo } from 'react';
import {
  Loader2,
  CheckCircle,
  XCircle,
  FileSearch,
  Code,
  Server,
  GitCompare,
  Sparkles,
} from 'lucide-react';
import type { AnalysisStatus, InputClassification } from '../../api/universal-input';

interface AnalysisProgressProps {
  status: AnalysisStatus;
  onCancel?: () => void;
}

const phaseInfo: Record<
  string,
  { icon: React.ElementType; label: string; description: string }
> = {
  pending: {
    icon: Loader2,
    label: 'Initializing',
    description: 'Preparing files for analysis...',
  },
  classifying: {
    icon: FileSearch,
    label: 'Classifying',
    description: 'Detecting frameworks, file types, and project structure...',
  },
  'analyzing-ui': {
    icon: Code,
    label: 'Analyzing UI',
    description: 'Extracting API endpoints, state patterns, and components...',
  },
  'analyzing-backend': {
    icon: Server,
    label: 'Analyzing Backend',
    description: 'Extracting routes, schemas, auth patterns, and security issues...',
  },
  'cross-analyzing': {
    icon: GitCompare,
    label: 'Cross-Analysis',
    description: 'Comparing UI requirements against backend implementation...',
  },
  complete: {
    icon: CheckCircle,
    label: 'Complete',
    description: 'Analysis finished successfully!',
  },
  failed: {
    icon: XCircle,
    label: 'Failed',
    description: 'Analysis encountered an error.',
  },
};

export function AnalysisProgress({ status, onCancel }: AnalysisProgressProps) {
  const phase = phaseInfo[status.status] || phaseInfo.pending;
  const PhaseIcon = phase.icon;
  const isActive = status.status !== 'complete' && status.status !== 'failed';
  const isFailed = status.status === 'failed';

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      {/* Animated icon */}
      <div
        className={`relative w-20 h-20 rounded-full flex items-center justify-center mb-6 ${
          isFailed
            ? 'bg-red-900/30'
            : status.status === 'complete'
              ? 'bg-green-900/30'
              : 'bg-slate-800'
        }`}
      >
        {isActive && (
          <div className="absolute inset-0 rounded-full border-2 border-teal-500/30 animate-ping" />
        )}
        <PhaseIcon
          className={`w-10 h-10 ${
            isFailed
              ? 'text-red-400'
              : status.status === 'complete'
                ? 'text-green-400'
                : 'text-teal-400'
          } ${isActive && status.status !== 'pending' ? '' : ''}`}
        />
        {isActive && (
          <Loader2 className="absolute w-20 h-20 text-teal-500/50 animate-spin" />
        )}
      </div>

      {/* Phase label */}
      <h3 className="text-xl font-semibold text-slate-100 mb-2">{phase.label}</h3>
      <p className="text-sm text-slate-400 mb-4 max-w-md">
        {status.currentPhase || phase.description}
      </p>

      {/* Progress bar */}
      {isActive && (
        <div className="w-full max-w-xs mb-4">
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-500 rounded-full transition-all duration-500"
              style={{ width: `${status.progress}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">{status.progress}% complete</p>
        </div>
      )}

      {/* Error message */}
      {isFailed && status.error && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-4 max-w-md">
          <p className="text-sm text-red-400">{status.error}</p>
        </div>
      )}

      {/* Classification preview (shown while analyzing) */}
      {status.classification && status.status !== 'failed' && (
        <ClassificationPreview classification={status.classification} />
      )}

      {/* Cancel button */}
      {isActive && onCancel && (
        <button
          onClick={onCancel}
          className="mt-4 px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          Cancel Analysis
        </button>
      )}
    </div>
  );
}

function ClassificationPreview({
  classification,
}: {
  classification: InputClassification;
}) {
  const badges = useMemo(() => {
    const items: { label: string; color: string }[] = [];

    // Completeness
    const completenessLabels: Record<string, string> = {
      'prompt-only': 'Text Only',
      'ui-only': 'Frontend',
      'backend-only': 'Backend',
      'full-stack': 'Full-Stack',
      'contracts-only': 'Contracts',
      'docs-only': 'Documentation',
    };
    items.push({
      label: completenessLabels[classification.completeness] || classification.completeness,
      color: 'bg-slate-700 text-slate-300',
    });

    // UI Framework
    if (classification.uiFramework && classification.uiFramework !== 'unknown') {
      items.push({
        label: classification.uiFramework,
        color: 'bg-blue-900/50 text-blue-300',
      });
    }

    // Backend Framework
    if (classification.backendFramework && classification.backendFramework !== 'unknown') {
      items.push({
        label: classification.backendFramework,
        color: 'bg-green-900/50 text-green-300',
      });
    }

    // ORM
    if (classification.orm && classification.orm !== 'none' && classification.orm !== 'unknown') {
      items.push({
        label: classification.orm,
        color: 'bg-purple-900/50 text-purple-300',
      });
    }

    // Auth
    if (classification.authType && classification.authType !== 'none' && classification.authType !== 'unknown') {
      items.push({
        label: `${classification.authType} auth`,
        color: 'bg-amber-900/50 text-amber-300',
      });
    }

    return items;
  }, [classification]);

  return (
    <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700 max-w-md">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-teal-400" />
        <span className="text-sm font-medium text-slate-300">Detected</span>
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        {badges.map((badge, idx) => (
          <span
            key={idx}
            className={`text-xs px-2.5 py-1 rounded-full ${badge.color}`}
          >
            {badge.label}
          </span>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs text-slate-400">
        <div>
          <div className="text-lg font-semibold text-slate-200">
            {classification.totalFiles}
          </div>
          <div>Files</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-slate-200">
            {classification.codeFiles}
          </div>
          <div>Code</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-slate-200">
            {classification.configFiles}
          </div>
          <div>Config</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-slate-200">
            {Math.round(classification.confidence * 100)}%
          </div>
          <div>Confidence</div>
        </div>
      </div>
    </div>
  );
}
