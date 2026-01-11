import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
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
  Paperclip,
  Palette,
} from 'lucide-react';
import { useThemeStore } from '../stores/theme';
import { useAuthStore } from '../stores/auth';
import { projectsApi } from '../api/projects';
import type { Project } from '../types';
import FuzzyLlamaLogo from '../assets/fuzzy-llama-logo.svg';

const HomePage = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useThemeStore();
  const { user, logout } = useAuthStore();
  const isDark = theme === 'dark';
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [promptValue, setPromptValue] = useState('');

  // Fetch real projects from API
  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(),
  });

  // Quick actions with navigation targets
  const quickActions = [
    { label: 'start a new project', route: '/projects/new', icon: Plus },
    { label: 'view projects', route: '/dashboard', icon: FolderOpen },
    { label: 'open workspace', route: '/workspace', icon: Layout },
  ];

  const handleQuickAction = (route: string) => {
    navigate(route);
  };

  const handlePromptSubmit = () => {
    // Parse prompt to determine navigation
    const prompt = promptValue.toLowerCase();
    if (prompt.includes('new project') || prompt.includes('create')) {
      navigate('/projects/new');
    } else if (prompt.includes('project')) {
      navigate('/dashboard');
    } else {
      navigate('/workspace');
    }
  };

  // Get phase from project state
  const getProjectPhase = (project: Project): string => {
    return project.state?.currentPhase || 'Setup';
  };

  // Calculate progress from project state
  const getProjectProgress = (project: Project): number => {
    return project.state?.percentComplete || 0;
  };

  // Get recent projects (up to 3)
  const recentProjects = projects?.slice(0, 3) || [];

  return (
    <div className="h-screen w-screen flex overflow-hidden">
      {/* Sidebar */}
      <div className={`w-56 flex flex-col ${isDark ? 'bg-slate-900' : 'bg-teal-800'} text-white`}>
        {/* Logo */}
        <div className="p-4 flex items-center gap-2">
          <div className="w-9 h-9 bg-gradient-to-br from-teal-400 to-teal-600 rounded-lg flex items-center justify-center p-1">
            <img src={FuzzyLlamaLogo} alt="Fuzzy Llama" className="w-full h-full" />
          </div>
          <span className="font-semibold text-lg">Fuzzy Llama</span>
        </div>

        {/* Workspace Selector */}
        <div className="px-3 mb-4">
          <button className={`w-full flex items-center justify-between px-3 py-2 rounded-lg ${isDark ? 'bg-slate-800 hover:bg-slate-700' : 'bg-teal-700 hover:bg-teal-600'} transition-colors`}>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-teal-600 rounded text-xs flex items-center justify-center font-bold">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <span className="text-sm">{user?.name || 'User'}'s Space</span>
            </div>
            <ChevronDown className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-teal-300'}`} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1">
          <NavItem icon={Home} label="Home" active isDark={isDark} />

          <div className="pt-4 pb-2">
            <span className={`px-3 text-xs font-medium ${isDark ? 'text-slate-500' : 'text-teal-300'} uppercase tracking-wider`}>Projects</span>
          </div>
          <NavItem icon={FolderOpen} label="Projects" onClick={() => navigate('/dashboard')} isDark={isDark} />
          <NavItem icon={Plus} label="New project" onClick={() => navigate('/projects/new')} isDark={isDark} />

          <div className="pt-4 pb-2">
            <span className={`px-3 text-xs font-medium ${isDark ? 'text-slate-500' : 'text-teal-300'} uppercase tracking-wider`}>Workspace</span>
          </div>
          <NavItem icon={Layout} label="Workspace" onClick={() => navigate('/workspace')} isDark={isDark} />
          <NavItem icon={Settings} label="Settings" onClick={() => navigate('/settings')} isDark={isDark} />
        </nav>

        {/* Bottom Section */}
        <div className="p-3 space-y-2">
          {/* Share CTA */}
          <div className={`p-3 rounded-lg ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-teal-700/50 border-teal-600'} border`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Share Fuzzy Llama</p>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-teal-300'}`}>Get 10 credits each</p>
              </div>
              <Gift className={`w-5 h-5 ${isDark ? 'text-slate-400' : 'text-teal-300'}`} />
            </div>
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className={`w-full flex items-center gap-2 p-2 rounded-lg ${isDark ? 'hover:bg-slate-800' : 'hover:bg-teal-700'} transition-colors`}
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
                  <MenuButton icon={Settings} label="Settings" onClick={() => navigate('/settings')} />
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
              ? 'radial-gradient(ellipse at 50% 30%, #134e4a 0%, #0f172a 50%, #020617 100%)'
              : 'radial-gradient(ellipse at 50% 20%, #99f6e4 0%, #5eead4 20%, #2dd4bf 40%, #14b8a6 60%, #0d9488 80%, #0f766e 100%)',
          }}
        />

        {/* Animated Gradient Overlay */}
        <div
          className="absolute inset-0 opacity-60"
          style={{
            background: isDark
              ? 'radial-gradient(circle at 30% 40%, rgba(20, 184, 166, 0.3) 0%, transparent 50%), radial-gradient(circle at 70% 60%, rgba(59, 130, 246, 0.2) 0%, transparent 50%)'
              : 'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.3) 0%, transparent 40%), radial-gradient(circle at 70% 70%, rgba(20, 184, 166, 0.4) 0%, transparent 50%)',
          }}
        />

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center px-8">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6"
          >
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
              isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white/90 border-teal-200'
            } backdrop-blur-sm border`}>
              <span className={`text-sm ${isDark ? 'text-white' : 'text-teal-800'}`}>
                Your <span className={`${isDark ? 'text-teal-400' : 'text-teal-600'} font-bold`}>2025</span> Fuzzy Llama journey starts here
              </span>
              <ArrowRight className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-teal-500'}`} />
            </div>
          </motion.div>

          {/* Main Heading */}
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className={`text-4xl md:text-5xl font-bold text-center mb-8 ${isDark ? 'text-white' : 'text-teal-900'}`}
          >
            What should we build, {user?.name?.split(' ')[0] || 'there'}?
          </motion.h1>

          {/* Prompt Input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="w-full max-w-2xl"
          >
            <div className={`rounded-2xl ${
              isDark ? 'bg-slate-800/90 border-slate-700' : 'bg-white/95 border-teal-200'
            } backdrop-blur-md border overflow-hidden shadow-xl`}>
              {/* Input Area */}
              <div className="p-4">
                <div className={`flex items-center gap-2 mb-3 ${isDark ? 'text-slate-400' : 'text-teal-600'}`}>
                  <span className="text-sm">Start a project to</span>
                </div>

                {/* Quick Action Pills */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {quickActions.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => handleQuickAction(action.route)}
                      className={`px-3 py-1.5 rounded-full text-sm flex items-center gap-1.5 ${
                        isDark
                          ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                          : 'bg-teal-100 hover:bg-teal-200 text-teal-700'
                      } transition-colors`}
                    >
                      <action.icon className="w-3.5 h-3.5" />
                      {action.label}
                    </button>
                  ))}
                </div>

                {/* Text Input */}
                <input
                  type="text"
                  value={promptValue}
                  onChange={(e) => setPromptValue(e.target.value)}
                  placeholder="Describe what you want to build..."
                  className={`w-full bg-transparent outline-none text-lg ${isDark ? 'text-white placeholder-slate-500' : 'text-teal-900 placeholder-teal-400'}`}
                  onKeyDown={(e) => e.key === 'Enter' && handlePromptSubmit()}
                />
              </div>

              {/* Action Bar */}
              <div className={`flex items-center justify-between px-4 py-3 border-t ${
                isDark ? 'border-slate-700' : 'border-teal-100'
              }`}>
                <div className="flex items-center gap-2">
                  <button className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-teal-50'} transition-colors`}>
                    <Plus className={`w-5 h-5 ${isDark ? 'text-slate-400' : 'text-teal-500'}`} />
                  </button>
                  <button className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-teal-50'} transition-colors`}>
                    <Paperclip className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-teal-500'}`} />
                    <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-teal-600'}`}>Attach</span>
                  </button>
                  <button className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-teal-50'} transition-colors`}>
                    <Palette className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-teal-500'}`} />
                    <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-teal-600'}`}>Theme</span>
                    <ChevronDown className={`w-3 h-3 ${isDark ? 'text-slate-400' : 'text-teal-500'}`} />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-teal-50'} transition-colors`}>
                    <MessageCircle className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-teal-500'}`} />
                    <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-teal-600'}`}>Chat</span>
                  </button>
                  <button
                    onClick={handlePromptSubmit}
                    className="w-8 h-8 rounded-full bg-teal-600 hover:bg-teal-500 flex items-center justify-center transition-colors"
                  >
                    <ArrowRight className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Recent Projects Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="w-full max-w-4xl mt-12"
          >
            <div className={`rounded-t-2xl ${
              isDark ? 'bg-slate-900/90 border-slate-700' : 'bg-white/95 border-teal-200'
            } backdrop-blur-md border-t border-x shadow-xl`}>
              {/* Tabs */}
              <div className="flex items-center justify-between px-6 py-4">
                <div className="flex gap-6">
                  <button className={`text-sm font-medium pb-1 border-b-2 border-teal-500 ${isDark ? 'text-white' : 'text-teal-800'}`}>
                    Recent projects
                  </button>
                  <button
                    onClick={() => navigate('/projects/new')}
                    className={`text-sm ${isDark ? 'text-slate-400 hover:text-white' : 'text-teal-500 hover:text-teal-700'} transition-colors`}
                  >
                    + New project
                  </button>
                </div>
                <button
                  onClick={() => navigate('/dashboard')}
                  className={`flex items-center gap-1 text-sm ${isDark ? 'text-slate-400 hover:text-white' : 'text-teal-500 hover:text-teal-700'} transition-colors`}
                >
                  View all
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Project Cards */}
              <div className="px-6 pb-6 grid grid-cols-3 gap-4">
                {projectsLoading ? (
                  // Loading skeleton
                  [...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className={`p-4 rounded-xl ${
                        isDark ? 'bg-slate-800 border-slate-700' : 'bg-teal-50 border-teal-200'
                      } border animate-pulse`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className={`w-10 h-10 rounded-lg ${isDark ? 'bg-slate-700' : 'bg-teal-200'}`} />
                        <div className={`w-16 h-5 rounded-full ${isDark ? 'bg-slate-700' : 'bg-teal-200'}`} />
                      </div>
                      <div className={`h-5 w-3/4 rounded ${isDark ? 'bg-slate-700' : 'bg-teal-200'} mb-2`} />
                      <div className={`h-1.5 w-full rounded-full ${isDark ? 'bg-slate-700' : 'bg-teal-200'}`} />
                    </div>
                  ))
                ) : recentProjects.length > 0 ? (
                  recentProjects.map((project) => {
                    const phase = getProjectPhase(project);
                    const progress = getProjectProgress(project);
                    return (
                      <button
                        key={project.id}
                        onClick={() => navigate(`/projects/${project.id}`)}
                        className={`p-4 rounded-xl ${
                          isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700' : 'bg-teal-50 hover:bg-teal-100 border-teal-200'
                        } border text-left transition-colors`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center p-1.5">
                            <img src={FuzzyLlamaLogo} alt="Project" className="w-full h-full" />
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            phase === 'Build' || phase === 'build' ? 'bg-teal-500/20 text-teal-600' :
                            phase === 'Design' || phase === 'design' ? 'bg-purple-500/20 text-purple-600' :
                            phase === 'Test' || phase === 'test' ? 'bg-amber-500/20 text-amber-600' :
                            'bg-slate-500/20 text-slate-600'
                          }`}>
                            {phase}
                          </span>
                        </div>
                        <h3 className={`font-medium mb-2 ${isDark ? 'text-white' : 'text-teal-900'}`}>{project.name}</h3>
                        <div className={`w-full h-1.5 ${isDark ? 'bg-slate-700' : 'bg-teal-200'} rounded-full overflow-hidden`}>
                          <div
                            className="h-full bg-gradient-to-r from-teal-500 to-teal-400 rounded-full"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-teal-600'}`}>{progress}% complete</span>
                      </button>
                    );
                  })
                ) : (
                  // Empty state
                  <div className={`col-span-3 text-center py-8 ${isDark ? 'text-slate-400' : 'text-teal-600'}`}>
                    <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm mb-2">No projects yet</p>
                    <button
                      onClick={() => navigate('/projects/new')}
                      className="text-sm text-teal-500 hover:text-teal-400 underline"
                    >
                      Create your first project
                    </button>
                  </div>
                )}
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
  hasSubmenu = false,
  onClick,
  isDark = false
}: {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  hasSubmenu?: boolean;
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
    {hasSubmenu && <ChevronDown className="w-4 h-4" />}
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
