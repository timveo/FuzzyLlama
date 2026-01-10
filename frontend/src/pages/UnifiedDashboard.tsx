import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  CodeBracketIcon,
  MapIcon,
  ComputerDesktopIcon,
  PaperAirplaneIcon,
  StopIcon,
  SparklesIcon,
  CpuChipIcon,
  BanknotesIcon,
  AcademicCapIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  BoltIcon,
  BeakerIcon,
  HeartIcon,
} from '@heroicons/react/24/outline';
import { projectsApi } from '../api/projects';

// Types
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface ActivityEvent {
  id: string;
  type: 'agent_start' | 'agent_complete' | 'gate_ready' | 'task_complete';
  message: string;
  timestamp: Date;
}

type WorkspaceTab = 'ui' | 'docs' | 'code' | 'map';
type Phase = 'plan' | 'dev' | 'ship';
type SkillLevel = 'beginner' | 'intermediate' | 'expert';

// Mock data
const mockMessages: ChatMessage[] = [
  { id: '1', role: 'system', content: 'Hey! I\'m here to help you build something amazing. What are we creating today?', timestamp: new Date(Date.now() - 300000) },
  { id: '2', role: 'user', content: 'What should I work on first?', timestamp: new Date(Date.now() - 240000) },
  { id: '3', role: 'assistant', content: 'Great question! Your PRD is ready for review. The Product Manager agent crafted some solid requirements. Want me to walk you through the key decisions? I can explain the reasoning behind each one.', timestamp: new Date(Date.now() - 180000) },
];

const mockActivity: ActivityEvent[] = [
  { id: '1', type: 'agent_complete', message: 'Architect finished system design', timestamp: new Date(Date.now() - 60000) },
  { id: '2', type: 'gate_ready', message: 'G2 ready for your review', timestamp: new Date(Date.now() - 120000) },
  { id: '3', type: 'task_complete', message: 'Database schema validated', timestamp: new Date(Date.now() - 180000) },
];

const mockTodos = [
  { id: '1', text: 'Review PRD document', done: true },
  { id: '2', text: 'Approve G2 Architecture gate', done: false },
  { id: '3', text: 'Select design variant', done: false },
];

// Ambient floating particles
const FloatingParticle = ({ delay }: { delay: number }) => (
  <motion.div
    className="absolute w-1.5 h-1.5 rounded-full bg-primary-400/20"
    initial={{ opacity: 0, scale: 0 }}
    animate={{
      opacity: [0, 0.6, 0],
      scale: [0, 1, 0],
      y: [0, -100],
      x: [0, Math.random() * 40 - 20],
    }}
    transition={{
      duration: 4,
      delay,
      repeat: Infinity,
      ease: 'easeOut',
    }}
  />
);

// Breathing orb indicator
const BreathingOrb = ({ color, size = 'md' }: { color: string; size?: 'sm' | 'md' | 'lg' }) => {
  const sizes = { sm: 'w-3 h-3', md: 'w-4 h-4', lg: 'w-6 h-6' };
  return (
    <motion.div
      className={`${sizes[size]} rounded-full ${color}`}
      animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
};

// ============ LEFT PANEL COMPONENTS ============

const ChatPanel = () => {
  const [messages, setMessages] = useState<ChatMessage[]>(mockMessages);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  const handleSend = () => {
    if (!input.trim()) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };
    setMessages([...messages, newMessage]);
    setInput('');
    setIsStreaming(true);

    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I understand! Let me help you with that. Give me a moment to think through the best approach...',
        timestamp: new Date(),
      }]);
      setIsStreaming(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Friendly Chat Header */}
      <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-primary-500/10 to-violet-500/10 rounded-t-3xl">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-violet-500 flex items-center justify-center">
            <SparklesIcon className="w-5 h-5 text-white" />
          </div>
          <motion.div
            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-dark-surface"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
        <div>
          <span className="font-semibold text-dark-text-primary">LayerCake Assistant</span>
          <p className="text-xs text-dark-text-muted">Here to help you build</p>
        </div>
      </div>

      {/* Messages with organic bubbles */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] ${
              msg.role === 'user'
                ? 'bg-gradient-to-br from-primary-500/30 to-primary-600/20 text-primary-50 rounded-3xl rounded-br-lg'
                : msg.role === 'system'
                ? 'bg-gradient-to-br from-violet-500/10 to-violet-600/5 text-dark-text-secondary rounded-3xl rounded-bl-lg italic'
                : 'bg-gradient-to-br from-dark-elevated to-dark-surface text-dark-text-primary rounded-3xl rounded-bl-lg shadow-lg shadow-black/10'
            } px-4 py-3 text-sm leading-relaxed`}>
              {msg.content}
            </div>
          </motion.div>
        ))}

        {isStreaming && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3 px-4 py-3 bg-dark-elevated/50 rounded-3xl rounded-bl-lg max-w-[85%]"
          >
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="w-2 h-2 bg-gradient-to-br from-primary-400 to-violet-400 rounded-full"
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }}
                />
              ))}
            </div>
            <span className="text-sm text-dark-text-muted">Thinking...</span>
          </motion.div>
        )}
      </div>

      {/* Organic Input */}
      <div className="p-4">
        <div className="flex items-center gap-3 bg-dark-elevated/80 rounded-full px-4 py-2 border border-dark-border/20 focus-within:border-primary-500/30 transition-colors">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask me anything..."
            className="flex-1 bg-transparent text-sm text-dark-text-primary placeholder-dark-text-muted focus:outline-none"
          />
          {isStreaming ? (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsStreaming(false)}
              className="w-9 h-9 rounded-full bg-gradient-to-br from-red-500/20 to-red-600/30 text-red-400 flex items-center justify-center"
            >
              <StopIcon className="w-4 h-4" />
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSend}
              className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-violet-500 text-white flex items-center justify-center shadow-lg shadow-primary-500/25"
            >
              <PaperAirplaneIcon className="w-4 h-4" />
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
};

const ActivityFeed = () => {
  const getEventStyle = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'agent_complete': return { icon: CheckCircleIcon, color: 'text-emerald-400', bg: 'bg-emerald-400/10' };
      case 'gate_ready': return { icon: SparklesIcon, color: 'text-amber-400', bg: 'bg-amber-400/10' };
      case 'task_complete': return { icon: CheckCircleIcon, color: 'text-primary-400', bg: 'bg-primary-400/10' };
      default: return { icon: ClockIcon, color: 'text-dark-text-muted', bg: 'bg-dark-elevated' };
    }
  };

  return (
    <div className="px-4 py-3">
      <h3 className="text-xs font-medium text-dark-text-muted mb-3 flex items-center gap-2">
        <HeartIcon className="w-4 h-4 text-pink-400" />
        Recent Activity
      </h3>
      <div className="space-y-2">
        {mockActivity.map((event, i) => {
          const style = getEventStyle(event.type);
          const Icon = style.icon;
          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`flex items-center gap-3 p-2.5 rounded-2xl ${style.bg} backdrop-blur`}
            >
              <div className={`w-8 h-8 rounded-full ${style.bg} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${style.color}`} />
              </div>
              <span className="text-xs text-dark-text-secondary flex-1">{event.message}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

const TodoList = () => {
  const [todos, setTodos] = useState(mockTodos);

  const toggleTodo = (id: string) => {
    setTodos(todos.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  return (
    <div className="px-4 py-3">
      <h3 className="text-xs font-medium text-dark-text-muted mb-3">Your Tasks</h3>
      <div className="space-y-2">
        {todos.map((todo, i) => (
          <motion.label
            key={todo.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`flex items-center gap-3 p-2.5 rounded-2xl cursor-pointer transition-all ${
              todo.done ? 'bg-emerald-400/5' : 'bg-dark-elevated/50 hover:bg-dark-elevated'
            }`}
          >
            <motion.div
              whileTap={{ scale: 0.9 }}
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                todo.done
                  ? 'bg-emerald-400 border-emerald-400'
                  : 'border-dark-border hover:border-primary-400'
              }`}
              onClick={() => toggleTodo(todo.id)}
            >
              {todo.done && <CheckCircleIcon className="w-4 h-4 text-white" />}
            </motion.div>
            <span className={`text-sm ${todo.done ? 'line-through text-dark-text-muted' : 'text-dark-text-secondary'}`}>
              {todo.text}
            </span>
          </motion.label>
        ))}
      </div>
    </div>
  );
};

// ============ CENTER PANEL COMPONENTS ============

const WorkspacePanel = ({ activeTab, onTabChange }: { activeTab: WorkspaceTab; onTabChange: (tab: WorkspaceTab) => void }) => {
  const tabs: { id: WorkspaceTab; label: string; icon: React.ElementType; color: string }[] = [
    { id: 'ui', label: 'Preview', icon: ComputerDesktopIcon, color: 'from-pink-400 to-rose-500' },
    { id: 'docs', label: 'Docs', icon: DocumentTextIcon, color: 'from-blue-400 to-indigo-500' },
    { id: 'code', label: 'Code', icon: CodeBracketIcon, color: 'from-emerald-400 to-teal-500' },
    { id: 'map', label: 'Journey', icon: MapIcon, color: 'from-violet-400 to-purple-500' },
  ];

  return (
    <div className="flex flex-col h-full p-4">
      {/* Pill Tab Bar */}
      <div className="flex items-center gap-2 p-1.5 bg-dark-elevated/50 rounded-full mb-4 self-center">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <motion.button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? `bg-gradient-to-r ${tab.color} text-white shadow-lg`
                  : 'text-dark-text-muted hover:text-dark-text-primary'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </motion.button>
          );
        })}
      </div>

      {/* Content Area with organic container */}
      <motion.div
        layout
        className="flex-1 bg-gradient-to-br from-dark-elevated/80 to-dark-surface/60 rounded-[2rem] p-6 overflow-auto backdrop-blur border border-dark-border/10"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {activeTab === 'ui' && <UIPreviewContent />}
            {activeTab === 'docs' && <DocsContent />}
            {activeTab === 'code' && <CodeContent />}
            {activeTab === 'map' && <JourneyContent />}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

const UIPreviewContent = () => (
  <div className="h-full flex items-center justify-center">
    <div className="text-center">
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-pink-400/20 to-rose-500/20 flex items-center justify-center"
      >
        <ComputerDesktopIcon className="w-12 h-12 text-pink-400" />
      </motion.div>
      <h3 className="text-xl font-semibold text-dark-text-primary mb-2">UI Preview</h3>
      <p className="text-sm text-dark-text-muted max-w-md">
        Your beautiful UI will appear here once Design (G4) is complete. Can't wait to show you!
      </p>
    </div>
  </div>
);

const DocsContent = () => {
  const docTypes = ['PRD', 'Architecture', 'Tech Stack', 'API Docs'];
  const [selectedDoc, setSelectedDoc] = useState('PRD');

  return (
    <div className="h-full flex flex-col">
      <div className="flex gap-2 mb-4 flex-wrap">
        {docTypes.map((doc) => (
          <motion.button
            key={doc}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedDoc(doc)}
            className={`px-4 py-2 rounded-full text-xs font-medium transition-all ${
              selectedDoc === doc
                ? 'bg-gradient-to-r from-blue-400 to-indigo-500 text-white shadow-lg shadow-blue-500/25'
                : 'bg-dark-elevated/80 text-dark-text-muted hover:text-dark-text-primary'
            }`}
          >
            {doc}
          </motion.button>
        ))}
      </div>
      <div className="flex-1 bg-dark-bg/50 rounded-2xl p-5 overflow-auto">
        <h2 className="text-xl font-bold text-dark-text-primary mb-4">{selectedDoc}</h2>
        <div className="prose prose-invert prose-sm max-w-none">
          <p className="text-dark-text-secondary leading-relaxed">
            Your {selectedDoc} document content will appear here. This supports rich markdown with version history and collaborative editing.
          </p>
        </div>
      </div>
    </div>
  );
};

const CodeContent = () => (
  <div className="h-full flex flex-col">
    <div className="flex items-center gap-3 mb-4">
      <span className="text-xs text-dark-text-muted">File:</span>
      <span className="text-xs bg-emerald-400/10 text-emerald-400 px-3 py-1.5 rounded-full font-mono">
        src/App.tsx
      </span>
    </div>
    <div className="flex-1 bg-dark-bg/50 rounded-2xl p-5 overflow-auto font-mono text-sm">
      <pre className="text-dark-text-secondary leading-relaxed">
{`// Your generated code will appear here
import React from 'react';

export const App: React.FC = () => {
  return (
    <div className="app">
      <h1>Hello LayerCake</h1>
    </div>
  );
};`}
      </pre>
    </div>
  </div>
);

const JourneyContent = () => {
  const milestones = [
    { id: 1, title: 'Vision Defined', status: 'complete', gate: 'G1', emoji: '🎯' },
    { id: 2, title: 'PRD Approved', status: 'complete', gate: 'G2', emoji: '📝' },
    { id: 3, title: 'Architecture Ready', status: 'current', gate: 'G3', emoji: '🏗️' },
    { id: 4, title: 'Design Complete', status: 'upcoming', gate: 'G4', emoji: '🎨' },
    { id: 5, title: 'Development Done', status: 'upcoming', gate: 'G5', emoji: '💻' },
  ];

  return (
    <div className="h-full overflow-auto">
      <h3 className="text-xl font-semibold text-dark-text-primary mb-6">Your Building Journey</h3>
      <div className="space-y-4">
        {milestones.map((milestone, i) => (
          <motion.div
            key={milestone.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${
              milestone.status === 'complete'
                ? 'bg-gradient-to-r from-emerald-400/10 to-emerald-500/5'
                : milestone.status === 'current'
                ? 'bg-gradient-to-r from-primary-400/20 to-violet-500/10 border border-primary-400/30'
                : 'bg-dark-elevated/30 opacity-60'
            }`}
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${
              milestone.status === 'complete'
                ? 'bg-emerald-400/20'
                : milestone.status === 'current'
                ? 'bg-primary-400/20'
                : 'bg-dark-elevated'
            }`}>
              {milestone.status === 'complete' ? '✓' : milestone.emoji}
            </div>
            <div className="flex-1">
              <h4 className={`font-semibold ${
                milestone.status === 'complete' ? 'text-emerald-400' :
                milestone.status === 'current' ? 'text-primary-400' :
                'text-dark-text-muted'
              }`}>
                {milestone.title}
              </h4>
              <p className="text-xs text-dark-text-muted mt-0.5">
                {milestone.gate} • {milestone.status === 'complete' ? 'Completed' :
                 milestone.status === 'current' ? 'In Progress' : 'Coming up'}
              </p>
            </div>
            {milestone.status === 'current' && (
              <BreathingOrb color="bg-primary-400" size="sm" />
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// ============ RIGHT PANEL COMPONENTS ============

const PhaseIndicator = ({ currentGate }: { currentGate: number }) => {
  const getPhase = (gate: number): Phase => {
    if (gate <= 3) return 'plan';
    if (gate <= 6) return 'dev';
    return 'ship';
  };

  const phase = getPhase(currentGate);
  const phases: { id: Phase; label: string; emoji: string; color: string }[] = [
    { id: 'plan', label: 'Plan', emoji: '🧠', color: 'from-violet-400 to-purple-500' },
    { id: 'dev', label: 'Build', emoji: '⚡', color: 'from-primary-400 to-teal-500' },
    { id: 'ship', label: 'Ship', emoji: '🚀', color: 'from-amber-400 to-orange-500' },
  ];

  return (
    <div className="p-4">
      <h3 className="text-xs font-medium text-dark-text-muted mb-4">Current Phase</h3>
      <div className="flex gap-2">
        {phases.map((p, i) => (
          <motion.div
            key={p.id}
            whileHover={{ scale: 1.05 }}
            className={`flex-1 text-center py-3 rounded-2xl transition-all ${
              phase === p.id
                ? `bg-gradient-to-br ${p.color} shadow-lg`
                : 'bg-dark-elevated/50'
            }`}
          >
            <div className="text-lg mb-1">{p.emoji}</div>
            <div className={`text-xs font-medium ${phase === p.id ? 'text-white' : 'text-dark-text-muted'}`}>
              {p.label}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const ActiveAgents = () => {
  const agents = [
    { name: 'Architect', status: 'working', emoji: '🏗️' },
    { name: 'Frontend', status: 'idle', emoji: '🎨' },
  ];
  const activeCount = agents.filter(a => a.status === 'working').length;

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-medium text-dark-text-muted">Your Team</h3>
        <span className="text-xs bg-gradient-to-r from-primary-400 to-violet-400 text-white px-2.5 py-1 rounded-full">
          {activeCount} active
        </span>
      </div>
      <div className="space-y-2">
        {agents.map((agent, i) => (
          <motion.div
            key={agent.name}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`flex items-center gap-3 p-3 rounded-2xl ${
              agent.status === 'working' ? 'bg-primary-400/10' : 'bg-dark-elevated/30'
            }`}
          >
            <span className="text-lg">{agent.emoji}</span>
            <span className="text-sm text-dark-text-secondary flex-1">{agent.name}</span>
            {agent.status === 'working' && (
              <BreathingOrb color="bg-primary-400" size="sm" />
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const GateProgress = ({ currentGate }: { currentGate: number }) => {
  const gates = Array.from({ length: 10 }, (_, i) => i);

  return (
    <div className="px-4 py-3">
      <h3 className="text-xs font-medium text-dark-text-muted mb-3">Gate Progress</h3>
      <div className="flex flex-wrap gap-2">
        {gates.map((i) => (
          <motion.div
            key={i}
            whileHover={{ scale: 1.1 }}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              i < currentGate
                ? 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-400/30'
                : i === currentGate
                ? 'bg-gradient-to-br from-primary-400 to-violet-500 text-white shadow-lg shadow-primary-400/30 ring-4 ring-primary-400/20'
                : 'bg-dark-elevated/50 text-dark-text-muted'
            }`}
          >
            {i < currentGate ? '✓' : i}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const CostMetrics = () => {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-2 mb-3">
        <BanknotesIcon className="w-4 h-4 text-emerald-400" />
        <h3 className="text-xs font-medium text-dark-text-muted">Token Costs</h3>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-primary-400/10 to-primary-500/5 rounded-2xl p-3 text-center">
          <div className="text-xl font-bold text-primary-400">$0.45</div>
          <div className="text-xs text-dark-text-muted mt-1">This Gate</div>
        </div>
        <div className="bg-gradient-to-br from-emerald-400/10 to-emerald-500/5 rounded-2xl p-3 text-center">
          <div className="text-xl font-bold text-emerald-400">$2.30</div>
          <div className="text-xs text-dark-text-muted mt-1">Total</div>
        </div>
      </div>
    </div>
  );
};

const TeachingMoments = ({ skillLevel }: { skillLevel: SkillLevel }) => {
  const tips = {
    beginner: {
      title: 'What\'s a Gate?',
      content: 'Think of gates as friendly checkpoints. Each one makes sure your project is on the right track before moving forward!',
      emoji: '💡',
      color: 'from-amber-400/20 to-orange-400/10',
    },
    intermediate: {
      title: 'Pro Tip',
      content: 'Architecture decisions are locked after G3. Take your time reviewing them—they shape your entire system!',
      emoji: '⚡',
      color: 'from-primary-400/20 to-violet-400/10',
    },
    expert: {
      title: 'Deep Dive',
      content: 'Consider adding custom validation rules to your OpenAPI spec for stronger type safety across your stack.',
      emoji: '🔬',
      color: 'from-violet-400/20 to-purple-400/10',
    },
  };

  const tip = tips[skillLevel];

  return (
    <div className="px-4 py-3">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-gradient-to-br ${tip.color} rounded-2xl p-4 border border-dark-border/10`}
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl">{tip.emoji}</span>
          <div>
            <h4 className="text-sm font-semibold text-dark-text-primary mb-1">{tip.title}</h4>
            <p className="text-xs text-dark-text-secondary leading-relaxed">{tip.content}</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ============ MAIN DASHBOARD ============

export default function UnifiedDashboard() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('docs');
  const [skillLevel] = useState<SkillLevel>('intermediate');
  const currentGate = 3;

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(),
  });

  const currentProject = projects?.[0];

  return (
    <div className="h-screen bg-gradient-to-br from-dark-bg via-dark-bg to-dark-surface text-dark-text-primary flex flex-col overflow-hidden">
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-3xl" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="absolute" style={{ left: `${10 + i * 12}%`, bottom: '10%' }}>
            <FloatingParticle delay={i * 0.5} />
          </div>
        ))}
      </div>

      {/* Friendly Header */}
      <header className="relative h-16 border-b border-dark-border/20 bg-dark-surface/60 backdrop-blur-xl flex items-center px-6 gap-4 z-10">
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ rotate: 10 }}
            className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-400 to-violet-500 flex items-center justify-center shadow-lg shadow-primary-500/25"
          >
            <SparklesIcon className="w-5 h-5 text-white" />
          </motion.div>
          <div>
            <span className="font-bold text-lg">LayerCake</span>
            <span className="text-dark-text-muted text-xs ml-2">Building magic</span>
          </div>
        </div>

        {/* Project Selector */}
        <select className="ml-4 bg-dark-elevated/80 border border-dark-border/30 rounded-full px-4 py-2 text-sm text-dark-text-primary focus:outline-none focus:border-primary-400/50">
          <option>{currentProject?.name || 'Select Project'}</option>
        </select>

        <div className="flex-1" />

        {/* Skill Level Pill */}
        <div className="flex items-center gap-2 bg-violet-400/10 px-4 py-2 rounded-full">
          <AcademicCapIcon className="w-4 h-4 text-violet-400" />
          <span className="text-xs text-violet-400 font-medium capitalize">{skillLevel}</span>
        </div>

        {/* Notification */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative w-10 h-10 rounded-full bg-dark-elevated/80 flex items-center justify-center"
        >
          <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full" />
          <ExclamationTriangleIcon className="w-5 h-5 text-dark-text-muted" />
        </motion.button>
      </header>

      {/* Main Content - 3 Panel Layout */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* Left Panel - Chat */}
        <div className="w-[320px] min-w-[280px] border-r border-dark-border/20 bg-dark-surface/40 backdrop-blur-xl flex flex-col">
          <div className="flex-1 overflow-hidden">
            <ChatPanel />
          </div>
          <div className="border-t border-dark-border/20">
            <ActivityFeed />
          </div>
          <div className="border-t border-dark-border/20">
            <TodoList />
          </div>
        </div>

        {/* Center Panel - Workspace */}
        <div className="flex-1 min-w-[400px]">
          <WorkspacePanel activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        {/* Right Panel - Metrics */}
        <div className="w-[280px] min-w-[240px] border-l border-dark-border/20 bg-dark-surface/40 backdrop-blur-xl overflow-y-auto">
          <PhaseIndicator currentGate={currentGate} />
          <div className="border-t border-dark-border/10">
            <ActiveAgents />
          </div>
          <div className="border-t border-dark-border/10">
            <GateProgress currentGate={currentGate} />
          </div>
          <div className="border-t border-dark-border/10">
            <CostMetrics />
          </div>
          <div className="border-t border-dark-border/10">
            <TeachingMoments skillLevel={skillLevel} />
          </div>
        </div>
      </div>
    </div>
  );
}
