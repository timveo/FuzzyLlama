import { useState, useEffect } from 'react';
import { Github, Check, X, Loader2 } from 'lucide-react';
import { githubApi } from '../../api/github';
import type { GitHubConnectionStatus } from '../../api/github';

interface GitHubConnectButtonProps {
  onConnected?: () => void;
  onDisconnected?: () => void;
}

export function GitHubConnectButton({
  onConnected,
  onDisconnected,
}: GitHubConnectButtonProps) {
  const [status, setStatus] = useState<GitHubConnectionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      setIsLoading(true);
      const connectionStatus = await githubApi.getConnectionStatus();
      setStatus(connectionStatus);
      if (connectionStatus.connected) {
        onConnected?.();
      }
    } catch (error) {
      console.error('Failed to check GitHub connection:', error);
      setStatus({ connected: false });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = () => {
    // Redirect to OAuth flow
    window.location.href = githubApi.getOAuthUrl();
  };

  const handleDisconnect = async () => {
    try {
      setIsDisconnecting(true);
      await githubApi.disconnect();
      setStatus({ connected: false });
      onDisconnected?.();
    } catch (error) {
      console.error('Failed to disconnect GitHub:', error);
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg">
        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
        <span className="text-sm text-slate-400">Checking GitHub connection...</span>
      </div>
    );
  }

  if (status?.connected) {
    return (
      <div className="flex items-center gap-3 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg">
        <div className="flex items-center gap-2">
          {status.avatarUrl ? (
            <img
              src={status.avatarUrl}
              alt={status.username}
              className="w-6 h-6 rounded-full"
            />
          ) : (
            <Github className="w-5 h-5 text-slate-300" />
          )}
          <div className="flex items-center gap-1">
            <Check className="w-4 h-4 text-green-500" />
            <span className="text-sm text-slate-300">
              {status.username || 'Connected'}
            </span>
          </div>
        </div>
        <button
          onClick={handleDisconnect}
          disabled={isDisconnecting}
          className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-red-400 transition-colors"
        >
          {isDisconnecting ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <X className="w-3 h-3" />
          )}
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
    >
      <Github className="w-5 h-5 text-slate-300" />
      <span className="text-sm text-slate-300">Connect GitHub</span>
    </button>
  );
}
