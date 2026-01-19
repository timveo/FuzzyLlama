import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XMarkIcon,
  CheckIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

type ThemeMode = 'dark' | 'light';

interface GateDeliverable {
  id: string;
  name: string;
  path: string;
  icon: string;
  status: 'complete' | 'pending' | 'warning';
  description?: string;
}

interface GateData {
  gateNumber: number;
  gateName: string;
  title: string;
  description: string;
  phase: string;
  deliverables: GateDeliverable[];
  agentRecommendation: {
    agent: string;
    recommendation: 'approve' | 'review' | 'reject';
    message: string;
    confidence: number;
  };
  isSpecLock?: boolean;
  warnings?: string[];
}

interface GateApprovalProps {
  isOpen: boolean;
  onClose: () => void;
  onApprove: () => void;
  onRequestChanges: (feedback: string) => void;
  gateData: GateData;
  theme: ThemeMode;
}

// Gate information for each gate
const GATE_METADATA: Record<number, { icon: string; color: string }> = {
  0: { icon: '🎯', color: 'teal' },
  1: { icon: '📋', color: 'blue' },
  2: { icon: '🏗️', color: 'purple' },
  3: { icon: '🎨', color: 'pink' },
  4: { icon: '⚡', color: 'yellow' },
  5: { icon: '✨', color: 'emerald' },
  6: { icon: '🔗', color: 'cyan' },
  7: { icon: '🧪', color: 'orange' },
  8: { icon: '🔒', color: 'red' },
  9: { icon: '🚀', color: 'green' },
};

export const GateApproval: React.FC<GateApprovalProps> = ({
  isOpen,
  onClose,
  onApprove,
  onRequestChanges,
  gateData,
  theme,
}) => {
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isDark = theme === 'dark';

  const gateMeta = GATE_METADATA[gateData.gateNumber] || GATE_METADATA[0];
  const allDeliverablesComplete = gateData.deliverables.every(d => d.status === 'complete');

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      await onApprove();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!feedback.trim()) {
      setShowFeedbackInput(true);
      return;
    }
    setIsSubmitting(true);
    try {
      await onRequestChanges(feedback);
      setFeedback('');
      setShowFeedbackInput(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status: GateDeliverable['status']) => {
    switch (status) {
      case 'complete':
        return <CheckCircleIcon className="w-5 h-5 text-emerald-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />;
      default:
        return <div className={`w-5 h-5 rounded-full border-2 ${isDark ? 'border-slate-600' : 'border-slate-300'}`} />;
    }
  };

  const getRecommendationColor = (rec: 'approve' | 'review' | 'reject') => {
    switch (rec) {
      case 'approve':
        return isDark ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'review':
        return isDark ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-amber-50 text-amber-700 border-amber-200';
      case 'reject':
        return isDark ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-red-50 text-red-700 border-red-200';
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-end"
        onClick={onClose}
      >
        {/* Slide-in Panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className={`w-full max-w-lg h-full overflow-hidden flex flex-col ${
            isDark ? 'bg-slate-900' : 'bg-white'
          }`}
        >
          {/* Header */}
          <div className={`p-4 border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${
                  isDark ? 'bg-slate-800' : 'bg-slate-100'
                }`}>
                  {gateMeta.icon}
                </div>
                <div>
                  <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Gate {gateData.gateNumber} • {gateData.phase}
                  </p>
                  <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {gateData.gateName}
                  </h2>
                </div>
              </div>
              <button
                onClick={onClose}
                className={`p-2 rounded-lg transition-colors ${
                  isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
                }`}
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Spec-lock warning */}
            {gateData.isSpecLock && (
              <div className={`p-3 rounded-lg flex items-start gap-2 ${
                isDark ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-200'
              }`}>
                <ExclamationTriangleIcon className={`w-5 h-5 flex-shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                <div>
                  <p className={`text-sm font-medium ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
                    Spec-Lock Gate
                  </p>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-amber-400/80' : 'text-amber-700'}`}>
                    After approval, specifications will be locked. Changes will require a formal change request.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Description */}
            <div>
              <h3 className={`text-sm font-semibold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {gateData.title}
              </h3>
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {gateData.description}
              </p>
            </div>

            {/* Deliverables */}
            <div>
              <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <DocumentTextIcon className="w-4 h-4" />
                Deliverables
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  allDeliverablesComplete
                    ? isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
                    : isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-600'
                }`}>
                  {gateData.deliverables.filter(d => d.status === 'complete').length}/{gateData.deliverables.length}
                </span>
              </h3>
              <div className="space-y-2">
                {gateData.deliverables.map((deliverable) => (
                  <div
                    key={deliverable.id}
                    className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                      isDark
                        ? 'bg-slate-800/50 border-slate-700 hover:border-teal-500/50'
                        : 'bg-slate-50 border-slate-200 hover:border-teal-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(deliverable.status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{deliverable.icon}</span>
                          <span className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {deliverable.name}
                          </span>
                        </div>
                        {deliverable.description && (
                          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                            {deliverable.description}
                          </p>
                        )}
                      </div>
                      <span className={`text-xs ${isDark ? 'text-teal-400' : 'text-teal-600'}`}>
                        View →
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Warnings */}
            {gateData.warnings && gateData.warnings.length > 0 && (
              <div>
                <h3 className={`text-sm font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                  <ExclamationTriangleIcon className="w-4 h-4" />
                  Warnings
                </h3>
                <ul className="space-y-1">
                  {gateData.warnings.map((warning, idx) => (
                    <li key={idx} className={`text-sm ${isDark ? 'text-amber-400/80' : 'text-amber-600'}`}>
                      • {warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Agent Recommendation */}
            <div>
              <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <ChatBubbleLeftRightIcon className="w-4 h-4" />
                Agent Recommendation
              </h3>
              <div className={`p-4 rounded-xl border ${getRecommendationColor(gateData.agentRecommendation.recommendation)}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-sm">{gateData.agentRecommendation.agent}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                    gateData.agentRecommendation.recommendation === 'approve'
                      ? 'bg-emerald-500/30 text-emerald-200'
                      : gateData.agentRecommendation.recommendation === 'review'
                      ? 'bg-amber-500/30 text-amber-200'
                      : 'bg-red-500/30 text-red-200'
                  }`}>
                    {gateData.agentRecommendation.recommendation}
                  </span>
                  <span className={`text-xs ml-auto ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {gateData.agentRecommendation.confidence}% confidence
                  </span>
                </div>
                <p className="text-sm">{gateData.agentRecommendation.message}</p>
              </div>
            </div>

            {/* Feedback Input */}
            {showFeedbackInput && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  What changes are needed?
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Describe the changes you'd like to see..."
                  rows={3}
                  className={`w-full px-3 py-2 rounded-lg border text-sm resize-none ${
                    isDark
                      ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                  } focus:outline-none focus:ring-2 focus:ring-teal-500/50`}
                  autoFocus
                />
              </motion.div>
            )}
          </div>

          {/* Footer Actions */}
          <div className={`p-4 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (showFeedbackInput) {
                    handleRequestChanges();
                  } else {
                    setShowFeedbackInput(true);
                  }
                }}
                disabled={isSubmitting}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isDark
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                {showFeedbackInput ? 'Submit Feedback' : 'Request Changes'}
              </button>
              <button
                onClick={handleApprove}
                disabled={isSubmitting || !allDeliverablesComplete}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  allDeliverablesComplete
                    ? 'bg-teal-600 text-white hover:bg-teal-500'
                    : isDark
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                <CheckIcon className="w-4 h-4" />
                {isSubmitting ? 'Approving...' : 'Approve Gate'}
              </button>
            </div>
            {!allDeliverablesComplete && (
              <p className={`text-xs text-center mt-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                All deliverables must be complete before approval
              </p>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GateApproval;
