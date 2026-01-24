import { useCallback, useRef, useState } from 'react';
import { Upload, X, File, AlertCircle } from 'lucide-react';

interface FileUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  maxFileSize?: number;
  acceptedTypes?: string[];
  disabled?: boolean;
  className?: string;
}

const DEFAULT_MAX_FILES = 10;
const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
// Accept images and code files
const DEFAULT_ACCEPTED_TYPES = [
  // Images
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/svg+xml',
  'image/webp',
  // Code/text files
  'text/plain',
  'text/markdown',
  'text/x-markdown',
  'text/typescript',
  'text/javascript',
  'application/json',
  'application/x-yaml',
  'text/yaml',
  'text/x-python',
  'application/javascript',
  'application/typescript',
];

// File extensions to accept (used in accept attribute)
const DEFAULT_ACCEPTED_EXTENSIONS = [
  // Images
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp',
  // Code files
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.prisma', '.yaml', '.yml', '.json', '.md',
  '.html', '.css', '.scss', '.sass', '.less',
  '.go', '.rs', '.java', '.kt', '.swift', '.rb',
  '.php', '.sql', '.graphql', '.gql',
  '.env', '.env.example', '.gitignore', '.dockerignore',
  '.dockerfile', 'Dockerfile',
  '.toml', '.ini', '.cfg', '.conf',
];

export function FileUploadZone({
  onFilesSelected,
  maxFiles = DEFAULT_MAX_FILES,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  disabled = false,
  className = '',
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFiles = useCallback(
    (files: File[]): { valid: File[]; errors: string[] } => {
      const valid: File[] = [];
      const errors: string[] = [];

      for (const file of files) {
        // Check by MIME type or file extension
        const extension = '.' + file.name.split('.').pop()?.toLowerCase();
        const isTypeAllowed = acceptedTypes.includes(file.type) ||
          DEFAULT_ACCEPTED_EXTENSIONS.includes(extension) ||
          // Handle files with empty MIME type (common for code files)
          (file.type === '' && DEFAULT_ACCEPTED_EXTENSIONS.includes(extension)) ||
          // Handle text/plain for various code files
          file.type === 'text/plain';

        if (!isTypeAllowed) {
          errors.push(`${file.name}: File type not allowed`);
          continue;
        }

        if (file.size > maxFileSize) {
          errors.push(`${file.name}: File too large (max ${maxFileSize / 1024 / 1024}MB)`);
          continue;
        }

        valid.push(file);
      }

      if (valid.length > maxFiles) {
        errors.push(`Only ${maxFiles} files allowed`);
        return { valid: valid.slice(0, maxFiles), errors };
      }

      return { valid, errors };
    },
    [acceptedTypes, maxFileSize, maxFiles]
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const fileArray = Array.from(files);
      const { valid, errors } = validateFiles(fileArray);

      if (errors.length > 0) {
        setError(errors.join('; '));
        setTimeout(() => setError(null), 5000);
      }

      if (valid.length > 0) {
        onFilesSelected(valid);
      }
    },
    [validateFiles, onFilesSelected]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      handleFiles(e.dataTransfer.files);
    },
    [disabled, handleFiles]
  );

  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files);
      // Reset input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [handleFiles]
  );

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={[...acceptedTypes, ...DEFAULT_ACCEPTED_EXTENSIONS].join(',')}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />

      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
          transition-all duration-200
          ${isDragging
            ? 'border-teal-500 bg-teal-500/10'
            : 'border-slate-600 hover:border-slate-500 bg-slate-800/50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <div className="flex flex-col items-center gap-3">
          {isDragging ? (
            <>
              <Upload className="w-8 h-8 text-teal-500 animate-bounce" />
              <p className="text-teal-500 font-medium">Drop files here</p>
            </>
          ) : (
            <>
              <File className="w-8 h-8 text-slate-400" />
              <div>
                <p className="text-slate-300">
                  <span className="text-teal-500 font-medium">Click to upload</span> or drag and drop
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  Images, code files, configs (max {maxFileSize / 1024 / 1024}MB)
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-2 flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto p-1 hover:bg-slate-700 rounded"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
