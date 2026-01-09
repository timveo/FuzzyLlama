import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '../api/projects';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import type { Project } from '../types';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const { data: projects, isLoading, error } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(),
  });

  const handleCreateProject = () => {
    navigate('/projects/new');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-light-text-muted dark:text-dark-text-muted">Loading projects...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-red-600 dark:text-red-400 font-medium">Failed to load projects</p>
          <p className="text-light-text-muted dark:text-dark-text-muted text-sm mt-1">Please try again later</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-light-text-primary dark:text-dark-text-primary mb-2">
          Your Projects
        </h1>
        <p className="text-light-text-secondary dark:text-dark-text-secondary">
          Manage and monitor your AI-powered development projects
        </p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card padding="md">
          <div className="text-light-text-muted dark:text-dark-text-muted text-sm mb-1">
            Total Projects
          </div>
          <div className="text-3xl font-bold text-light-text-primary dark:text-dark-text-primary">
            {projects?.length || 0}
          </div>
          <div className="flex items-center gap-1 mt-2 text-sm text-green-600 dark:text-green-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span>This month</span>
          </div>
        </Card>

        <Card padding="md">
          <div className="text-light-text-muted dark:text-dark-text-muted text-sm mb-1">
            Active Agents
          </div>
          <div className="text-3xl font-bold text-light-text-primary dark:text-dark-text-primary">
            0
          </div>
          <div className="flex items-center gap-1 mt-2 text-sm text-light-text-muted dark:text-dark-text-muted">
            <span>None running</span>
          </div>
        </Card>

        <Card padding="md">
          <div className="text-light-text-muted dark:text-dark-text-muted text-sm mb-1">
            Gates Passed
          </div>
          <div className="text-3xl font-bold text-light-text-primary dark:text-dark-text-primary">
            0
          </div>
          <div className="flex items-center gap-1 mt-2 text-sm text-light-text-muted dark:text-dark-text-muted">
            <span>No approvals yet</span>
          </div>
        </Card>

        <Card padding="md">
          <div className="text-light-text-muted dark:text-dark-text-muted text-sm mb-1">
            Executions Used
          </div>
          <div className="text-3xl font-bold text-light-text-primary dark:text-dark-text-primary">
            0
          </div>
          <div className="flex items-center gap-1 mt-2 text-sm text-primary-600 dark:text-primary-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>50 remaining</span>
          </div>
        </Card>
      </div>

      {/* Projects Section */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-light-text-primary dark:text-dark-text-primary">
          All Projects
        </h2>
        <Button
          onClick={handleCreateProject}
          leftIcon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          }
        >
          New Project
        </Button>
      </div>

      {/* Projects Grid */}
      {projects && projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <EmptyState onCreateProject={handleCreateProject} />
      )}
    </div>
  );
};

// Project Card Component
interface ProjectCardProps {
  project: Project;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  const navigate = useNavigate();

  const getGateBadge = (gate: string) => {
    const gateMap: Record<string, { label: string; color: string }> = {
      G0: { label: 'G0: Init', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
      G1: { label: 'G1: Intake', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
      G2: { label: 'G2: PRD', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
      G3: { label: 'G3: Arch', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
      G4: { label: 'G4: Design', color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' },
      G5: { label: 'G5: Dev', color: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' },
    };

    const gateInfo = gateMap[gate] || gateMap.G0;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${gateInfo.color}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
        {gateInfo.label}
      </span>
    );
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <Card
      hover
      onClick={() => navigate(`/projects/${project.id}`)}
      className="group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
            {project.name}
          </h3>
          <span className="inline-block mt-1 px-2 py-0.5 bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300 rounded text-xs font-medium uppercase">
            {project.type}
          </span>
        </div>
        <button className="p-1 hover:bg-light-elevated dark:hover:bg-dark-elevated rounded transition-colors">
          <svg className="w-5 h-5 text-light-text-muted dark:text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
      </div>

      <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-4 line-clamp-2">
        {project.repository || 'No description provided'}
      </p>

      <div className="flex items-center gap-3 mb-4 text-sm">
        {getGateBadge(project.state?.currentGate || 'G0')}
        <div className="flex items-center gap-1 text-light-text-muted dark:text-dark-text-muted">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>0 tasks</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-light-text-muted dark:text-dark-text-muted">Progress</span>
          <span className="font-semibold text-primary-600 dark:text-primary-400">0%</span>
        </div>
        <div className="h-2 bg-light-elevated dark:bg-dark-elevated rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary-500 to-accent-600 rounded-full transition-all duration-300"
            style={{ width: '0%' }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-light-border dark:border-dark-border">
        <div className="flex items-center -space-x-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-accent-600 border-2 border-light-surface dark:border-dark-surface flex items-center justify-center text-white text-xs font-semibold">
            {project.owner?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
        </div>
        <span className="text-xs text-light-text-muted dark:text-dark-text-muted">
          {formatDate(new Date(project.createdAt).toISOString())}
        </span>
      </div>
    </Card>
  );
};

// Empty State Component
interface EmptyStateProps {
  onCreateProject: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ onCreateProject }) => {
  return (
    <Card padding="lg" className="text-center py-16">
      <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-10 h-10 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <h3 className="text-xl font-semibold text-light-text-primary dark:text-dark-text-primary mb-2">
        No projects yet
      </h3>
      <p className="text-light-text-secondary dark:text-dark-text-secondary mb-6 max-w-md mx-auto">
        Get started with AI-powered development by creating your first project. Choose from our starter templates or build from scratch.
      </p>
      <Button
        onClick={onCreateProject}
        size="lg"
        leftIcon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        }
      >
        Create Your First Project
      </Button>
      <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg text-sm">
        <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span className="text-primary-700 dark:text-primary-300">
          <strong>FREE Tier:</strong> 1 of 1 projects remaining
        </span>
      </div>
    </Card>
  );
};
