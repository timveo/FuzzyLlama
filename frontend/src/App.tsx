import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './stores/auth';
import { useThemeStore } from './stores/theme';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { CreateProject } from './pages/CreateProject';
import { ProjectDetail } from './pages/ProjectDetail';
import { Tasks } from './pages/Tasks';
import { Gates } from './pages/Gates';
import { AgentExecution } from './pages/AgentExecution';
import { Settings } from './pages/Settings';
import { DocumentViewer } from './pages/DocumentViewer';
import { MainLayout } from './components/layout/MainLayout';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Protected Route Component
interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Public Route Component (redirect to dashboard if authenticated)
const PublicRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

function App() {
  const fetchUser = useAuthStore((state) => state.fetchUser);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const theme = useThemeStore((state) => state.theme);

  // Initialize theme on mount
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Try to fetch user on mount if there might be a stored token
  useEffect(() => {
    // Only fetch if we think we're authenticated (from persisted state)
    if (isAuthenticated) {
      fetchUser();
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            }
          />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Dashboard />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/tasks"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Tasks />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/gates"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Gates />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/projects/new"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <CreateProject />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/projects/:id"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <ProjectDetail />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/projects/:id/agents"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <AgentExecution />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Settings />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/projects/:id/documents"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <DocumentViewer />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Redirect root to dashboard or login */}
          <Route
            path="/"
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
