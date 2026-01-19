import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowPathIcon,
  CheckIcon,
  CloudArrowUpIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  FolderIcon,
} from '@heroicons/react/24/outline';
import { documentGitApi } from '../../api/document-git';
import { githubApi } from '../../api/github';

type ThemeMode = 'dark' | 'light';

interface DocumentGitPanelProps {
  theme: ThemeMode;
  projectId: string;
  selectedDocumentId?: string | null;
  selectedDocumentTitle?: string | null;
  onVersionSelect?: (commitHash: string, filePath: string) => void;
  githubToken?: string | null;
}

export const DocumentGitPanel: React.FC<DocumentGitPanelProps> = ({
  theme,
  projectId,
  selectedDocumentId: _selectedDocumentId,
  selectedDocumentTitle: _selectedDocumentTitle,
  onVersionSelect,
  githubToken,
}) => {
  const isDark = theme === 'dark';
  const queryClient = useQueryClient();
  const [showCommitDialog, setShowCommitDialog] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'status' | 'history' | 'branches'>('status');
  const [showPushDialog, setShowPushDialog] = useState(false);
  const [pushMessage, setPushMessage] = useState('');

  // Fetch git status
  const { data: gitStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['git-status', projectId],
    queryFn: () => documentGitApi.getStatus(projectId),
    enabled: !!projectId,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch commit history
  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['git-history', projectId],
    queryFn: () => documentGitApi.getHistory(projectId, 20),
    enabled: !!projectId && activeTab === 'history',
  });

  // Fetch branches
  const { data: branches } = useQuery({
    queryKey: ['git-branches', projectId],
    queryFn: () => documentGitApi.getBranches(projectId),
    enabled: !!projectId && activeTab === 'branches',
  });

  // Commit mutation
  const commitMutation = useMutation({
    mutationFn: (message: string) => documentGitApi.commitAll(projectId, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['git-status', projectId] });
      queryClient.invalidateQueries({ queryKey: ['git-history', projectId] });
      setShowCommitDialog(false);
      setCommitMessage('');
    },
  });

  // Sync to filesystem mutation
  const syncMutation = useMutation({
    mutationFn: () => documentGitApi.syncToFilesystem(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['git-status', projectId] });
      queryClient.invalidateQueries({ queryKey: ['git-history', projectId] });
    },
  });

  // Push to GitHub mutation
  const pushMutation = useMutation({
    mutationFn: (commitMsg: string) => {
      if (!githubToken) throw new Error('GitHub token required');
      return githubApi.pushUpdates(projectId, githubToken, commitMsg);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['git-status', projectId] });
      setShowPushDialog(false);
      setPushMessage('');
    },
  });

  const handlePush = () => {
    if (pushMessage.trim()) {
      pushMutation.mutate(pushMessage);
    }
  };

  const handleCommit = () => {
    if (commitMessage.trim()) {
      commitMutation.mutate(commitMessage);
    }
  };

  const totalChanges = (gitStatus?.staged?.length || 0) +
    (gitStatus?.unstaged?.length || 0) +
    (gitStatus?.untracked?.length || 0);

  return (
    <div className={`h-full flex flex-col rounded-xl overflow-hidden ${isDark ? 'bg-slate-800/60' : 'bg-white border border-slate-200'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-2 border-b ${isDark ? 'border-slate-700/50' : 'border-slate-200'}`}>
        <div className="flex items-center gap-2">
          <FolderIcon className={`w-4 h-4 ${isDark ? 'text-teal-400' : 'text-teal-600'}`} />
          <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-700'}`}>Version Control</span>
        </div>
        <div className="flex items-center gap-1">
          {/* Branch indicator */}
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
            {gitStatus?.branch || 'main'}
          </span>
          {/* Status indicator */}
          {gitStatus?.isClean ? (
            <span className="flex items-center gap-1 text-[10px] text-emerald-500">
              <CheckIcon className="w-3 h-3" />
              Clean
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] text-amber-500">
              <ExclamationTriangleIcon className="w-3 h-3" />
              {totalChanges} changes
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex border-b ${isDark ? 'border-slate-700/50' : 'border-slate-200'}`}>
        {(['status', 'history', 'branches'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 text-[10px] font-medium transition-colors ${
              activeTab === tab
                ? isDark
                  ? 'text-teal-300 border-b-2 border-teal-400'
                  : 'text-teal-600 border-b-2 border-teal-500'
                : isDark
                  ? 'text-slate-400 hover:text-slate-300'
                  : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2">
        <AnimatePresence mode="wait">
          {activeTab === 'status' && (
            <motion.div
              key="status"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-2"
            >
              {statusLoading ? (
                <div className="flex items-center justify-center py-4">
                  <ArrowPathIcon className={`w-4 h-4 animate-spin ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                </div>
              ) : gitStatus?.isClean ? (
                <div className={`text-center py-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <CheckIcon className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                  <p className="text-xs">All documents committed</p>
                </div>
              ) : (
                <>
                  {/* Staged files */}
                  {gitStatus?.staged && gitStatus.staged.length > 0 && (
                    <div>
                      <h4 className={`text-[10px] font-semibold mb-1 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        Staged ({gitStatus.staged.length})
                      </h4>
                      {gitStatus.staged.map((file) => (
                        <div
                          key={file}
                          className={`text-[10px] py-0.5 px-2 rounded ${isDark ? 'bg-emerald-500/10 text-emerald-300' : 'bg-emerald-50 text-emerald-700'}`}
                        >
                          {file.replace('docs/', '')}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Unstaged files */}
                  {gitStatus?.unstaged && gitStatus.unstaged.length > 0 && (
                    <div>
                      <h4 className={`text-[10px] font-semibold mb-1 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                        Modified ({gitStatus.unstaged.length})
                      </h4>
                      {gitStatus.unstaged.map((file) => (
                        <div
                          key={file}
                          className={`text-[10px] py-0.5 px-2 rounded ${isDark ? 'bg-amber-500/10 text-amber-300' : 'bg-amber-50 text-amber-700'}`}
                        >
                          {file.replace('docs/', '')}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Untracked files */}
                  {gitStatus?.untracked && gitStatus.untracked.length > 0 && (
                    <div>
                      <h4 className={`text-[10px] font-semibold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        New ({gitStatus.untracked.length})
                      </h4>
                      {gitStatus.untracked.map((file) => (
                        <div
                          key={file}
                          className={`text-[10px] py-0.5 px-2 rounded ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}
                        >
                          {file.replace('docs/', '')}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-1"
            >
              {historyLoading ? (
                <div className="flex items-center justify-center py-4">
                  <ArrowPathIcon className={`w-4 h-4 animate-spin ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                </div>
              ) : history && history.length > 0 ? (
                history.map((commit) => (
                  <div
                    key={commit.hash}
                    className={`p-2 rounded-lg cursor-pointer transition-colors ${isDark ? 'hover:bg-slate-700/50' : 'hover:bg-slate-50'}`}
                    onClick={() => {
                      if (commit.filesChanged.length > 0) {
                        onVersionSelect?.(commit.hash, commit.filesChanged[0]);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className={`text-[11px] font-medium truncate ${isDark ? 'text-white' : 'text-slate-700'}`}>
                          {commit.message}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[9px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            {commit.hash.substring(0, 7)}
                          </span>
                          <span className={`text-[9px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            •
                          </span>
                          <span className={`text-[9px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            {new Date(commit.date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <ClockIcon className={`w-3 h-3 flex-shrink-0 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                    </div>
                  </div>
                ))
              ) : (
                <div className={`text-center py-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <p className="text-xs">No commit history yet</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'branches' && (
            <motion.div
              key="branches"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-1"
            >
              {branches && branches.length > 0 ? (
                branches.map((branch) => (
                  <div
                    key={branch.name}
                    className={`p-2 rounded-lg flex items-center justify-between ${
                      branch.isCurrent
                        ? isDark
                          ? 'bg-teal-500/10 border border-teal-500/30'
                          : 'bg-teal-50 border border-teal-200'
                        : isDark
                          ? 'hover:bg-slate-700/50'
                          : 'hover:bg-slate-50'
                    }`}
                  >
                    <span className={`text-[11px] ${branch.isCurrent ? (isDark ? 'text-teal-300' : 'text-teal-700') : (isDark ? 'text-white' : 'text-slate-700')}`}>
                      {branch.name}
                    </span>
                    {branch.isCurrent && (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${isDark ? 'bg-teal-500/20 text-teal-300' : 'bg-teal-100 text-teal-600'}`}>
                        current
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className={`text-center py-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  <p className="text-xs">Only main branch exists</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action buttons */}
      <div className={`p-2 border-t ${isDark ? 'border-slate-700/50' : 'border-slate-200'}`}>
        {showCommitDialog ? (
          <div className="space-y-2">
            <input
              type="text"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Commit message..."
              autoFocus
              className={`w-full px-2 py-1.5 rounded text-[11px] ${
                isDark
                  ? 'bg-slate-700 text-white placeholder-slate-400 border border-slate-600'
                  : 'bg-white text-slate-700 placeholder-slate-400 border border-slate-200'
              }`}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCommit();
                if (e.key === 'Escape') setShowCommitDialog(false);
              }}
            />
            <div className="flex gap-1">
              <button
                onClick={() => setShowCommitDialog(false)}
                className={`flex-1 py-1 rounded text-[10px] ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Cancel
              </button>
              <button
                onClick={handleCommit}
                disabled={!commitMessage.trim() || commitMutation.isPending}
                className={`flex-1 py-1 rounded text-[10px] font-medium transition-colors ${
                  commitMessage.trim() && !commitMutation.isPending
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                }`}
              >
                {commitMutation.isPending ? 'Committing...' : 'Commit'}
              </button>
            </div>
          </div>
        ) : showPushDialog ? (
          <div className="space-y-2">
            <input
              type="text"
              value={pushMessage}
              onChange={(e) => setPushMessage(e.target.value)}
              placeholder="Push commit message..."
              autoFocus
              className={`w-full px-2 py-1.5 rounded text-[11px] ${
                isDark
                  ? 'bg-slate-700 text-white placeholder-slate-400 border border-slate-600'
                  : 'bg-white text-slate-700 placeholder-slate-400 border border-slate-200'
              }`}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handlePush();
                if (e.key === 'Escape') setShowPushDialog(false);
              }}
            />
            <div className="flex gap-1">
              <button
                onClick={() => setShowPushDialog(false)}
                className={`flex-1 py-1 rounded text-[10px] ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Cancel
              </button>
              <button
                onClick={handlePush}
                disabled={!pushMessage.trim() || pushMutation.isPending}
                className={`flex-1 py-1 rounded text-[10px] font-medium transition-colors ${
                  pushMessage.trim() && !pushMutation.isPending
                    ? 'bg-purple-500 text-white hover:bg-purple-600'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                }`}
              >
                {pushMutation.isPending ? 'Pushing...' : 'Push to GitHub'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex gap-1">
              <button
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
                className={`flex-1 py-1.5 rounded text-[10px] flex items-center justify-center gap-1 transition-colors ${
                  isDark
                    ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <ArrowPathIcon className={`w-3 h-3 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                Sync
              </button>
              <button
                onClick={() => setShowCommitDialog(true)}
                disabled={gitStatus?.isClean}
                className={`flex-1 py-1.5 rounded text-[10px] flex items-center justify-center gap-1 transition-colors ${
                  gitStatus?.isClean
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-500 text-white hover:bg-emerald-600'
                }`}
              >
                <CheckIcon className="w-3 h-3" />
                Commit
              </button>
            </div>
            {/* GitHub Push Button */}
            {githubToken && (
              <button
                onClick={() => setShowPushDialog(true)}
                disabled={!gitStatus?.isClean}
                className={`w-full py-1.5 rounded text-[10px] flex items-center justify-center gap-1 transition-colors ${
                  !gitStatus?.isClean
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : isDark
                      ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
                      : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                }`}
                title={!gitStatus?.isClean ? 'Commit all changes before pushing' : 'Push to GitHub'}
              >
                <CloudArrowUpIcon className="w-3 h-3" />
                Push to GitHub
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentGitPanel;
