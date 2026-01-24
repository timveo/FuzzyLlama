import { useState, useRef, useEffect } from 'react';
import { Paperclip, Upload, Github, Link, ChevronDown } from 'lucide-react';

interface AttachmentMenuProps {
  onUploadFromDevice: () => void;
  onImportFromGitHub: () => void;
  onPasteGitHubUrl: () => void;
  attachedCount: number;
  isGitHubConnected?: boolean;
  disabled?: boolean;
}

export function AttachmentMenu({
  onUploadFromDevice,
  onImportFromGitHub,
  onPasteGitHubUrl,
  attachedCount,
  isGitHubConnected = false,
  disabled = false,
}: AttachmentMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuItemClick = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors
          ${disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:bg-slate-700'
          }
        `}
      >
        <Paperclip className="w-4 h-4 text-slate-400" />
        <span className="text-sm text-slate-400">
          Attach
          {attachedCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-teal-600 text-white rounded-full">
              {attachedCount}
            </span>
          )}
        </span>
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-56 py-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
          <button
            onClick={() => handleMenuItemClick(onUploadFromDevice)}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-300 hover:bg-slate-700 transition-colors"
          >
            <Upload className="w-4 h-4 text-slate-400" />
            <div>
              <div>Upload from device</div>
              <div className="text-xs text-slate-500">Images, mockups, designs</div>
            </div>
          </button>

          <button
            onClick={() => handleMenuItemClick(onImportFromGitHub)}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-300 hover:bg-slate-700 transition-colors"
          >
            <Github className="w-4 h-4 text-slate-400" />
            <div>
              <div>Import from GitHub</div>
              <div className="text-xs text-slate-500">
                {isGitHubConnected ? 'Browse your repositories' : 'Connect to access repos'}
              </div>
            </div>
          </button>

          <div className="h-px bg-slate-700 my-1" />

          <button
            onClick={() => handleMenuItemClick(onPasteGitHubUrl)}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-300 hover:bg-slate-700 transition-colors"
          >
            <Link className="w-4 h-4 text-slate-400" />
            <div>
              <div>Paste GitHub URL</div>
              <div className="text-xs text-slate-500">Import from any public repo</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
