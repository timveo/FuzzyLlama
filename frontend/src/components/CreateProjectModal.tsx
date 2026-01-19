import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { X, Loader2 } from 'lucide-react';
import { projectsApi } from '../api/projects';
import { workflowApi } from '../api/workflow';
import FuzzyLlamaLogoTransparent from '../assets/Llamalogo-transparent.png';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: () => void;
}

// Helper functions for project creation
function extractProjectName(description: string): string {
  const words = description.split(' ').slice(0, 6);
  const name = words.join(' ').replace(/[^\w\s-]/g, '').trim();
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ') || `My Project ${Date.now()}`;
}

function inferProjectType(description: string): 'traditional' | 'ai_ml' | 'hybrid' | 'enhancement' {
  const lowerDesc = description.toLowerCase();
  if (lowerDesc.includes('ai') || lowerDesc.includes('ml') || lowerDesc.includes('machine learning') ||
      lowerDesc.includes('chatbot') || lowerDesc.includes('gpt') || lowerDesc.includes('llm')) {
    return 'ai_ml';
  }
  if (lowerDesc.includes('enhance') || lowerDesc.includes('existing') ||
      lowerDesc.includes('add feature') || lowerDesc.includes('improve')) {
    return 'enhancement';
  }
  return 'traditional';
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onProjectCreated,
}) => {
  const navigate = useNavigate();
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const createProjectMutation = useMutation({
    mutationFn: async (desc: string) => {
      const project = await projectsApi.create({
        name: extractProjectName(desc),
        type: inferProjectType(desc),
        description: desc,
      });

      await workflowApi.start({
        projectId: project.id,
        requirements: desc,
      });

      return project;
    },
    onSuccess: (project) => {
      onProjectCreated();
      navigate(`/workspace?project=${project.id}&new=true`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create project');
      setIsCreating(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    setIsCreating(true);
    createProjectMutation.mutate(description.trim());
  };

  const handleClose = () => {
    if (!isCreating) {
      setDescription('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden"
        >
          {isCreating ? (
            // Creating state
            <div className="p-8 text-center">
              <motion.img
                src={FuzzyLlamaLogoTransparent}
                alt="Creating..."
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-24 h-24 mx-auto mb-4"
              />
              <p className="text-xl text-white font-medium">Creating your project...</p>
              <p className="text-slate-400 mt-2">Setting up the Orchestrator</p>
            </div>
          ) : (
            // Form state
            <>
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-700">
                <h2 className="text-lg font-semibold text-white">Create New Project</h2>
                <button
                  onClick={handleClose}
                  className="p-2 rounded-lg transition-colors hover:bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6">
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    What do you want to build?
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your project idea... e.g., 'A task management app with Kanban boards and real-time collaboration'"
                    className="w-full px-4 py-3 rounded-xl border transition-colors bg-slate-800 border-slate-600 text-white placeholder-slate-500 focus:border-teal-500 outline-none resize-none"
                    rows={4}
                    autoFocus
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    We'll automatically extract the project name and type from your description.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!description.trim()}
                    className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-colors ${
                      description.trim()
                        ? 'bg-teal-600 hover:bg-teal-500 text-white'
                        : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {createProjectMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Project'
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CreateProjectModal;
