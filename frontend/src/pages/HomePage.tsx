import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Home,
  FolderOpen,
  Layout,
  Settings,
  ChevronDown,
  LogOut,
  Moon,
  Sun,
  Gift,
  MessageCircle,
  ArrowRight,
  Plus,
  Palette,
  GraduationCap,
  Users,
  Loader2,
} from 'lucide-react';
import { useThemeStore } from '../stores/theme';
import { useAuthStore } from '../stores/auth';
import { SettingsModal } from '../components/SettingsModal';
import { CreateProjectModal } from '../components/CreateProjectModal';
import { AttachmentMenu } from '../components/uploads/AttachmentMenu';
import { AttachedFilesList } from '../components/uploads/AttachedFilesList';
import type { AttachedFile } from '../components/uploads/AttachedFilesList';
import { FileUploadZone } from '../components/uploads/FileUploadZone';
import { GitHubImportModal } from '../components/uploads/GitHubImportModal';
import { AnalysisProgress } from '../components/planning';
import { projectsApi } from '../api/projects';
import { workflowApi } from '../api/workflow';
import { assetsApi } from '../api/assets';
import type { TempImportResult } from '../api/github';
import {
  universalInputApi,
  useAnalysisStatus,
} from '../api/universal-input';
import FuzzyLlamaLogo from '../assets/Llamalogo.png';
import FuzzyLlamaLogoTransparent from '../assets/Llamalogo-transparent.png';

// Helper functions for project creation
// Note: The backend uses Claude to extract a proper project name from the requirements
// This is just a temporary placeholder until the workflow starts
function extractProjectName(_description: string): string {
  return 'New Project';
}

function inferProjectType(description: string): 'traditional' | 'ai_ml' | 'hybrid' | 'enhancement' {
  const lowerDesc = description.toLowerCase();
  if (lowerDesc.includes('ai') || lowerDesc.includes('ml') || lowerDesc.includes('machine learning') ||
      lowerDesc.includes('chatbot') || lowerDesc.includes('gpt') || lowerDesc.includes('llm')) {
    return 'ai_ml';
  }
  if (lowerDesc.includes('enhance') || lowerDesc.includes('existing') ||
      lowerDesc.includes('add feature') || lowerDesc.includes('improve')) {
    return 'enhancement';
  }
  return 'traditional';
}

const HomePage = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useThemeStore();
  const { user, logout } = useAuthStore();
  const isDark = theme === 'dark';
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [promptValue, setPromptValue] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // File upload state
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [showUploadZone, setShowUploadZone] = useState(false);
  const [showGitHubModal, setShowGitHubModal] = useState(false);
  const [gitHubModalMode, setGitHubModalMode] = useState<'connected' | 'url'>('connected');
  const [sessionId] = useState(() => crypto.randomUUID());

  // Universal Input Handler state
  const [analysisSessionId, setAnalysisSessionId] = useState<string | null>(null);
  const [showAnalysisProgress, setShowAnalysisProgress] = useState(false);
  const [pendingRequirements, setPendingRequirements] = useState<string>('');

  // Query for analysis status (polls while analysis is in progress)
  const { data: analysisStatus } = useAnalysisStatus(
    analysisSessionId,
    showAnalysisProgress
  );

  // When analysis completes, automatically create project with intelligent decisions
  useEffect(() => {
    if (analysisStatus?.status === 'complete' && analysisSessionId && pendingRequirements) {
      // Auto-proceed with intelligent gate decisions
      handleAnalysisComplete();
    } else if (analysisStatus?.status === 'failed') {
      setShowAnalysisProgress(false);
      toast.error(analysisStatus.error || 'Analysis failed');
      setIsCreating(false);
    }
  }, [analysisStatus?.status]);

  // Handle analysis completion - create project with auto-generated GateContext
  const handleAnalysisComplete = async () => {
    if (!analysisSessionId) return;

    try {
      // Get the gate plan with AI-generated decisions (use recommended actions)
      const planResult = await universalInputApi.getGatePlan(analysisSessionId);

      if (!planResult.success || !planResult.plan) {
        throw new Error(planResult.error || 'Failed to generate gate plan');
      }

      // Auto-accept all AI recommendations
      const decisions = planResult.plan.recommendations.map(rec => ({
        gate: rec.gate,
        action: rec.recommendedAction,
      }));

      // Confirm the plan and get GateContext
      const confirmResult = await universalInputApi.confirmGatePlan(analysisSessionId, decisions);

      if (!confirmResult.success || !confirmResult.context) {
        throw new Error(confirmResult.error || 'Failed to confirm gate plan');
      }

      // Create the project
      const project = await projectsApi.create({
        name: extractProjectName(pendingRequirements),
        type: inferProjectType(pendingRequirements),
        description: pendingRequirements,
      });

      // Associate uploaded files with the project
      const tempKeys = attachedFiles
        .filter(f => f.tempKey && !f.error)
        .map(f => f.tempKey!);

      if (tempKeys.length > 0) {
        await assetsApi.associateWithProject(project.id, tempKeys);
      }

      // Start workflow with GateContext - assumptions will be shown in chat
      await workflowApi.startWithContext({
        projectId: project.id,
        requirements: pendingRequirements,
        gateContext: confirmResult.context,
      });

      // Clear state and navigate
      setAttachedFiles([]);
      setShowAnalysisProgress(false);
      setAnalysisSessionId(null);
      setPendingRequirements('');
      navigate(`/workspace?project=${project.id}&new=true`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create project');
      setShowAnalysisProgress(false);
      setIsCreating(false);
    }
  };

  // File upload handlers
  const handleFilesSelected = useCallback(async (files: File[]) => {
    for (const file of files) {
      const tempId = crypto.randomUUID();

      // Add to list with uploading state
      setAttachedFiles(prev => [
        ...prev,
        {
          id: tempId,
          filename: file.name,
          size: file.size,
          source: 'LOCAL_UPLOAD',
          isUploading: true,
        },
      ]);

      try {
        // Upload to temp storage
        const result = await assetsApi.uploadTemp(file, sessionId);

        // Update with success
        setAttachedFiles(prev =>
          prev.map(f =>
            f.id === tempId
              ? {
                  ...f,
                  tempKey: result.tempKey,
                  previewUrl: result.signedUrl,
                  isUploading: false,
                }
              : f
          )
        );
      } catch (error) {
        // Update with error
        setAttachedFiles(prev =>
          prev.map(f =>
            f.id === tempId
              ? {
                  ...f,
                  isUploading: false,
                  error: error instanceof Error ? error.message : 'Upload failed',
                }
              : f
          )
        );
      }
    }
    setShowUploadZone(false);
  }, [sessionId]);

  const handleRemoveFile = useCallback(async (id: string) => {
    const file = attachedFiles.find(f => f.id === id);
    if (file?.tempKey) {
      try {
        await assetsApi.deleteTempUpload(file.tempKey);
      } catch (error) {
        console.error('Failed to delete temp upload:', error);
      }
    }
    setAttachedFiles(prev => prev.filter(f => f.id !== id));
  }, [attachedFiles]);

  // GitHub import handler
  const handleGitHubImport = useCallback((imports: TempImportResult[]) => {
    const newFiles: AttachedFile[] = imports.map(imp => ({
      id: crypto.randomUUID(),
      tempKey: imp.tempKey,
      filename: imp.filename,
      size: imp.size,
      previewUrl: imp.signedUrl,
      source: 'GITHUB',
      githubPath: imp.githubPath,
      isUploading: false,
    }));
    setAttachedFiles(prev => [...prev, ...newFiles]);
  }, []);

  // Mutation for creating project and starting workflow
  const createProjectMutation = useMutation({
    mutationFn: async (description: string) => {
      // Track start time to ensure minimum loading display
      const startTime = Date.now();
      const MIN_LOADING_TIME = 5000; // 5 seconds minimum

      // Create the project
      const project = await projectsApi.create({
        name: extractProjectName(description),
        type: inferProjectType(description),
        description,
      });

      // Associate any uploaded files with the project
      const tempKeys = attachedFiles
        .filter(f => f.tempKey && !f.error)
        .map(f => f.tempKey!);

      if (tempKeys.length > 0) {
        await assetsApi.associateWithProject(project.id, tempKeys);
      }

      // Start the workflow
      await workflowApi.start({
        projectId: project.id,
        requirements: description,
      });

      // Ensure minimum loading time for better UX
      const elapsed = Date.now() - startTime;
      if (elapsed < MIN_LOADING_TIME) {
        await new Promise(resolve => setTimeout(resolve, MIN_LOADING_TIME - elapsed));
      }

      return project;
    },
    onSuccess: (project) => {
      // Clear attached files
      setAttachedFiles([]);
      // Navigate to workspace with new project
      navigate(`/workspace?project=${project.id}&new=true`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create project');
      setIsCreating(false);
    },
  });

  const handlePromptSubmit = async () => {
    const prompt = promptValue.trim();
    if (!prompt) return;

    setIsCreating(true);

    // Check if we have code files attached (trigger Universal Input Handler)
    const codeFiles = attachedFiles.filter(f =>
      !f.error && f.tempKey && (
        f.filename.endsWith('.ts') ||
        f.filename.endsWith('.tsx') ||
        f.filename.endsWith('.js') ||
        f.filename.endsWith('.jsx') ||
        f.filename.endsWith('.py') ||
        f.filename.endsWith('.prisma') ||
        f.filename.endsWith('.yaml') ||
        f.filename.endsWith('.yml') ||
        f.filename.endsWith('.json') ||
        f.filename.endsWith('.md')
      )
    );

    if (codeFiles.length > 0) {
      // Use Universal Input Handler flow
      try {
        setPendingRequirements(prompt);

        // Associate files with temp session first
        const tempKeys = attachedFiles
          .filter(f => f.tempKey && !f.error)
          .map(f => f.tempKey!);

        // Start analysis with the uploaded assets
        const analysisResult = await universalInputApi.startAnalysis(
          sessionId,
          tempKeys,
          { includeSecurityScan: true, includeQualityMetrics: true }
        );

        setAnalysisSessionId(analysisResult.sessionId);
        setShowAnalysisProgress(true);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to start analysis');
        setIsCreating(false);
      }
    } else {
      // Standard flow without file analysis
      createProjectMutation.mutate(prompt);
    }
  };

  // Handle analysis cancellation
  const handleCancelAnalysis = () => {
    setShowAnalysisProgress(false);
    setAnalysisSessionId(null);
    setPendingRequirements('');
    setIsCreating(false);
  };

  const handleCreateFromModal = () => {
    setShowCreateModal(false);
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden">
      {/* Modals */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onProjectCreated={handleCreateFromModal}
      />
      <GitHubImportModal
        isOpen={showGitHubModal}
        onClose={() => setShowGitHubModal(false)}
        onImportComplete={handleGitHubImport}
        sessionId={sessionId}
        initialMode={gitHubModalMode}
      />

      {/* Analysis Progress overlay */}
      <AnimatePresence>
        {showAnalysisProgress && analysisStatus && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/95 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg"
            >
              <AnalysisProgress
                status={analysisStatus}
                onCancel={handleCancelAnalysis}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Standard creating overlay (no analysis) */}
      <AnimatePresence>
        {isCreating && !showAnalysisProgress && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="text-center"
            >
              <motion.img
                src={FuzzyLlamaLogoTransparent}
                alt="Creating..."
                animate={{
                  scale: [1, 1.08, 1],
                  rotate: [0, 2, -2, 0]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="w-40 h-40 mx-auto mb-6"
              />
              <motion.p
                className="text-2xl text-white font-medium"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                Creating your project...
              </motion.p>
              <motion.p
                className="text-slate-400 mt-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                Setting up the Product Manager agent
              </motion.p>
              <motion.div
                className="mt-6 flex justify-center gap-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-teal-500"
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }}
                  />
                ))}
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <div className={`w-56 flex flex-col ${isDark ? 'bg-slate-900' : 'bg-slate-900'} text-white`}>
        {/* Logo */}
        <div className="p-4 flex items-center gap-3">
          <img src={FuzzyLlamaLogo} alt="Fuzzy Llama" className="w-16 h-16" />
          <span className="font-semibold text-lg">Fuzzy Llama</span>
        </div>

        {/* Workspace Selector */}
        <div className="px-3 mb-4">
          <button className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-teal-600 rounded text-xs flex items-center justify-center font-bold">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <span className="text-sm">{user?.name || 'User'}'s Space</span>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1">
          <NavItem icon={Home} label="Home" active isDark={true} />

          <div className="pt-4 pb-2">
            <span className="px-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Projects</span>
          </div>
          <NavItem icon={FolderOpen} label="Projects" onClick={() => navigate('/workspace')} isDark={true} />
          <NavItem icon={Plus} label="New project" onClick={() => setShowCreateModal(true)} isDark={true} />

          <div className="pt-4 pb-2">
            <span className="px-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Workspace</span>
          </div>
          <NavItem icon={Layout} label="Workspace" onClick={() => navigate('/workspace')} isDark={true} />
          <NavItem icon={Settings} label="Settings" onClick={() => setShowSettings(true)} isDark={true} />
        </nav>

        {/* Bottom Section */}
        <div className="p-3 space-y-2">
          {/* Share CTA */}
          <div className="p-3 rounded-lg bg-slate-800/50 border-slate-700 border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Share Fuzzy Llama</p>
                <p className="text-xs text-slate-400">Get 10 credits each</p>
              </div>
              <Gift className="w-5 h-5 text-slate-400" />
            </div>
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <MessageCircle className="w-5 h-5 text-slate-400 ml-auto" />
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-full left-0 mb-2 w-64 bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-hidden"
              >
                <div className="p-4 border-b border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-lg font-medium">
                      {user?.name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <p className="font-medium">{user?.name || 'User'}</p>
                      <p className="text-sm text-slate-400">{user?.email || 'user@example.com'}</p>
                    </div>
                  </div>
                </div>
                <div className="p-2">
                  <MenuButton icon={Settings} label="Settings" onClick={() => { setShowUserMenu(false); setShowSettings(true); }} />
                  <MenuButton
                    icon={isDark ? Sun : Moon}
                    label="Appearance"
                    onClick={toggleTheme}
                    hasArrow
                  />
                  <MenuButton icon={GraduationCap} label="Documentation" />
                  <MenuButton icon={Users} label="Community" />
                  <div className="my-2 border-t border-slate-700" />
                  <MenuButton icon={LogOut} label="Sign out" onClick={logout} />
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative overflow-hidden">
        {/* Gradient Background */}
        <div
          className="absolute inset-0"
          style={{
            background: isDark
              ? 'radial-gradient(ellipse at 50% 30%, #1e574f 0%, #1e3a5f 40%, #1a365d 70%, #1e293b 100%)'
              : 'radial-gradient(ellipse at 50% 30%, #134e4a 0%, #164e63 40%, #1e3a5f 70%, #1e293b 100%)',
          }}
        />

        {/* Animated Gradient Overlay */}
        <div
          className="absolute inset-0 opacity-50"
          style={{
            background: isDark
              ? 'radial-gradient(circle at 30% 40%, rgba(20, 184, 166, 0.4) 0%, transparent 50%), radial-gradient(circle at 70% 60%, rgba(59, 130, 246, 0.3) 0%, transparent 50%)'
              : 'radial-gradient(circle at 30% 40%, rgba(20, 184, 166, 0.3) 0%, transparent 50%), radial-gradient(circle at 70% 60%, rgba(59, 130, 246, 0.2) 0%, transparent 50%)',
          }}
        />

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col px-8">
          {/* Spacer for heading positioning */}
          <div className="flex-1 flex flex-col items-center justify-end pb-4">
            {/* Large White Llama */}
            <motion.img
              src={FuzzyLlamaLogoTransparent}
              alt="Fuzzy Llama"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', delay: 0.05 }}
              className="w-48 h-48 mb-4"
            />
            {/* Main Heading */}
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl md:text-5xl font-bold text-center text-white"
            >
              What do you want to build, {user?.name?.split(' ')[0] || 'there'}?
            </motion.h1>
          </div>

          {/* Prompt Input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="w-full max-w-2xl mx-auto flex-1 flex items-start pt-8"
          >
            <div className={`w-full rounded-2xl ${
              isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-slate-800/90 border-slate-700'
            } backdrop-blur-md border overflow-hidden shadow-xl`}>
              {/* Input Area */}
              <div className="p-4">
                {/* Text Input */}
                <input
                  type="text"
                  value={promptValue}
                  onChange={(e) => setPromptValue(e.target.value)}
                  placeholder="Describe what you want to build..."
                  className="w-full bg-transparent outline-none text-lg text-white placeholder-slate-500"
                  onKeyDown={(e) => e.key === 'Enter' && handlePromptSubmit()}
                />

                {/* Attached Files */}
                <AttachedFilesList
                  files={attachedFiles}
                  onRemove={handleRemoveFile}
                  className="mt-3"
                />

                {/* Upload Zone (shown when triggered) */}
                {showUploadZone && (
                  <div className="mt-3">
                    <FileUploadZone
                      onFilesSelected={handleFilesSelected}
                      disabled={isCreating}
                    />
                  </div>
                )}
              </div>

              {/* Action Bar */}
              <div className={`flex items-center justify-between px-4 py-3 border-t ${
                isDark ? 'border-slate-700' : 'border-slate-700'
              }`}>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowUploadZone(!showUploadZone)}
                    disabled={isCreating}
                    className="p-2 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Upload files"
                  >
                    <Plus className="w-5 h-5 text-slate-400" />
                  </button>
                  <AttachmentMenu
                    attachedCount={attachedFiles.filter(f => !f.error).length}
                    onUploadFromDevice={() => setShowUploadZone(!showUploadZone)}
                    onImportFromGitHub={() => {
                      setGitHubModalMode('connected');
                      setShowGitHubModal(true);
                    }}
                    onPasteGitHubUrl={() => {
                      setGitHubModalMode('url');
                      setShowGitHubModal(true);
                    }}
                    disabled={isCreating}
                  />
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-700 transition-colors">
                    <Palette className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-400">Theme</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-700 transition-colors">
                    <MessageCircle className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-400">Chat</span>
                  </button>
                  <button
                    onClick={handlePromptSubmit}
                    disabled={isCreating || !promptValue.trim()}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                      isCreating || !promptValue.trim()
                        ? 'bg-slate-600 cursor-not-allowed'
                        : 'bg-teal-600 hover:bg-teal-500'
                    }`}
                  >
                    {isCreating ? (
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                    ) : (
                      <ArrowRight className="w-4 h-4 text-white" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

// Helper Components
const NavItem = ({
  icon: Icon,
  label,
  active = false,
  onClick,
  isDark = false
}: {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick?: () => void;
  isDark?: boolean;
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
      active
        ? isDark ? 'bg-slate-700 text-white' : 'bg-teal-700 text-white'
        : isDark ? 'text-slate-400 hover:bg-slate-700 hover:text-white' : 'text-teal-200 hover:bg-teal-700 hover:text-white'
    }`}
  >
    <Icon className="w-5 h-5" />
    <span className="text-sm flex-1 text-left">{label}</span>
  </button>
);

const MenuButton = ({
  icon: Icon,
  label,
  onClick,
  hasArrow = false
}: {
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
  hasArrow?: boolean;
}) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
  >
    <Icon className="w-5 h-5" />
    <span className="text-sm flex-1 text-left">{label}</span>
    {hasArrow && <ArrowRight className="w-4 h-4 text-slate-500" />}
  </button>
);

export default HomePage;
