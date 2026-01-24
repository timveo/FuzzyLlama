import { useState } from 'react';
import { Link, Loader2, AlertCircle } from 'lucide-react';
import { githubApi } from '../../api/github';

interface GitHubUrlInputProps {
  onRepoSelected: (owner: string, repo: string) => void;
  onCancel?: () => void;
}

export function GitHubUrlInput({ onRepoSelected, onCancel }: GitHubUrlInputProps) {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!url.trim()) {
      setError('Please enter a GitHub URL');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const result = await githubApi.parseUrl(url.trim());
      onRepoSelected(result.owner, result.repo);
    } catch (err) {
      console.error('Failed to parse URL:', err);
      setError('Invalid GitHub URL. Please enter a valid repository URL.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            GitHub Repository URL
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Link className="w-4 h-4 text-slate-400" />
            </div>
            <input
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError(null);
              }}
              placeholder="https://github.com/owner/repo"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            Enter the URL of a public GitHub repository to browse files
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-slate-300 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isLoading || !url.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg text-sm text-white transition-colors"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Checking...
              </>
            ) : (
              'Browse Files'
            )}
          </button>
        </div>
      </form>

      <div className="text-xs text-slate-500">
        <p className="font-medium mb-1">Supported URL formats:</p>
        <ul className="space-y-0.5 list-disc list-inside">
          <li>https://github.com/owner/repo</li>
          <li>https://github.com/owner/repo.git</li>
          <li>https://github.com/owner/repo/tree/branch</li>
        </ul>
      </div>
    </div>
  );
}
