// Gate Approval Popup Component

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { GateApprovalData, ThemeMode } from './types';

interface GateApprovalPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onApprove: () => void;
  onDeny: () => void;
  gateData: GateApprovalData;
  theme: ThemeMode;
}

export const GateApprovalPopup = ({
  isOpen,
  onClose,
  onApprove,
  onDeny,
  gateData,
  theme
}: GateApprovalPopupProps) => {
  const [denyReason, setDenyReason] = useState('');
  const [showDenyInput, setShowDenyInput] = useState(false);
  const isDark = theme === 'dark';

  if (!isOpen) return null;

  const completedCount = gateData.checklist.filter(c => c.completed).length;
  const totalCount = gateData.checklist.length;

  const handleDeny = () => {
    if (showDenyInput && denyReason.trim()) {
      onDeny();
      setShowDenyInput(false);
      setDenyReason('');
    } else {
      setShowDenyInput(true);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden ${
            isDark ? 'bg-slate-800 border border-slate-700' : 'bg-teal-900 border border-teal-700'
          }`}
        >
          {/* Header */}
          <div className={`p-4 border-b ${isDark ? 'border-slate-700 bg-slate-800/80' : 'border-teal-700 bg-teal-800/80'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white font-bold">
                  G{gateData.gateNumber}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{gateData.title}</h2>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-teal-300'}`}>Gate {gateData.gateNumber} Approval Required</p>
                </div>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Description */}
            <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-teal-100'}`}>
              {gateData.description}
            </p>

            {/* Checklist */}
            <div className={`rounded-xl p-3 ${isDark ? 'bg-slate-700/50' : 'bg-teal-800/50'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-semibold uppercase ${isDark ? 'text-slate-400' : 'text-teal-300'}`}>
                  Checklist
                </span>
                <span className="text-xs text-emerald-400 font-medium">
                  {completedCount}/{totalCount} complete
                </span>
              </div>
              <div className="space-y-2">
                {gateData.checklist.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded flex items-center justify-center ${
                      item.completed ? 'bg-emerald-500' : isDark ? 'bg-slate-600' : 'bg-teal-700'
                    }`}>
                      {item.completed && <CheckIcon className="w-3 h-3 text-white" />}
                    </div>
                    <span className={`text-sm ${item.completed ? 'text-emerald-400' : isDark ? 'text-slate-300' : 'text-teal-200'}`}>
                      {item.item}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Artifacts */}
            <div className={`rounded-xl p-3 ${isDark ? 'bg-slate-700/50' : 'bg-teal-800/50'}`}>
              <span className={`text-xs font-semibold uppercase ${isDark ? 'text-slate-400' : 'text-teal-300'}`}>
                Artifacts
              </span>
              <div className="flex flex-wrap gap-2 mt-2">
                {gateData.artifacts.map((artifact, i) => (
                  <span key={i} className={`text-xs px-2 py-1 rounded-full ${
                    isDark ? 'bg-slate-600 text-slate-300' : 'bg-teal-700 text-teal-200'
                  }`}>
                    {artifact}
                  </span>
                ))}
              </div>
            </div>

            {/* Agent Recommendation */}
            <div className={`rounded-xl p-3 border-l-4 border-teal-500 ${isDark ? 'bg-teal-950/10' : 'bg-teal-600/20'}`}>
              <div className="flex items-start gap-2">
                <span className="text-lg">🤖</span>
                <div>
                  <span className={`text-xs font-semibold ${isDark ? 'text-teal-400' : 'text-teal-300'}`}>Agent Recommendation</span>
                  <p className={`text-sm mt-1 ${isDark ? 'text-slate-300' : 'text-teal-100'}`}>
                    {gateData.agentRecommendation}
                  </p>
                </div>
              </div>
            </div>

            {/* Deny reason input */}
            {showDenyInput && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className={`rounded-xl p-3 ${isDark ? 'bg-red-500/10 border border-red-500/30' : 'bg-red-500/20 border border-red-400/30'}`}
              >
                <label className="text-xs font-semibold text-red-400 block mb-2">
                  Reason for denial (will be sent to Agent Orchestrator)
                </label>
                <textarea
                  value={denyReason}
                  onChange={(e) => setDenyReason(e.target.value)}
                  placeholder="Describe what needs to be addressed..."
                  className={`w-full h-20 rounded-lg p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500 ${
                    isDark ? 'bg-slate-700 text-white placeholder-slate-400' : 'bg-teal-800 text-white placeholder-teal-400'
                  }`}
                />
              </motion.div>
            )}
          </div>

          {/* Actions */}
          <div className={`p-4 border-t ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-teal-700 bg-teal-800/50'}`}>
            <div className="flex gap-3">
              <button
                onClick={handleDeny}
                className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
                  showDenyInput && !denyReason.trim()
                    ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                    : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                }`}
                disabled={showDenyInput && !denyReason.trim()}
              >
                {showDenyInput ? 'Submit Denial' : 'Deny'}
              </button>
              <button
                onClick={onApprove}
                className="flex-1 py-3 rounded-xl font-medium bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
              >
                Approve Gate
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
