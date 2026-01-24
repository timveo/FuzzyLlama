import { useState, useEffect } from 'react';
import {
  Folder,
  File,
  ChevronRight,
  ChevronDown,
  Check,
  Loader2,
  ArrowLeft,
  Image,
  FileCode,
  FileJson,
  FileText,
} from 'lucide-react';
import { githubApi } from '../../api/github';
import type { GitHubContentItem } from '../../api/github';

interface GitHubFileBrowserProps {
  owner: string;
  repo: string;
  selectedFiles: string[];
  onSelectFiles: (files: string[]) => void;
  onBack?: () => void;
  githubToken?: string; // Optional - uses OAuth token if connected
}

interface TreeNode extends GitHubContentItem {
  children?: TreeNode[];
  isLoading?: boolean;
  isExpanded?: boolean;
}

const ALLOWED_EXTENSIONS = [
  // Images
  'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp',
  // Code
  'js', 'ts', 'tsx', 'jsx', 'json', 'md', 'html', 'css', 'yaml', 'yml', 'txt',
];

function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) {
    return <Image className="w-4 h-4 text-purple-400" />;
  }
  if (['js', 'ts', 'tsx', 'jsx'].includes(ext)) {
    return <FileCode className="w-4 h-4 text-yellow-400" />;
  }
  if (ext === 'json') {
    return <FileJson className="w-4 h-4 text-green-400" />;
  }
  if (['md', 'txt'].includes(ext)) {
    return <FileText className="w-4 h-4 text-blue-400" />;
  }
  return <File className="w-4 h-4 text-slate-400" />;
}

function isAllowedFile(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return ALLOWED_EXTENSIONS.includes(ext);
}

export function GitHubFileBrowser({
  owner,
  repo,
  selectedFiles,
  onSelectFiles,
  onBack,
  githubToken,
}: GitHubFileBrowserProps) {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState('');

  useEffect(() => {
    loadContents('');
  }, [owner, repo, githubToken]);

  const loadContents = async (path: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const contents = await githubApi.getRepoContents(owner, repo, path, githubToken);

      // Sort: directories first, then files
      const sorted = contents.sort((a, b) => {
        if (a.type === 'dir' && b.type !== 'dir') return -1;
        if (a.type !== 'dir' && b.type === 'dir') return 1;
        return a.name.localeCompare(b.name);
      });

      setTree(sorted.map((item) => ({ ...item, isExpanded: false })));
      setCurrentPath(path);
    } catch (err) {
      console.error('Failed to load contents:', err);
      setError('Failed to load repository contents');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFolder = async (node: TreeNode) => {
    if (node.type !== 'dir') return;

    if (!node.isExpanded && !node.children) {
      // Load children
      setTree((prev) =>
        prev.map((n) =>
          n.path === node.path ? { ...n, isLoading: true } : n
        )
      );

      try {
        const contents = await githubApi.getRepoContents(
          owner,
          repo,
          node.path,
          githubToken
        );

        const sorted = contents.sort((a, b) => {
          if (a.type === 'dir' && b.type !== 'dir') return -1;
          if (a.type !== 'dir' && b.type === 'dir') return 1;
          return a.name.localeCompare(b.name);
        });

        setTree((prev) =>
          prev.map((n) =>
            n.path === node.path
              ? { ...n, children: sorted, isLoading: false, isExpanded: true }
              : n
          )
        );
      } catch {
        setTree((prev) =>
          prev.map((n) =>
            n.path === node.path ? { ...n, isLoading: false } : n
          )
        );
      }
    } else {
      // Toggle expanded state
      setTree((prev) =>
        prev.map((n) =>
          n.path === node.path ? { ...n, isExpanded: !n.isExpanded } : n
        )
      );
    }
  };

  const handleToggleSelect = (filePath: string) => {
    if (selectedFiles.includes(filePath)) {
      onSelectFiles(selectedFiles.filter((f) => f !== filePath));
    } else {
      onSelectFiles([...selectedFiles, filePath]);
    }
  };

  const handleNavigateUp = () => {
    if (currentPath) {
      const parentPath = currentPath.split('/').slice(0, -1).join('/');
      loadContents(parentPath);
    }
  };

  const renderNode = (node: TreeNode, depth = 0) => {
    const isSelected = selectedFiles.includes(node.path);
    const isSelectable = node.type === 'file' && isAllowedFile(node.name);

    return (
      <div key={node.path}>
        <div
          className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
            isSelected ? 'bg-teal-600/20' : 'hover:bg-slate-700'
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => {
            if (node.type === 'dir') {
              handleToggleFolder(node);
            } else if (isSelectable) {
              handleToggleSelect(node.path);
            }
          }}
        >
          {/* Expand/collapse icon for folders */}
          {node.type === 'dir' && (
            <span className="w-4 h-4 flex items-center justify-center">
              {node.isLoading ? (
                <Loader2 className="w-3 h-3 animate-spin text-slate-400" />
              ) : node.isExpanded ? (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              )}
            </span>
          )}

          {/* Checkbox for files */}
          {node.type === 'file' && (
            <span
              className={`w-4 h-4 flex items-center justify-center rounded border ${
                isSelectable
                  ? isSelected
                    ? 'bg-teal-600 border-teal-600'
                    : 'border-slate-500'
                  : 'border-slate-700 opacity-50'
              }`}
            >
              {isSelected && <Check className="w-3 h-3 text-white" />}
            </span>
          )}

          {/* Icon */}
          {node.type === 'dir' ? (
            <Folder className="w-4 h-4 text-blue-400" />
          ) : (
            getFileIcon(node.name)
          )}

          {/* Name */}
          <span
            className={`text-sm truncate ${
              node.type === 'file' && !isSelectable
                ? 'text-slate-500'
                : 'text-slate-200'
            }`}
          >
            {node.name}
          </span>

          {/* Size for files */}
          {node.type === 'file' && (
            <span className="text-xs text-slate-500 ml-auto">
              {formatFileSize(node.size)}
            </span>
          )}
        </div>

        {/* Render children */}
        {node.isExpanded && node.children && (
          <div>
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        <span className="ml-2 text-sm text-slate-400">Loading repository...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-red-400">{error}</p>
        <button
          onClick={() => loadContents(currentPath)}
          className="mt-2 text-sm text-teal-400 hover:text-teal-300"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-700">
        {onBack && (
          <button
            onClick={onBack}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-slate-400" />
          </button>
        )}
        <span className="text-sm font-medium text-slate-200">
          {owner}/{repo}
        </span>
        {currentPath && (
          <>
            <span className="text-slate-500">/</span>
            <span className="text-sm text-slate-400">{currentPath}</span>
          </>
        )}
      </div>

      {/* Breadcrumb navigation */}
      {currentPath && (
        <button
          onClick={handleNavigateUp}
          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to parent folder
        </button>
      )}

      {/* File tree */}
      <div className="flex-1 overflow-y-auto py-2">
        {tree.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-400">
            This folder is empty
          </div>
        ) : (
          tree.map((node) => renderNode(node))
        )}
      </div>

      {/* Selected count */}
      {selectedFiles.length > 0 && (
        <div className="px-3 py-2 border-t border-slate-700 bg-slate-800">
          <span className="text-sm text-slate-300">
            {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
          </span>
        </div>
      )}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
