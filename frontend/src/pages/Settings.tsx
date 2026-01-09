import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/auth';
import { useThemeStore } from '../stores/theme';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';

export const Settings: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const { theme, toggleTheme } = useThemeStore();
  const queryClient = useQueryClient();

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [apiKeys, setApiKeys] = useState({
    claudeApiKey: '',
    openaiApiKey: '',
    githubToken: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof profileData) => {
      // TODO: Implement actual API call
      console.log('Updating profile:', data);
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async (data: typeof passwordData) => {
      // TODO: Implement actual API call
      console.log('Updating password:', data);
      return { success: true };
    },
    onSuccess: () => {
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    },
  });

  const updateApiKeysMutation = useMutation({
    mutationFn: async (data: typeof apiKeys) => {
      // TODO: Implement actual API call
      console.log('Updating API keys:', data);
      return { success: true };
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileData);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    if (passwordData.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    updatePasswordMutation.mutate(passwordData);
  };

  const handleApiKeysSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateApiKeysMutation.mutate(apiKeys);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-light-text-primary dark:text-dark-text-primary mb-2">
          Settings
        </h1>
        <p className="text-light-text-secondary dark:text-dark-text-secondary">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile Settings */}
        <Card padding="lg">
          <h2 className="text-xl font-semibold text-light-text-primary dark:text-dark-text-primary mb-4">
            Profile Information
          </h2>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <Input
              label="Full Name"
              type="text"
              value={profileData.name}
              onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
              placeholder="John Doe"
              required
              leftIcon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              }
            />
            <Input
              label="Email Address"
              type="email"
              value={profileData.email}
              onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
              placeholder="john@example.com"
              required
              leftIcon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              }
            />
            <div className="flex items-center gap-4">
              <Button
                type="submit"
                variant="primary"
                isLoading={updateProfileMutation.isPending}
              >
                Save Changes
              </Button>
              {updateProfileMutation.isSuccess && (
                <span className="text-sm text-green-600 dark:text-green-400">
                  Profile updated successfully!
                </span>
              )}
            </div>
          </form>
        </Card>

        {/* Password Settings */}
        <Card padding="lg">
          <h2 className="text-xl font-semibold text-light-text-primary dark:text-dark-text-primary mb-4">
            Change Password
          </h2>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
              placeholder="••••••••"
              required
              leftIcon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              }
            />
            <Input
              label="New Password"
              type="password"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              placeholder="••••••••"
              required
              error={errors.newPassword}
              helperText="Must be at least 8 characters"
              leftIcon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              }
            />
            <Input
              label="Confirm New Password"
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              placeholder="••••••••"
              required
              error={errors.confirmPassword}
              leftIcon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              }
            />
            <div className="flex items-center gap-4">
              <Button
                type="submit"
                variant="primary"
                isLoading={updatePasswordMutation.isPending}
              >
                Update Password
              </Button>
              {updatePasswordMutation.isSuccess && (
                <span className="text-sm text-green-600 dark:text-green-400">
                  Password updated successfully!
                </span>
              )}
            </div>
          </form>
        </Card>

        {/* API Keys */}
        <Card padding="lg">
          <h2 className="text-xl font-semibold text-light-text-primary dark:text-dark-text-primary mb-4">
            API Keys
          </h2>
          <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-4">
            Connect your own API keys to use premium AI models
          </p>
          <form onSubmit={handleApiKeysSubmit} className="space-y-4">
            <Input
              label="Claude API Key (Optional)"
              type="password"
              value={apiKeys.claudeApiKey}
              onChange={(e) => setApiKeys({ ...apiKeys, claudeApiKey: e.target.value })}
              placeholder="sk-ant-api..."
              helperText="Get your API key from console.anthropic.com"
              leftIcon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              }
            />
            <Input
              label="OpenAI API Key (Optional)"
              type="password"
              value={apiKeys.openaiApiKey}
              onChange={(e) => setApiKeys({ ...apiKeys, openaiApiKey: e.target.value })}
              placeholder="sk-..."
              helperText="Get your API key from platform.openai.com"
              leftIcon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              }
            />
            <Input
              label="GitHub Personal Access Token (Optional)"
              type="password"
              value={apiKeys.githubToken}
              onChange={(e) => setApiKeys({ ...apiKeys, githubToken: e.target.value })}
              placeholder="ghp_..."
              helperText="Required for GitHub export. Get from github.com/settings/tokens"
              leftIcon={
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              }
            />
            <div className="flex items-center gap-4">
              <Button
                type="submit"
                variant="primary"
                isLoading={updateApiKeysMutation.isPending}
              >
                Save API Keys
              </Button>
              {updateApiKeysMutation.isSuccess && (
                <span className="text-sm text-green-600 dark:text-green-400">
                  API keys saved successfully!
                </span>
              )}
            </div>
          </form>
        </Card>

        {/* Appearance Settings */}
        <Card padding="lg">
          <h2 className="text-xl font-semibold text-light-text-primary dark:text-dark-text-primary mb-4">
            Appearance
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-light-text-primary dark:text-dark-text-primary mb-1">
                Theme
              </div>
              <div className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                Current theme: {theme === 'dark' ? 'Dark' : 'Light'}
              </div>
            </div>
            <Button onClick={toggleTheme} variant="outline">
              {theme === 'dark' ? (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Switch to Light
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                  Switch to Dark
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Subscription (placeholder) */}
        <Card padding="lg">
          <h2 className="text-xl font-semibold text-light-text-primary dark:text-dark-text-primary mb-4">
            Subscription
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-light-text-primary dark:text-dark-text-primary mb-1">
                Current Plan: <span className="text-primary-500">Free</span>
              </div>
              <div className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                1 project • 50 agent executions/month
              </div>
            </div>
            <Button variant="primary">
              Upgrade to Pro
            </Button>
          </div>
        </Card>

        {/* Danger Zone */}
        <Card padding="lg" className="border-red-200 dark:border-red-800">
          <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-4">
            Danger Zone
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-light-text-primary dark:text-dark-text-primary mb-1">
                Delete Account
              </div>
              <div className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                Permanently delete your account and all data
              </div>
            </div>
            <Button variant="danger">
              Delete Account
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
