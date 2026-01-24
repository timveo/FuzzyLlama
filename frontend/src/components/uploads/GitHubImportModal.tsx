import { useState, useEffect } from 'react';
import { X, Github, Loader2 } from 'lucide-react';
import { GitHubConnectButton } from './GitHubConnectButton';
import { GitHubRepoSelector } from './GitHubRepoSelector';
import { GitHubFileBrowser } from './GitHubFileBrowser';
import { GitHubUrlInput } from './GitHubUrlInput';
import { githubApi } from '../../api/github';
import type { GitHubConnectionStatus, TempImportResult } from '../../api/github';

type ImportMode = 'connected' | 'url';

interface GitHubImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (imports: TempImportResult[]) => void;
  sessionId: string;
  initialMode?: ImportMode;
}

export function GitHubImportModal({
  isOpen,
  onClose,
  onImportComplete,
  sessionId,
  initialMode,
}: GitHubImportModalProps) {
  const [mode, setMode] = useState<ImportMode>(initialMode || 'connected');
  const [connectionStatus, setConnectionStatus] = useState<GitHubConnectionStatus | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<{ owner: string; repo: string } | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // GitHub token from settings (fallback for manual token entry)
  const githubToken = localStorage.getItem('github_token') || '';

  useEffect(() => {
    if (isOpen) {
      checkConnection();
    }
  }, [isOpen]);

  const checkConnection = async () => {
    try {
      const status = await githubApi.getConnectionStatus();
      setConnectionStatus(status);
      // If connected, use connected mode; otherwise default to URL mode
      if (status.connected) {
        setMode('connected');
      } else if (!initialMode) {
        setMode('url');
      }
    } catch {
      setConnectionStatus({ connected: false });
    }
  };

  const handleImport = async () => {
    if (!selectedRepo || selectedFiles.length === 0) return;

    try {
      setIsImporting(true);
      setError(null);

      // Use OAuth token (handled by backend) or fallback to manual token
      const results = await githubApi.importFilesToTemp(
        selectedRepo.owner,
        selectedRepo.repo,
        selectedFiles,
        sessionId,
        githubToken || undefined
      );

      if (results.length === 0) {
        setError('Failed to import any files. Please try again.');
        return;
      }

      onImportComplete(results);
      onClose();
    } catch (err) {
      console.error('Failed to import files:', err);
      setError('Failed to import files. Please check your permissions and try again.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleRepoSelected = (owner: string, repo: string) => {
    setSelectedRepo({ owner, repo });
    setSelectedFiles([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[80vh] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <Github className="w-5 h-5 text-slate-300" />
            <h2 className="text-lg font-semibold text-slate-100">
              Import from GitHub
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex border-b border-slate-700">
          <button
            onClick={() => setMode('connected')}
            className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
              mode === 'connected'
                ? 'text-teal-400 border-b-2 border-teal-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            Connected Account
          </button>
          <button
            onClick={() => setMode('url')}
            className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
              mode === 'url'
                ? 'text-teal-400 border-b-2 border-teal-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            Paste URL
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {mode === 'connected' ? (
            <div className="h-full flex flex-col">
              {/* Connection status */}
              <div className="px-6 py-4 border-b border-slate-800">
                <GitHubConnectButton
                  onConnected={checkConnection}
                  onDisconnected={() => {
                    setConnectionStatus({ connected: false });
                    setSelectedRepo(null);
                    setSelectedFiles([]);
                  }}
                />
              </div>

              {connectionStatus?.connected && (
                <>
                  {/* Repo selector */}
                  <div className="px-6 py-4 border-b border-slate-800">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Select Repository
                    </label>
                    <GitHubRepoSelector
                      selectedRepo={selectedRepo}
                      onSelectRepo={handleRepoSelected}
                    />
                  </div>

                  {/* File browser */}
                  {selectedRepo && (
                    <div className="flex-1 overflow-hidden">
                      <GitHubFileBrowser
                        owner={selectedRepo.owner}
                        repo={selectedRepo.repo}
                        selectedFiles={selectedFiles}
                        onSelectFiles={setSelectedFiles}
                      />
                    </div>
                  )}
                </>
              )}

              {!connectionStatus?.connected && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-sm text-slate-400 mb-4">
                      Connect your GitHub account to browse your repositories
                    </p>
                    <p className="text-xs text-slate-500">
                      Or use the "Paste URL" tab to import from a public repository
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col">
              {!selectedRepo ? (
                <div className="p-6">
                  <GitHubUrlInput
                    onRepoSelected={handleRepoSelected}
                  />
                </div>
              ) : (
                <div className="flex-1 overflow-hidden">
                  <GitHubFileBrowser
                    owner={selectedRepo.owner}
                    repo={selectedRepo.repo}
                    selectedFiles={selectedFiles}
                    onSelectFiles={setSelectedFiles}
                    onBack={() => {
                      setSelectedRepo(null);
                      setSelectedFiles([]);
                    }}
                    githubToken={githubToken || undefined}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-700 flex items-center justify-between">
          <div className="text-sm text-slate-400">
            {selectedFiles.length > 0 && (
              <span>
                {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {error && (
              <span className="text-sm text-red-400">{error}</span>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-300 hover:text-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={isImporting || selectedFiles.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg text-sm text-white transition-colors"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importing...
                </>
              ) : (
                `Import ${selectedFiles.length > 0 ? selectedFiles.length : ''} File${selectedFiles.length !== 1 ? 's' : ''}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
