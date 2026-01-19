import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { ChevronRight, Sparkles, Code2, Rocket } from 'lucide-react';
import { useAuthStore } from '../stores/auth';
import FuzzyLlamaLogoTransparent from '../assets/Llamalogo-transparent.png';
import apiClient from '../lib/api-client';
import type { TeachingLevel } from '../types';

interface WelcomeScreenProps {
  onComplete: () => void;
}

const teachingLevelOptions: {
  level: TeachingLevel;
  title: string;
  description: string;
  icon: React.ElementType;
  details: string[];
}[] = [
  {
    level: 'NOVICE',
    title: "I'm new to coding",
    description: 'Full explanations with analogies',
    icon: Sparkles,
    details: [
      'Step-by-step guidance',
      'All jargon explained',
      'Suggested defaults',
      'Teaching moments at every step',
    ],
  },
  {
    level: 'INTERMEDIATE',
    title: "I've done some coding",
    description: 'Key decisions with trade-offs',
    icon: Code2,
    details: [
      'Options with pros/cons',
      'Advanced terms defined',
      'Ask for preferences',
      'Balanced explanations',
    ],
  },
  {
    level: 'EXPERT',
    title: "I'm a developer",
    description: 'Concise and direct',
    icon: Rocket,
    details: [
      'Trade-offs only',
      'Technical terminology',
      'Respect autonomy',
      'Batch approvals available',
    ],
  },
];

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onComplete }) => {
  const user = useAuthStore((state) => state.user);
  const fetchUser = useAuthStore((state) => state.fetchUser);
  const [selectedLevel, setSelectedLevel] = useState<TeachingLevel | null>(null);
  const [step, setStep] = useState<'welcome' | 'level'>('welcome');

  const updateTeachingLevelMutation = useMutation({
    mutationFn: async (teachingLevel: TeachingLevel) => {
      const response = await apiClient.patch('/users/me/teaching-level', { teachingLevel });
      return response.data;
    },
    onSuccess: async () => {
      await fetchUser();
      onComplete();
    },
  });

  const handleContinue = () => {
    if (step === 'welcome') {
      setStep('level');
    } else if (selectedLevel) {
      updateTeachingLevelMutation.mutate(selectedLevel);
    }
  };

  const handleSkip = () => {
    updateTeachingLevelMutation.mutate('INTERMEDIATE');
  };

  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{
          background: 'radial-gradient(ellipse at 50% 30%, #1e574f 0%, #1e3a5f 40%, #1a365d 70%, #1e293b 100%)',
        }}
      >
        {/* Animated gradient overlay */}
        <div
          className="absolute inset-0 opacity-50"
          style={{
            background:
              'radial-gradient(circle at 30% 40%, rgba(20, 184, 166, 0.4) 0%, transparent 50%), radial-gradient(circle at 70% 60%, rgba(59, 130, 246, 0.3) 0%, transparent 50%)',
          }}
        />

        <div className="relative z-10 w-full max-w-2xl px-8">
          {step === 'welcome' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              {/* Animated Llama Logo */}
              <motion.img
                src={FuzzyLlamaLogoTransparent}
                alt="Fuzzy Llama"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', delay: 0.1 }}
                className="w-40 h-40 mx-auto mb-6"
              />

              {/* Welcome Text */}
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-4xl md:text-5xl font-bold text-white mb-4"
              >
                Welcome to Fuzzy Llama, {firstName}!
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-xl text-slate-300 mb-8"
              >
                Let's build something amazing together.
              </motion.p>

              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                onClick={handleContinue}
                className="inline-flex items-center gap-2 px-8 py-4 bg-teal-600 hover:bg-teal-500 text-white text-lg font-medium rounded-2xl transition-colors"
              >
                Get Started
                <ChevronRight className="w-5 h-5" />
              </motion.button>
            </motion.div>
          )}

          {step === 'level' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Question Header */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-8"
              >
                <h2 className="text-3xl font-bold text-white mb-2">
                  What's your technical background?
                </h2>
                <p className="text-slate-400">
                  This helps us tailor explanations to your experience level
                </p>
              </motion.div>

              {/* Teaching Level Options */}
              <div className="grid gap-4 mb-8">
                {teachingLevelOptions.map((option, index) => (
                  <motion.button
                    key={option.level}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => setSelectedLevel(option.level)}
                    className={`w-full p-5 rounded-2xl border-2 transition-all text-left ${
                      selectedLevel === option.level
                        ? 'border-teal-500 bg-teal-500/10'
                        : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          selectedLevel === option.level
                            ? 'bg-teal-500 text-white'
                            : 'bg-slate-700 text-slate-400'
                        }`}
                      >
                        <option.icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-1">
                          {option.title}
                        </h3>
                        <p className="text-sm text-slate-400 mb-3">{option.description}</p>
                        <div className="flex flex-wrap gap-2">
                          {option.details.map((detail) => (
                            <span
                              key={detail}
                              className={`text-xs px-2 py-1 rounded-full ${
                                selectedLevel === option.level
                                  ? 'bg-teal-500/20 text-teal-300'
                                  : 'bg-slate-700 text-slate-400'
                              }`}
                            >
                              {detail}
                            </span>
                          ))}
                        </div>
                      </div>
                      {selectedLevel === option.level && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-6 h-6 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0"
                        >
                          <svg
                            className="w-4 h-4 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </motion.div>
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex items-center justify-between"
              >
                <button
                  onClick={handleSkip}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  Skip for now
                </button>
                <button
                  onClick={handleContinue}
                  disabled={!selectedLevel || updateTeachingLevelMutation.isPending}
                  className={`inline-flex items-center gap-2 px-8 py-3 rounded-xl font-medium transition-all ${
                    selectedLevel
                      ? 'bg-teal-600 hover:bg-teal-500 text-white'
                      : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {updateTeachingLevelMutation.isPending ? 'Saving...' : 'Continue'}
                  <ChevronRight className="w-5 h-5" />
                </button>
              </motion.div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default WelcomeScreen;
