// Mock data for UnifiedDashboard components
// In production, this data would come from API calls

import type { ChatMessage, FileTreeNode, GateApprovalData, Agent, GateInfo, GateTask, Phase } from './types';

// All 14 agents from the system with phase assignments
export const ALL_AGENTS: Agent[] = [
  { type: 'PRODUCT_MANAGER', name: 'Product Manager', icon: '📋', status: 'idle', phase: 'plan' },
  { type: 'ARCHITECT', name: 'Architect', icon: '🏗️', status: 'working', phase: 'plan' },
  { type: 'UX_UI_DESIGNER', name: 'UX/UI Designer', icon: '🎨', status: 'idle', phase: 'plan' },
  { type: 'FRONTEND_DEVELOPER', name: 'Frontend Dev', icon: '⚛️', status: 'idle', phase: 'dev' },
  { type: 'BACKEND_DEVELOPER', name: 'Backend Dev', icon: '⚙️', status: 'working', phase: 'dev' },
  { type: 'ML_ENGINEER', name: 'ML Engineer', icon: '🤖', status: 'idle', phase: 'dev' },
  { type: 'PROMPT_ENGINEER', name: 'Prompt Engineer', icon: '💬', status: 'idle', phase: 'dev' },
  { type: 'MODEL_EVALUATOR', name: 'Model Evaluator', icon: '📊', status: 'idle', phase: 'dev' },
  { type: 'DATA_ENGINEER', name: 'Data Engineer', icon: '📦', status: 'idle', phase: 'dev' },
  { type: 'QA_ENGINEER', name: 'QA Engineer', icon: '🧪', status: 'idle', phase: 'ship' },
  { type: 'SECURITY_ENGINEER', name: 'Security', icon: '🔒', status: 'idle', phase: 'ship' },
  { type: 'DEVOPS_ENGINEER', name: 'DevOps', icon: '🚀', status: 'idle', phase: 'ship' },
  { type: 'AIOPS_ENGINEER', name: 'AIOps', icon: '🔍', status: 'idle', phase: 'ship' },
  { type: 'ORCHESTRATOR', name: 'Orchestrator', icon: '🎯', status: 'working', phase: 'plan' },
];

// Gates organized by phase
export const GATES_BY_PHASE: Record<Phase, number[]> = {
  plan: [0, 1, 2, 3],
  dev: [4, 5, 6],
  ship: [7, 8, 9],
};

// Gate names, descriptions, decisions (teaching moments), documents, and celebrations
export const GATE_INFO: Record<number, GateInfo> = {
  0: {
    name: 'The Vision Takes Shape',
    narrative: 'Every great product starts with a clear "why"',
    description: 'You defined what you\'re building and why it matters. The foundation of every great product.',
    deliverables: ['Problem statement', 'Target users defined', 'Initial concept validated'],
    summary: 'Established the core problem space and validated that developers need AI-assisted tooling to manage complex multi-agent workflows.',
    decisions: [
      { choice: 'Developer productivity over enterprise features', reason: 'Indie devs need speed, not governance overhead' },
      { choice: 'AI-first approach over manual workflows', reason: 'Automating repetitive tasks compounds time savings' },
    ],
    documents: [
      { name: 'Vision Statement', path: '/docs/vision.md', icon: '📄' },
      { name: 'User Research', path: '/docs/user-research.md', icon: '👥' },
    ],
    celebration: '🎯 Vision Set!'
  },
  1: {
    name: 'Requirements Crystallize',
    narrative: 'From ideas to actionable specifications',
    description: 'Product requirements fully documented. Every feature has a purpose.',
    deliverables: ['PRD document', 'User stories', 'Success metrics', 'Feature prioritization'],
    summary: 'Translated the vision into concrete requirements with measurable success criteria and a prioritized feature backlog.',
    decisions: [
      { choice: 'Real-time agent visibility over async notifications', reason: 'Transparency builds trust with users' },
      { choice: 'Gate-based workflow over continuous deployment', reason: 'Quality checkpoints reduce costly production bugs' },
      { choice: 'MoSCoW prioritization framework', reason: 'Clear must-have vs nice-to-have prevents scope creep' },
    ],
    documents: [
      { name: 'PRD.md', path: '/docs/PRD.md', icon: '📋' },
      { name: 'User Stories', path: '/docs/user-stories.md', icon: '📝' },
      { name: 'Success Metrics', path: '/docs/metrics.md', icon: '📊' },
    ],
    celebration: '📋 PRD Complete!'
  },
  2: {
    name: 'Architecture Emerges',
    narrative: 'The skeleton that supports everything',
    description: 'The skeleton of your application took form. Decisions made here echo through every feature.',
    deliverables: ['System design doc', 'Tech stack decision', 'Database schema', 'API contracts'],
    summary: 'Designed a scalable microservices architecture with event-driven communication between agents and a robust data layer.',
    decisions: [
      { choice: 'Microservices over monolith', reason: 'Agents need independent scaling and deployment' },
      { choice: 'PostgreSQL over MongoDB', reason: 'ACID compliance critical for gate approval state management' },
      { choice: 'FastAPI for backend', reason: 'Native async support and auto-generated OpenAPI docs' },
      { choice: 'React + TypeScript for frontend', reason: 'Type safety catches bugs early, large ecosystem' },
    ],
    documents: [
      { name: 'Architecture.md', path: '/docs/ARCHITECTURE.md', icon: '🏗️' },
      { name: 'API Contracts', path: '/docs/API.md', icon: '🔌' },
      { name: 'Database Schema', path: '/docs/schema.md', icon: '🗄️' },
    ],
    celebration: '🏗️ Foundations Laid!'
  },
  3: {
    name: 'Design Takes Form',
    narrative: 'Where user experience meets visual craft',
    description: 'UX/UI design completed. Users will thank you for the attention to detail.',
    deliverables: ['Wireframes', 'Design system', 'User flows', 'Prototype'],
    summary: 'Created a cohesive design system with a three-panel layout optimized for developer workflows and extended coding sessions.',
    decisions: [
      { choice: 'Three-panel layout over tabbed interface', reason: 'Users need simultaneous context of agents, work, and progress' },
      { choice: 'Dark mode as default', reason: 'Developers work late; reducing eye strain improves productivity' },
      { choice: 'Teal accent color palette', reason: 'Professional yet distinctive, good contrast in both themes' },
    ],
    documents: [
      { name: 'Design System', path: '/docs/design-system.md', icon: '🎨' },
      { name: 'Wireframes', path: '/docs/wireframes.fig', icon: '📐' },
      { name: 'User Flows', path: '/docs/user-flows.md', icon: '🔀' },
    ],
    celebration: '🎨 Design Approved!'
  },
  4: {
    name: 'Core Features Alive',
    narrative: 'Ideas become reality, one function at a time',
    description: 'You\'re breathing life into essential functionality. This is where ideas become real.',
    deliverables: ['Core features', 'Basic UI', 'Database setup', 'API endpoints'],
    summary: 'Built the orchestrator engine and core agent framework, establishing the foundation for all 14 specialized agents.',
    decisions: [
      { choice: 'Orchestrator-first development', reason: 'Coordination logic is the hardest to retrofit later' },
      { choice: 'WebSocket over polling for updates', reason: 'Instant feedback transforms user experience' },
      { choice: 'Agent state machine pattern', reason: 'Predictable state transitions simplify debugging' },
    ],
    documents: [
      { name: 'MVP Spec', path: '/docs/mvp-spec.md', icon: '⚡' },
      { name: 'Agent Framework', path: '/docs/agent-framework.md', icon: '🤖' },
    ],
    celebration: '⚡ MVP Built!'
  },
  5: {
    name: 'Feature Complete',
    narrative: 'All the pieces come together',
    description: 'All planned features implemented. Your product is taking its full shape.',
    deliverables: ['All features built', 'Integration complete', 'Error handling', 'Edge cases covered'],
    summary: 'Completed all 14 specialized agents with full orchestration, gate approval workflows, and comprehensive error handling.',
    decisions: [
      { choice: 'Rollback capability at each gate', reason: 'Mistakes happen; recovery should be seamless' },
      { choice: '14 specialized agents over general-purpose', reason: 'Expertise beats flexibility for code quality' },
      { choice: 'Graceful degradation for AI failures', reason: 'Users should never be completely blocked' },
    ],
    documents: [
      { name: 'Feature Matrix', path: '/docs/features.md', icon: '✨' },
      { name: 'Error Handling', path: '/docs/error-handling.md', icon: '🚨' },
    ],
    celebration: '✨ Features Done!'
  },
  6: {
    name: 'Integration Harmony',
    narrative: 'Making all systems sing together',
    description: 'All systems integrated and working together seamlessly.',
    deliverables: ['Third-party integrations', 'Service connections', 'Data pipelines', 'Auth flow'],
    summary: 'Connected all services with secure authentication, established data pipelines, and integrated external AI providers.',
    decisions: [
      { choice: 'JWT tokens over session cookies', reason: 'Stateless auth simplifies horizontal scaling' },
      { choice: 'Redis for agent state caching', reason: 'Sub-millisecond reads keep UI responsive during heavy processing' },
      { choice: 'OpenAI + Anthropic multi-provider', reason: 'Redundancy prevents single point of failure' },
    ],
    documents: [
      { name: 'Integration Guide', path: '/docs/integrations.md', icon: '🔗' },
      { name: 'Auth Flow', path: '/docs/auth.md', icon: '🔐' },
    ],
    celebration: '🔗 All Connected!'
  },
  7: {
    name: 'Quality Assured',
    narrative: 'Confidence through comprehensive testing',
    description: 'Comprehensive testing passed. You can deploy with confidence.',
    deliverables: ['Unit tests', 'Integration tests', 'E2E tests', 'Performance tests', 'Security audit'],
    summary: 'Achieved 85% test coverage with comprehensive E2E tests, performance benchmarks, and completed security audit.',
    decisions: [
      { choice: '80% coverage threshold over 100%', reason: 'Diminishing returns; focus testing on critical paths' },
      { choice: 'Playwright over Cypress for E2E', reason: 'Better multi-browser support, lighter footprint' },
      { choice: 'Automated security scanning in CI', reason: 'Catch vulnerabilities before they reach production' },
    ],
    documents: [
      { name: 'Test Plan', path: '/docs/test-plan.md', icon: '🧪' },
      { name: 'Security Audit', path: '/docs/security-audit.md', icon: '🔒' },
      { name: 'Perf Benchmarks', path: '/docs/performance.md', icon: '📈' },
    ],
    celebration: '🧪 Tests Pass!'
  },
  8: {
    name: 'Deploy Ready',
    narrative: 'Production environment awaits',
    description: 'Production environment prepared. The runway is clear for launch.',
    deliverables: ['CI/CD pipeline', 'Monitoring setup', 'Logging configured', 'Backup strategy'],
    summary: 'Configured production infrastructure with automated deployments, comprehensive monitoring, and disaster recovery.',
    decisions: [
      { choice: 'Docker Compose over Kubernetes', reason: 'Right-sized complexity for current scale' },
      { choice: 'Structured JSON logging', reason: 'Queryable logs enable faster incident debugging' },
      { choice: 'Blue-green deployment strategy', reason: 'Zero-downtime deploys with instant rollback' },
    ],
    documents: [
      { name: 'Deploy Guide', path: '/docs/deployment.md', icon: '🚀' },
      { name: 'Runbook', path: '/docs/runbook.md', icon: '📖' },
      { name: 'Monitoring Setup', path: '/docs/monitoring.md', icon: '📡' },
    ],
    celebration: '🚀 Ready to Launch!'
  },
  9: {
    name: 'Live & Learning',
    narrative: 'Your creation meets the world',
    description: 'Product successfully launched! Real users, real feedback, real impact.',
    deliverables: ['Production deployment', 'User onboarding', 'Documentation', 'Support process'],
    summary: 'Successfully launched to beta users with onboarding flow, documentation portal, and feedback collection system.',
    decisions: [
      { choice: 'Soft launch to beta users first', reason: 'Controlled feedback loop catches UX issues early' },
      { choice: 'In-app feedback widget', reason: 'Friction-free input increases user engagement' },
      { choice: 'Weekly release cadence', reason: 'Predictable updates build user confidence' },
    ],
    documents: [
      { name: 'Launch Checklist', path: '/docs/launch-checklist.md', icon: '✅' },
      { name: 'User Guide', path: '/docs/user-guide.md', icon: '📚' },
      { name: 'Release Notes', path: '/docs/releases.md', icon: '📣' },
    ],
    celebration: '🎉 You Shipped!'
  },
};

// Tasks accomplished at each gate
export const GATE_TASKS: Record<number, GateTask[]> = {
  0: [
    { task: 'Captured project description', status: 'done' },
    { task: 'Defined success criteria', status: 'done' },
    { task: 'Identified constraints & deployment needs', status: 'done' },
  ],
  1: [
    { task: 'Wrote comprehensive PRD', status: 'done' },
    { task: 'Created user story map', status: 'done' },
    { task: 'Defined success metrics & KPIs', status: 'done' },
    { task: 'Prioritized MVP features', status: 'done' },
  ],
  2: [
    { task: 'Designed system architecture', status: 'done' },
    { task: 'Selected technology stack', status: 'done' },
    { task: 'Created database schema', status: 'done' },
    { task: 'Defined API contracts', status: 'done' },
  ],
  3: [
    { task: 'Created wireframes for all screens', status: 'in-progress' },
    { task: 'Built design system components', status: 'in-progress' },
    { task: 'Mapped user flows', status: 'done' },
    { task: 'Created interactive prototype', status: 'pending' },
  ],
  4: [
    { task: 'Build authentication system', status: 'pending' },
    { task: 'Create core UI components', status: 'pending' },
    { task: 'Set up database', status: 'pending' },
    { task: 'Implement basic API', status: 'pending' },
  ],
  5: [
    { task: 'Complete all planned features', status: 'pending' },
    { task: 'Handle edge cases', status: 'pending' },
    { task: 'Add error handling', status: 'pending' },
  ],
  6: [
    { task: 'Integrate third-party services', status: 'pending' },
    { task: 'Set up OAuth providers', status: 'pending' },
    { task: 'Connect data pipelines', status: 'pending' },
  ],
  7: [
    { task: 'Write unit tests (80% coverage)', status: 'pending' },
    { task: 'Create integration tests', status: 'pending' },
    { task: 'Run E2E test suite', status: 'pending' },
    { task: 'Complete security audit', status: 'pending' },
  ],
  8: [
    { task: 'Configure CI/CD pipeline', status: 'pending' },
    { task: 'Set up monitoring & alerts', status: 'pending' },
    { task: 'Configure logging', status: 'pending' },
    { task: 'Create backup strategy', status: 'pending' },
  ],
  9: [
    { task: 'Deploy to production', status: 'pending' },
    { task: 'Set up user onboarding', status: 'pending' },
    { task: 'Publish documentation', status: 'pending' },
    { task: 'Establish support process', status: 'pending' },
  ],
};

// Mock chat messages
export const mockMessages: ChatMessage[] = [
  { id: '1', role: 'system', content: 'Agent Orchestrator online. Ready to coordinate your build.', timestamp: new Date(Date.now() - 300000) },
  { id: '2', role: 'user', content: 'What agents are currently active?', timestamp: new Date(Date.now() - 240000) },
  { id: '3', role: 'assistant', content: 'Currently running: Architect (designing system), Backend Dev (API scaffolding), and Orchestrator (coordinating). The Product Manager completed the PRD. Want me to activate more agents?', timestamp: new Date(Date.now() - 180000) },
];

// Mock file tree for Code tab
export const mockFileTree: FileTreeNode[] = [
  {
    name: 'docs',
    type: 'folder',
    path: '/docs',
    children: [
      { name: 'README.md', type: 'file', path: '/docs/README.md', content: '# Project Documentation\n\nWelcome to the Fuzzy Llama project documentation.\n\n## Overview\n\nThis project uses a gated development process with 10 quality gates.\n\n## Getting Started\n\n1. Review the PRD\n2. Approve architecture decisions\n3. Begin development' },
      { name: 'PRD.md', type: 'file', path: '/docs/PRD.md', content: '# Product Requirements Document\n\n## Vision\n\nBuild a comprehensive AI-powered development platform.\n\n## Goals\n\n- Automate repetitive coding tasks\n- Ensure quality through gates\n- Provide transparency in decisions\n\n## User Stories\n\n### As a developer\n- I want to see agent progress in real-time\n- I want to approve decisions at each gate' },
      { name: 'ARCHITECTURE.md', type: 'file', path: '/docs/ARCHITECTURE.md', content: '# System Architecture\n\n## Overview\n\nMicroservices architecture with event-driven communication.\n\n## Components\n\n### Frontend\n- React with TypeScript\n- Tailwind CSS\n- Framer Motion\n\n### Backend\n- FastAPI (Python)\n- PostgreSQL\n- Redis for caching\n\n### AI Agents\n- 14 specialized agents\n- Orchestrator for coordination' },
      { name: 'API.md', type: 'file', path: '/docs/API.md', content: '# API Documentation\n\n## Endpoints\n\n### Projects\n\n`GET /api/projects` - List all projects\n\n`POST /api/projects` - Create new project\n\n`GET /api/projects/:id` - Get project details\n\n### Agents\n\n`POST /api/agents/execute` - Run an agent\n\n`GET /api/agents/status` - Get agent status' },
    ],
  },
  {
    name: 'src',
    type: 'folder',
    path: '/src',
    children: [
      {
        name: 'components',
        type: 'folder',
        path: '/src/components',
        children: [
          { name: 'README.md', type: 'file', path: '/src/components/README.md', content: '# Components\n\nReusable UI components for the application.\n\n## Structure\n\n- `ui/` - Base UI components (Button, Card, Input)\n- `layout/` - Layout components (MainLayout)\n- `gates/` - Gate-related components' },
        ],
      },
      {
        name: 'pages',
        type: 'folder',
        path: '/src/pages',
        children: [
          { name: 'README.md', type: 'file', path: '/src/pages/README.md', content: '# Pages\n\nApplication pages and routes.\n\n## Dashboard Variants\n\n1. **Mission Control** - NASA-inspired command center\n2. **Journey Map** - Story-driven progress\n3. **Living Canvas** - Organic ecosystem view\n4. **Unified Dashboard** - Combined experience' },
        ],
      },
    ],
  },
  { name: 'CHANGELOG.md', type: 'file', path: '/CHANGELOG.md', content: '# Changelog\n\n## v0.3.0\n\n- Added biomorphic dashboard design\n- Integrated all 14 AI agents\n- Implemented real-time agent streaming\n\n## v0.2.0\n\n- Added gate approval workflow\n- Created proof artifact viewer\n- Implemented WebSocket connections\n\n## v0.1.0\n\n- Initial project setup\n- Basic dashboard structure\n- Authentication system' },
  { name: 'CONTRIBUTING.md', type: 'file', path: '/CONTRIBUTING.md', content: '# Contributing Guide\n\n## Development Setup\n\n1. Clone the repository\n2. Install dependencies: `npm install`\n3. Start dev server: `npm run dev`\n\n## Code Style\n\n- Use TypeScript for all new code\n- Follow the existing patterns\n- Add tests for new features\n\n## Pull Requests\n\n- Create feature branches\n- Write clear commit messages\n- Request review from maintainers' },
];

// Mock gate approval data
export const mockGateApproval: GateApprovalData = {
  gateNumber: 3,
  title: 'Architecture Review',
  description: 'The system architecture has been designed and is ready for approval. This gate ensures the technical foundation is solid before development begins.',
  checklist: [
    { item: 'Database schema reviewed', completed: true },
    { item: 'API contracts defined', completed: true },
    { item: 'Security considerations documented', completed: true },
    { item: 'Scalability plan approved', completed: false },
  ],
  artifacts: ['architecture-diagram.png', 'api-spec.yaml', 'database-schema.sql'],
  agentRecommendation: 'The Architect recommends approval. All critical components have been designed with scalability in mind. One minor item (scalability plan documentation) is pending but non-blocking.',
};
