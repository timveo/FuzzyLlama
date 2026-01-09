import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { projectsApi } from '../api/projects';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import type { ProjectType } from '../types';

export const CreateProject: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    type: 'traditional' as ProjectType,
    repository: '',
    githubRepoUrl: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => projectsApi.create(data),
    onSuccess: (project) => {
      navigate(`/projects/${project.id}`);
    },
    onError: (error: any) => {
      setErrors({
        general: error.response?.data?.message || 'Failed to create project',
      });
    },
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required';
    }

    if (!formData.type) {
      newErrors.type = 'Project type is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    createMutation.mutate(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    // Clear error for this field
    if (errors[e.target.name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[e.target.name];
        return newErrors;
      });
    }
  };

  const projectTypes = [
    {
      value: 'traditional',
      label: 'Traditional Software',
      description: 'Web apps, mobile apps, APIs, and standard software projects',
      icon: '💻',
    },
    {
      value: 'ai_ml',
      label: 'AI/ML Project',
      description: 'Machine learning models, data pipelines, and AI applications',
      icon: '🤖',
    },
    {
      value: 'hybrid',
      label: 'Hybrid Project',
      description: 'Combination of traditional software with AI/ML components',
      icon: '🔄',
    },
    {
      value: 'enhancement',
      label: 'Enhancement',
      description: 'Improvements to existing projects or codebases',
      icon: '⚡',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary mb-4"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold text-light-text-primary dark:text-dark-text-primary mb-2">
          Create New Project
        </h1>
        <p className="text-light-text-secondary dark:text-dark-text-secondary">
          Set up a new project with AI-powered development agents
        </p>
      </div>

      {/* Error Alert */}
      {errors.general && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">{errors.general}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Project Type Selection */}
        <Card padding="lg">
          <h2 className="text-xl font-semibold text-light-text-primary dark:text-dark-text-primary mb-4">
            Choose Project Type
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projectTypes.map((type) => (
              <label
                key={type.value}
                className={`relative flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  formData.type === type.value
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-light-border dark:border-dark-border hover:border-primary-300 dark:hover:border-primary-700'
                }`}
              >
                <input
                  type="radio"
                  name="type"
                  value={type.value}
                  checked={formData.type === type.value}
                  onChange={handleChange}
                  className="sr-only"
                />
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{type.icon}</span>
                  <div className="flex-1">
                    <div className="font-semibold text-light-text-primary dark:text-dark-text-primary mb-1">
                      {type.label}
                    </div>
                    <div className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                      {type.description}
                    </div>
                  </div>
                </div>
                {formData.type === type.value && (
                  <div className="absolute top-3 right-3">
                    <svg className="w-6 h-6 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </label>
            ))}
          </div>
          {errors.type && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.type}</p>
          )}
        </Card>

        {/* Project Details */}
        <Card padding="lg">
          <h2 className="text-xl font-semibold text-light-text-primary dark:text-dark-text-primary mb-4">
            Project Details
          </h2>
          <div className="space-y-5">
            <Input
              label="Project Name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="My Awesome Project"
              error={errors.name}
              required
              helperText="Choose a clear, descriptive name for your project"
              leftIcon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              }
            />

            <Input
              label="Repository Name (Optional)"
              type="text"
              name="repository"
              value={formData.repository}
              onChange={handleChange}
              placeholder="my-awesome-project"
              helperText="Leave empty to auto-generate from project name"
              leftIcon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              }
            />

            <Input
              label="GitHub Repository URL (Optional)"
              type="url"
              name="githubRepoUrl"
              value={formData.githubRepoUrl}
              onChange={handleChange}
              placeholder="https://github.com/username/repo"
              helperText="Connect to an existing GitHub repository"
              leftIcon={
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              }
            />
          </div>
        </Card>

        {/* Info Card */}
        <Card padding="md" className="bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h3 className="font-semibold text-primary-900 dark:text-primary-100 mb-1">
                What happens next?
              </h3>
              <ul className="text-sm text-primary-800 dark:text-primary-200 space-y-1">
                <li>• Your project will be initialized at Gate 0 (G0)</li>
                <li>• AI agents will help you define requirements and architecture</li>
                <li>• You'll approve each gate before moving to the next phase</li>
                <li>• Agents will generate code, tests, and documentation automatically</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={createMutation.isPending}
            leftIcon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }
          >
            Create Project
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={() => navigate('/dashboard')}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
};
