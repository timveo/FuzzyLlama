import { X, FileImage, Github, Loader2, AlertCircle } from 'lucide-react';

export type AssetSource = 'LOCAL_UPLOAD' | 'GITHUB';

export interface AttachedFile {
  id: string;
  filename: string;
  size: number;
  source: AssetSource;
  tempKey?: string;
  previewUrl?: string;
  isUploading?: boolean;
  error?: string;
  // GitHub metadata
  githubOwner?: string;
  githubRepo?: string;
  githubPath?: string;
}

interface AttachedFilesListProps {
  files: AttachedFile[];
  onRemove: (id: string) => void;
  className?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function AttachedFilesList({ files, onRemove, className = '' }: AttachedFilesListProps) {
  if (files.length === 0) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      <p className="text-xs text-slate-500 uppercase tracking-wide">
        Attached Files ({files.length})
      </p>
      <div className="flex flex-wrap gap-2">
        {files.map((file) => (
          <div
            key={file.id}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg text-sm
              ${file.error
                ? 'bg-red-900/30 border border-red-700'
                : 'bg-slate-700/50 border border-slate-600'
              }
            `}
          >
            {/* Source icon */}
            {file.isUploading ? (
              <Loader2 className="w-4 h-4 text-teal-500 animate-spin flex-shrink-0" />
            ) : file.error ? (
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            ) : file.source === 'GITHUB' ? (
              <Github className="w-4 h-4 text-slate-400 flex-shrink-0" />
            ) : (
              <FileImage className="w-4 h-4 text-slate-400 flex-shrink-0" />
            )}

            {/* File info */}
            <div className="flex flex-col min-w-0">
              <span className={`truncate max-w-[150px] ${file.error ? 'text-red-300' : 'text-slate-200'}`}>
                {file.filename}
              </span>
              {file.error ? (
                <span className="text-xs text-red-400">{file.error}</span>
              ) : file.source === 'GITHUB' && file.githubRepo ? (
                <span className="text-xs text-slate-500 truncate max-w-[150px]">
                  {file.githubOwner}/{file.githubRepo}
                </span>
              ) : (
                <span className="text-xs text-slate-500">{formatFileSize(file.size)}</span>
              )}
            </div>

            {/* Remove button */}
            <button
              onClick={() => onRemove(file.id)}
              className="p-1 hover:bg-slate-600 rounded transition-colors flex-shrink-0"
              title="Remove"
            >
              <X className="w-3 h-3 text-slate-400" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
