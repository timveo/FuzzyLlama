import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tasksApi } from '../api/tasks';
import { projectsApi } from '../api/projects';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import type { Task, TaskStatus } from '../types';

export const Tasks: React.FC = () => {
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus | 'all'>('all');

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(),
  });

  const { data: tasks, isLoading, error } = useQuery({
    queryKey: ['tasks', selectedProject],
    queryFn: () => {
      if (selectedProject === 'all') {
        // Fetch tasks from all projects
        return Promise.all(
          (projects || []).map((p) => tasksApi.list(p.id))
        ).then((results) => results.flat());
      }
      return tasksApi.list(selectedProject);
    },
    enabled: selectedProject === 'all' ? !!projects : true,
  });

  const filteredTasks = tasks?.filter((task) => {
    if (selectedStatus === 'all') return true;
    return task.status === selectedStatus;
  });

  const getStatusColor = (status: TaskStatus) => {
    const colors: Record<TaskStatus, string> = {
      not_started: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      in_progress: 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300',
      complete: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      blocked: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      skipped: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
      failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    };
    return colors[status];
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      LOW: 'text-gray-500 dark:text-gray-400',
      MEDIUM: 'text-blue-500 dark:text-blue-400',
      HIGH: 'text-orange-500 dark:text-orange-400',
      CRITICAL: 'text-red-500 dark:text-red-400',
    };
    return colors[priority] || colors.MEDIUM;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-light-text-muted dark:text-dark-text-muted">Loading tasks...</p>
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
          <p className="text-red-600 dark:text-red-400 font-medium">Failed to load tasks</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-light-text-primary dark:text-dark-text-primary mb-2">
          Task Management
        </h1>
        <p className="text-light-text-secondary dark:text-dark-text-secondary">
          View and manage tasks across all your projects
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        {/* Project Filter */}
        <div>
          <label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2">
            Project
          </label>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface text-light-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Projects</option>
            {projects?.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2">
            Status
          </label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as TaskStatus | 'all')}
            className="px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface text-light-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Status</option>
            <option value="not_started">Not Started</option>
            <option value="in_progress">In Progress</option>
            <option value="complete">Complete</option>
            <option value="blocked">Blocked</option>
            <option value="skipped">Skipped</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div className="flex-1"></div>

        {/* New Task Button */}
        <div className="flex items-end">
          <Button
            leftIcon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }
          >
            New Task
          </Button>
        </div>
      </div>

      {/* Task Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        {[
          { label: 'Total', count: tasks?.length || 0, color: 'text-light-text-primary dark:text-dark-text-primary' },
          { label: 'Not Started', count: tasks?.filter((t) => t.status === 'not_started').length || 0, color: 'text-gray-600 dark:text-gray-400' },
          { label: 'In Progress', count: tasks?.filter((t) => t.status === 'in_progress').length || 0, color: 'text-primary-600 dark:text-primary-400' },
          { label: 'Complete', count: tasks?.filter((t) => t.status === 'complete').length || 0, color: 'text-green-600 dark:text-green-400' },
          { label: 'Blocked', count: tasks?.filter((t) => t.status === 'blocked').length || 0, color: 'text-red-600 dark:text-red-400' },
          { label: 'Failed', count: tasks?.filter((t) => t.status === 'failed').length || 0, color: 'text-red-600 dark:text-red-400' },
        ].map((stat) => (
          <Card key={stat.label} padding="sm">
            <div className="text-xs text-light-text-muted dark:text-dark-text-muted mb-1">
              {stat.label}
            </div>
            <div className={`text-2xl font-bold ${stat.color}`}>
              {stat.count}
            </div>
          </Card>
        ))}
      </div>

      {/* Tasks List */}
      {filteredTasks && filteredTasks.length > 0 ? (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <TaskCard key={task.id} task={task} getStatusColor={getStatusColor} getPriorityColor={getPriorityColor} />
          ))}
        </div>
      ) : (
        <Card padding="lg" className="text-center py-16">
          <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-light-text-primary dark:text-dark-text-primary mb-2">
            No tasks found
          </h3>
          <p className="text-light-text-secondary dark:text-dark-text-secondary mb-6">
            {selectedProject !== 'all' || selectedStatus !== 'all'
              ? 'Try adjusting your filters or create a new task.'
              : 'Get started by creating your first task.'}
          </p>
          <Button
            leftIcon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }
          >
            Create Task
          </Button>
        </Card>
      )}
    </div>
  );
};

// Task Card Component
interface TaskCardProps {
  task: Task;
  getStatusColor: (status: TaskStatus) => string;
  getPriorityColor: (priority: string) => string;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, getStatusColor, getPriorityColor }) => {
  return (
    <Card hover className="group">
      <div className="flex items-start gap-4">
        {/* Checkbox */}
        <div className="pt-1">
          <input
            type="checkbox"
            checked={task.status === 'complete'}
            onChange={() => {}}
            className="w-5 h-5 rounded border-light-border dark:border-dark-border text-primary-500 focus:ring-primary-500 focus:ring-offset-0 cursor-pointer"
          />
        </div>

        {/* Task Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                {task.name}
              </h3>
              {task.description && (
                <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-1 line-clamp-2">
                  {task.description}
                </p>
              )}
            </div>
            <button className="p-1 hover:bg-light-elevated dark:hover:bg-dark-elevated rounded transition-colors">
              <svg className="w-5 h-5 text-light-text-muted dark:text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          </div>

          {/* Task Meta */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Status Badge */}
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${getStatusColor(task.status)}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
              {task.status.replace('_', ' ').toUpperCase()}
            </span>

            {/* Priority */}
            {task.priority && (
              <div className="flex items-center gap-1">
                <svg className={`w-4 h-4 ${getPriorityColor(task.priority)}`} fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14 10v6a2 2 0 01-2 2H8a2 2 0 01-2-2v-6" />
                </svg>
                <span className={`text-xs font-medium ${getPriorityColor(task.priority)}`}>
                  {task.priority}
                </span>
              </div>
            )}

            {/* Phase */}
            <span className="text-xs text-light-text-muted dark:text-dark-text-muted">
              Phase: {task.phase}
            </span>

            {/* Project */}
            {task.project && (
              <span className="text-xs text-light-text-muted dark:text-dark-text-muted">
                Project: {task.project.name}
              </span>
            )}

            {/* Assignee */}
            {task.assignedTo && (
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center text-white text-xs font-semibold">
                  {task.assignedTo.name?.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs text-light-text-muted dark:text-dark-text-muted">
                  {task.assignedTo.name}
                </span>
              </div>
            )}

            {/* Effort */}
            {task.estimatedEffort && (
              <span className="text-xs text-light-text-muted dark:text-dark-text-muted">
                Est: {task.estimatedEffort}h
              </span>
            )}
          </div>

          {/* Blocking Reason */}
          {task.status === 'blocked' && task.blockingReason && (
            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">Blocked</p>
                  <p className="text-xs text-red-700 dark:text-red-300 mt-1">{task.blockingReason}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
