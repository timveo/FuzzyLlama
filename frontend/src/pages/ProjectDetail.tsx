import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '../api/projects';
import { tasksApi } from '../api/tasks';
import { gatesApi } from '../api/gates';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'gates' | 'documents' | 'agents'>('overview');

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.get(id!),
    enabled: !!id,
  });

  const { data: tasks } = useQuery({
    queryKey: ['project-tasks', id],
    queryFn: () => tasksApi.list(id!),
    enabled: !!id,
  });

  const { data: gates } = useQuery({
    queryKey: ['project-gates', id],
    queryFn: () => gatesApi.list(id!),
    enabled: !!id,
  });

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-light-text-muted dark:text-dark-text-muted">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-red-600 dark:text-red-400 font-medium">Project not found</p>
        </div>
      </div>
    );
  }

  const currentGate = project.state?.currentGate || 'G0';
  const progress = project.state?.percentComplete || 0;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary mb-4"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Projects
        </button>

        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-light-text-primary dark:text-dark-text-primary mb-2">
              {project.name}
            </h1>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-block px-3 py-1 bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300 rounded-lg text-sm font-medium uppercase">
                {project.type}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-semibold bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                {currentGate}
              </span>
              {project.githubRepoUrl && (
                <a
                  href={project.githubRepoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  GitHub
                </a>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="md">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Button>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <Card padding="md" className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-light-text-primary dark:text-dark-text-primary">
            Project Progress
          </span>
          <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">
            {progress}%
          </span>
        </div>
        <div className="h-3 bg-light-elevated dark:bg-dark-elevated rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary-500 to-accent-600 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </Card>

      {/* Tabs */}
      <div className="border-b border-light-border dark:border-dark-border mb-6">
        <nav className="flex gap-1">
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'tasks', label: 'Tasks', count: tasks?.length },
            { id: 'gates', label: 'Gates', count: gates?.length },
            { id: 'documents', label: 'Documents' },
            { id: 'agents', label: 'Agents' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary'
              }`}
            >
              {tab.icon && <span className="mr-2">{tab.icon}</span>}
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-2 px-2 py-0.5 bg-light-elevated dark:bg-dark-elevated rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Stats & Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4">
              <Card padding="md">
                <div className="text-light-text-muted dark:text-dark-text-muted text-sm mb-1">Tasks</div>
                <div className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary">
                  {tasks?.length || 0}
                </div>
                <div className="text-xs text-light-text-muted dark:text-dark-text-muted mt-1">
                  {tasks?.filter((t) => t.status === 'complete').length || 0} completed
                </div>
              </Card>
              <Card padding="md">
                <div className="text-light-text-muted dark:text-dark-text-muted text-sm mb-1">Gates</div>
                <div className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary">
                  {gates?.length || 0}
                </div>
                <div className="text-xs text-light-text-muted dark:text-dark-text-muted mt-1">
                  {gates?.filter((g) => g.status === 'APPROVED').length || 0} approved
                </div>
              </Card>
              <Card padding="md">
                <div className="text-light-text-muted dark:text-dark-text-muted text-sm mb-1">Phase</div>
                <div className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary">
                  {project.state?.currentPhase || 'Init'}
                </div>
                <div className="text-xs text-light-text-muted dark:text-dark-text-muted mt-1">Current</div>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card padding="lg">
              <h3 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary mb-4">
                Recent Activity
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-light-text-primary dark:text-dark-text-primary">
                      Project created
                    </p>
                    <p className="text-xs text-light-text-muted dark:text-dark-text-muted mt-1">
                      {new Date(project.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column - Quick Actions */}
          <div className="space-y-6">
            <Card padding="lg">
              <h3 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary mb-4">
                Quick Actions
              </h3>
              <div className="space-y-3">
                <Button variant="primary" className="w-full" leftIcon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                }>
                  Run Agent
                </Button>
                <Button variant="outline" className="w-full" leftIcon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                }>
                  Create Task
                </Button>
                <Button variant="outline" className="w-full" leftIcon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                }>
                  View Documents
                </Button>
              </div>
            </Card>

            <Card padding="lg" className="bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-primary-600 dark:text-primary-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="font-semibold text-primary-900 dark:text-primary-100 mb-1">
                    Next Step
                  </h4>
                  <p className="text-sm text-primary-800 dark:text-primary-200">
                    Complete intake discovery to move to Gate 1
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'tasks' && (
        <div>
          <p className="text-light-text-secondary dark:text-dark-text-secondary">
            Task list will be displayed here
          </p>
        </div>
      )}

      {activeTab === 'gates' && (
        <div>
          <p className="text-light-text-secondary dark:text-dark-text-secondary">
            Gate timeline will be displayed here
          </p>
        </div>
      )}

      {activeTab === 'documents' && (
        <div>
          <p className="text-light-text-secondary dark:text-dark-text-secondary">
            Generated documents will be displayed here
          </p>
        </div>
      )}

      {activeTab === 'agents' && (
        <div>
          <p className="text-light-text-secondary dark:text-dark-text-secondary">
            Agent execution history will be displayed here
          </p>
        </div>
      )}
    </div>
  );
};
