import { useState, useEffect } from 'react';
import { ChevronDown, Lock, Globe, Loader2, RefreshCw } from 'lucide-react';
import { githubApi } from '../../api/github';
import type { GitHubRepository } from '../../api/github';

interface GitHubRepoSelectorProps {
  selectedRepo: { owner: string; repo: string } | null;
  onSelectRepo: (owner: string, repo: string) => void;
  githubToken?: string; // Optional - uses OAuth token if connected
}

export function GitHubRepoSelector({
  selectedRepo,
  onSelectRepo,
  githubToken,
}: GitHubRepoSelectorProps) {
  const [repos, setRepos] = useState<GitHubRepository[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRepositories();
  }, []);

  const fetchRepositories = async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Use OAuth endpoint (token handled by backend)
      const repositories = githubToken
        ? await githubApi.listRepositories(githubToken, 1, 50)
        : await githubApi.listRepositoriesOAuth(1, 50);
      setRepos(repositories);
    } catch (err) {
      console.error('Failed to fetch repositories:', err);
      setError('Failed to load repositories');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (repo: GitHubRepository) => {
    const [owner, repoName] = repo.fullName.split('/');
    onSelectRepo(owner, repoName);
    setIsOpen(false);
  };

  const selectedRepoData = repos.find(
    (r) => r.fullName === `${selectedRepo?.owner}/${selectedRepo?.repo}`
  );

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="flex items-center justify-between w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-left hover:border-slate-600 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              <span className="text-sm text-slate-400">Loading repositories...</span>
            </>
          ) : selectedRepoData ? (
            <>
              {selectedRepoData.private ? (
                <Lock className="w-4 h-4 text-slate-400 flex-shrink-0" />
              ) : (
                <Globe className="w-4 h-4 text-slate-400 flex-shrink-0" />
              )}
              <span className="text-sm text-slate-200 truncate">
                {selectedRepoData.fullName}
              </span>
            </>
          ) : (
            <span className="text-sm text-slate-400">Select a repository</span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 max-h-64 overflow-y-auto bg-slate-800 border border-slate-700 rounded-lg shadow-xl">
          {error ? (
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-red-400">{error}</span>
              <button
                onClick={fetchRepositories}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-300"
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </button>
            </div>
          ) : repos.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-400">
              No repositories found
            </div>
          ) : (
            repos.map((repo) => (
              <button
                key={repo.fullName}
                onClick={() => handleSelect(repo)}
                className={`w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-slate-700 transition-colors ${
                  selectedRepoData?.fullName === repo.fullName ? 'bg-slate-700' : ''
                }`}
              >
                {repo.private ? (
                  <Lock className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <Globe className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <div className="text-sm text-slate-200 truncate">
                    {repo.fullName}
                  </div>
                  {repo.description && (
                    <div className="text-xs text-slate-500 truncate mt-0.5">
                      {repo.description}
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
