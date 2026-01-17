// Popup components for UnifiedDashboard

import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import type { ThemeMode } from './types';
import { GitHubIcon } from './shared';

// GitHub Actions Popup
interface GitHubPopupProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeMode;
}

export const GitHubPopup = ({ isOpen, onClose, theme }: GitHubPopupProps) => {
  if (!isOpen) return null;
  const isDark = theme === 'dark';

  const actions = [
    { label: 'Run Workflow', desc: 'Trigger a GitHub Action' },
    { label: 'Sync Repository', desc: 'Pull latest changes' },
    { label: 'View Actions', desc: 'See workflow history' },
    { label: 'Deploy', desc: 'Deploy to production' },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-start justify-end p-4 pt-16"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className={`rounded-2xl shadow-xl border w-72 overflow-hidden ${
            isDark ? 'bg-slate-800 border-slate-700' : 'bg-teal-900 border-teal-700'
          }`}
        >
          <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-slate-700' : 'border-teal-700'}`}>
            <div className="flex items-center gap-2">
              <GitHubIcon className="w-5 h-5 text-white" />
              <span className="font-semibold text-white">GitHub Actions</span>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
          <div className="p-2">
            {actions.map((action) => (
              <button
                key={action.label}
                className={`w-full flex flex-col p-3 rounded-xl transition-colors text-left ${
                  isDark ? 'hover:bg-slate-700' : 'hover:bg-teal-800'
                }`}
              >
                <span className="text-sm font-medium text-white">{action.label}</span>
                <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-teal-300'}`}>{action.desc}</span>
              </button>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Settings Popup
interface SettingsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
}

export const SettingsPopup = ({ isOpen, onClose, theme, onToggleTheme }: SettingsPopupProps) => {
  if (!isOpen) return null;
  const isDark = theme === 'dark';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-start justify-end p-4 pt-16"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className={`rounded-2xl shadow-xl border w-64 overflow-hidden ${
            isDark ? 'bg-slate-800 border-slate-700' : 'bg-teal-900 border-teal-700'
          }`}
        >
          <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-slate-700' : 'border-teal-700'}`}>
            <span className="font-semibold text-white">Settings</span>
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
          <div className="p-2">
            <button
              onClick={onToggleTheme}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                isDark ? 'hover:bg-slate-700' : 'hover:bg-teal-800'
              }`}
            >
              {isDark ? (
                <SunIcon className="w-5 h-5 text-amber-400" />
              ) : (
                <MoonIcon className="w-5 h-5 text-teal-300" />
              )}
              <span className="text-sm text-white">
                {isDark ? 'Light Mode' : 'Dark Mode'}
              </span>
            </button>
            <button className={`w-full flex flex-col p-3 rounded-xl transition-colors text-left ${
              isDark ? 'hover:bg-slate-700' : 'hover:bg-teal-800'
            }`}>
              <span className="text-sm text-white">Profile</span>
            </button>
            <button className={`w-full flex flex-col p-3 rounded-xl transition-colors text-left ${
              isDark ? 'hover:bg-slate-700' : 'hover:bg-teal-800'
            }`}>
              <span className="text-sm text-white">Preferences</span>
            </button>
            <div className={`border-t my-2 ${isDark ? 'border-slate-700' : 'border-teal-700'}`} />
            <button className={`w-full flex flex-col p-3 rounded-xl transition-colors text-left ${
              isDark ? 'hover:bg-red-500/20' : 'hover:bg-red-500/20'
            }`}>
              <span className="text-sm text-red-400">Sign Out</span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
