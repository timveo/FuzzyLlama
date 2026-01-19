import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ProjectStateInfo {
  currentPhase: string;
  currentGate: string;
  percentComplete: number;
}

export interface ProjectData {
  id: string;
  name: string;
  type?: string;
  // Project state/progress
  state?: ProjectStateInfo;
  // Timestamps
  lastAccessedAt: string;
  createdAt?: string;
}

interface ProjectStore {
  // Current active project
  activeProject: ProjectData | null;

  // Recently accessed projects (for quick switching)
  recentProjects: ProjectData[];

  // Actions
  setActiveProject: (project: ProjectData | null) => void;
  updateActiveProject: (updates: Partial<ProjectData>) => void;
  updateProjectState: (stateUpdates: Partial<ProjectStateInfo>) => void;
  clearActiveProject: () => void;
  addToRecent: (project: ProjectData) => void;
  removeFromRecent: (projectId: string) => void;
  getRecentProject: (projectId: string) => ProjectData | undefined;
}

const MAX_RECENT_PROJECTS = 10;

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      activeProject: null,
      recentProjects: [],

      setActiveProject: (project) => {
        set({ activeProject: project });
        if (project) {
          // Also add to recent projects
          get().addToRecent(project);
        }
      },

      updateActiveProject: (updates) => {
        const current = get().activeProject;
        if (current) {
          const updated = { ...current, ...updates, lastAccessedAt: new Date().toISOString() };
          set({ activeProject: updated });
          // Update in recent list too
          get().addToRecent(updated);
        }
      },

      updateProjectState: (stateUpdates) => {
        const current = get().activeProject;
        if (current) {
          const updated = {
            ...current,
            state: { ...current.state, ...stateUpdates } as ProjectStateInfo,
            lastAccessedAt: new Date().toISOString(),
          };
          set({ activeProject: updated });
          // Update in recent list too
          get().addToRecent(updated);
        }
      },

      clearActiveProject: () => {
        set({ activeProject: null });
      },

      addToRecent: (project) => {
        set((state) => {
          // Remove existing entry for this project
          const filtered = state.recentProjects.filter((p) => p.id !== project.id);
          // Add to front with updated timestamp
          const updated = [
            { ...project, lastAccessedAt: new Date().toISOString() },
            ...filtered,
          ].slice(0, MAX_RECENT_PROJECTS);
          return { recentProjects: updated };
        });
      },

      removeFromRecent: (projectId) => {
        set((state) => ({
          recentProjects: state.recentProjects.filter((p) => p.id !== projectId),
        }));
      },

      getRecentProject: (projectId) => {
        return get().recentProjects.find((p) => p.id === projectId);
      },
    }),
    {
      name: 'fuzzyllama-project-storage',
      partialize: (state) => ({
        activeProject: state.activeProject,
        recentProjects: state.recentProjects,
      }),
    }
  )
);
