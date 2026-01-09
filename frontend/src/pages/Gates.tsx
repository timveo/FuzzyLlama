import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { gatesApi } from '../api/gates';
import { projectsApi } from '../api/projects';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import type { Gate } from '../types';

export const Gates: React.FC = () => {
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(),
  });

  const { data: gates, isLoading, error } = useQuery({
    queryKey: ['gates', selectedProject],
    queryFn: () => {
      if (selectedProject === 'all') {
        return Promise.all(
          (projects || []).map((p) => gatesApi.list(p.id))
        ).then((results) => results.flat());
      }
      return gatesApi.list(selectedProject);
    },
    enabled: selectedProject === 'all' ? !!projects : true,
  });

  const filteredGates = gates?.filter((gate: Gate) => {
    if (selectedStatus === 'all') return true;
    return gate.status === selectedStatus;
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
      APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      IN_REVIEW: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      BLOCKED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    };
    return colors[status] || colors.PENDING;
  };

  const getGateName = (gateType: string) => {
    const gates: Record<string, string> = {
      G0: 'Gate 0: Initialization',
      G1: 'Gate 1: Intake & Discovery',
      G2: 'Gate 2: PRD & Requirements',
      G3: 'Gate 3: Architecture',
      G4: 'Gate 4: Design',
      G5: 'Gate 5: Development',
    };
    return gates[gateType] || gateType;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-light-text-muted dark:text-dark-text-muted">Loading gates...</p>
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
          <p className="text-red-600 dark:text-red-400 font-medium">Failed to load gates</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-light-text-primary dark:text-dark-text-primary mb-2">
          Gate Approvals
        </h1>
        <p className="text-light-text-secondary dark:text-dark-text-secondary">
          Review and approve project gates to advance through development phases
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
            onChange={(e) => setSelectedStatus(e.target.value as 'all' | 'pending' | 'approved' | 'rejected')}
            className="px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-surface dark:bg-dark-surface text-light-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Gate Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Gates', count: gates?.length || 0, color: 'text-light-text-primary dark:text-dark-text-primary' },
          { label: 'Pending', count: gates?.filter((g: Gate) => g.status === 'PENDING').length || 0, color: 'text-yellow-600 dark:text-yellow-400' },
          { label: 'Approved', count: gates?.filter((g: Gate) => g.status === 'APPROVED').length || 0, color: 'text-green-600 dark:text-green-400' },
          { label: 'Rejected', count: gates?.filter((g: Gate) => g.status === 'REJECTED').length || 0, color: 'text-red-600 dark:text-red-400' },
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

      {/* Gates List */}
      {filteredGates && filteredGates.length > 0 ? (
        <div className="space-y-4">
          {filteredGates.map((gate) => (
            <GateCard key={gate.id} gate={gate} getStatusColor={getStatusColor} getGateName={getGateName} />
          ))}
        </div>
      ) : (
        <Card padding="lg" className="text-center py-16">
          <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-light-text-primary dark:text-dark-text-primary mb-2">
            No gates found
          </h3>
          <p className="text-light-text-secondary dark:text-dark-text-secondary">
            {selectedProject !== 'all' || selectedStatus !== 'all'
              ? 'Try adjusting your filters.'
              : 'Gates will appear here as projects progress through development phases.'}
          </p>
        </Card>
      )}
    </div>
  );
};

// Gate Card Component
interface GateCardProps {
  gate: Gate;
  getStatusColor: (status: string) => string;
  getGateName: (gateId: string) => string;
}

const GateCard: React.FC<GateCardProps> = ({ gate, getStatusColor, getGateName }) => {
  

  return (
    <Card padding="md" className="relative">
      <div className="flex items-start gap-6">
        {/* Gate Icon */}
        <div className="flex-shrink-0">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary-500 to-accent-600 flex items-center justify-center shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
        </div>

        {/* Gate Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <h3 className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary mb-1">
                {getGateName(gate.gateType)}
              </h3>
              {gate.project && (
                <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                  Project: {gate.project.name}
                </p>
              )}
            </div>

            {/* Status Badge */}
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold ${getStatusColor(gate.status)}`}>
              {gate.status === 'PENDING' && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {gate.status === 'APPROVED' && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {gate.status === 'REJECTED' && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              {gate.status.toUpperCase()}
            </span>
          </div>

          {/* Gate Details */}
          {gate.description && (
            <div className="mb-4">
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                {gate.description}
              </p>
            </div>
          )}

          {gate.passingCriteria && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-light-text-primary dark:text-dark-text-primary mb-2">
                Passing Criteria:
              </h4>
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                {gate.passingCriteria}
              </p>
            </div>
          )}

          {/* Proof Artifacts */}
          {gate.proofArtifacts && gate.proofArtifacts.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-light-text-primary dark:text-dark-text-primary mb-2">
                Proof Artifacts:
              </h4>
              <div className="flex flex-wrap gap-2">
                {gate.proofArtifacts.map((artifact) => (
                  <span key={artifact.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-light-elevated dark:bg-dark-elevated text-light-text-secondary dark:text-dark-text-secondary">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {artifact.proofType}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Approval/Rejection Info */}
          {gate.status === 'APPROVED' && (
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-green-800 dark:text-green-200">
                      Approved
                    </span>
                    {gate.approvedAt && (
                      <span className="text-xs text-green-600 dark:text-green-400">
                        {new Date(gate.approvedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {gate.reviewNotes && (
                    <p className="text-sm text-green-700 dark:text-green-300">
                      {gate.reviewNotes}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {gate.status === 'REJECTED' && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-red-800 dark:text-red-200">
                      Rejected
                    </span>
                    {gate.approvedAt && (
                      <span className="text-xs text-red-600 dark:text-red-400">
                        {new Date(gate.approvedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {gate.blockingReason && (
                    <p className="text-sm text-red-700 dark:text-red-300">
                      {gate.blockingReason}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          {gate.status === 'PENDING' && (
            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-light-border dark:border-dark-border">
              <Button
                variant="primary"
                size="md"
                
                leftIcon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                }
              >
                Approve Gate
              </Button>
              <Button
                variant="danger"
                size="md"
                
                leftIcon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                }
              >
                Reject Gate
              </Button>
              <Button
                variant="ghost"
                size="md"
                leftIcon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                }
              >
                View Details
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
