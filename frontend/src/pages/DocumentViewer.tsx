import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { documentsApi } from '../api/documents';
import { projectsApi } from '../api/projects';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import type { DocumentType } from '../types';

export const DocumentViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [selectedDocType, setSelectedDocType] = useState<DocumentType>('REQUIREMENTS');
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');

  const { data: project } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.get(id!),
    enabled: !!id,
  });

  const { data: documents } = useQuery({
    queryKey: ['documents', id],
    queryFn: () => documentsApi.list(id!),
    enabled: !!id,
  });

  const currentDocument = documents?.find((doc) => doc.documentType === selectedDocType);

  const documentTypes: Array<{
    type: DocumentType;
    label: string;
    icon: string;
    description: string;
  }> = [
    { type: 'REQUIREMENTS', label: 'Requirements', icon: '📋', description: 'Product Requirements Document' },
    { type: 'ARCHITECTURE', label: 'Architecture', icon: '🏗️', description: 'System Architecture' },
    { type: 'API_SPEC', label: 'API Spec', icon: '📡', description: 'API Specification' },
    { type: 'DATABASE_SCHEMA', label: 'Database Schema', icon: '🗄️', description: 'Database Schema' },
    { type: 'USER_STORY', label: 'User Stories', icon: '👤', description: 'User Stories' },
    { type: 'TEST_PLAN', label: 'Test Plan', icon: '🧪', description: 'Test Plan' },
    { type: 'DEPLOYMENT_GUIDE', label: 'Deployment', icon: '🚀', description: 'Deployment Guide' },
    { type: 'CODE', label: 'Code', icon: '💻', description: 'Code Files' },
    { type: 'OTHER', label: 'Other', icon: '📄', description: 'Other Documents' },
  ];

  const handleEdit = () => {
    setEditedContent(currentDocument?.content || '');
    setIsEditing(true);
  };

  const handleSave = () => {
    // TODO: Implement save functionality
    console.log('Saving document:', { type: selectedDocType, content: editedContent });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedContent('');
  };

  // Documents don't have isLocked field in types, assuming all are editable
  const isLocked = false;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-light-text-primary dark:text-dark-text-primary mb-2">
          Documents
        </h1>
        <p className="text-light-text-secondary dark:text-dark-text-secondary">
          View and edit project documents - {project?.name}
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar - Document List */}
        <div className="col-span-3">
          <Card padding="md">
            <h2 className="text-sm font-semibold text-light-text-primary dark:text-dark-text-primary uppercase tracking-wider mb-3">
              Documents
            </h2>
            <div className="space-y-1">
              {documentTypes.map((docType) => {
                const isSelected = selectedDocType === docType.type;

                return (
                  <button
                    key={docType.type}
                    onClick={() => setSelectedDocType(docType.type)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      isSelected
                        ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                        : 'hover:bg-light-elevated dark:hover:bg-dark-elevated text-light-text-primary dark:text-dark-text-primary'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{docType.icon}</span>
                      <span className="font-medium text-sm">{docType.label}</span>
                    </div>
                    <div className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                      {docType.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Main Content - Document Viewer/Editor */}
        <div className="col-span-9">
          <Card padding="lg">
            {/* Document Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-light-border dark:border-dark-border">
              <div className="flex items-center gap-3">
                <span className="text-3xl">
                  {documentTypes.find((dt) => dt.type === selectedDocType)?.icon}
                </span>
                <div>
                  <h2 className="text-xl font-semibold text-light-text-primary dark:text-dark-text-primary">
                    {documentTypes.find((dt) => dt.type === selectedDocType)?.label}
                  </h2>
                  <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                    {documentTypes.find((dt) => dt.type === selectedDocType)?.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {isLocked && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 text-sm">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    Locked
                  </div>
                )}
                {currentDocument && !isEditing && !isLocked && (
                  <Button onClick={handleEdit} variant="outline" size="sm">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </Button>
                )}
                {currentDocument && (
                  <Button variant="ghost" size="sm">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export
                  </Button>
                )}
              </div>
            </div>

            {/* Document Content */}
            {!currentDocument ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-light-elevated dark:bg-dark-elevated flex items-center justify-center">
                  <svg className="w-10 h-10 text-light-text-secondary dark:text-dark-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary mb-2">
                  Document Not Available
                </h3>
                <p className="text-light-text-secondary dark:text-dark-text-secondary mb-6">
                  This document hasn't been created yet. Agents will generate it during the appropriate gate.
                </p>
              </div>
            ) : isEditing ? (
              <div className="space-y-4">
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  rows={20}
                  className="w-full px-4 py-3 rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text-primary dark:text-dark-text-primary font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <div className="flex items-center gap-3">
                  <Button onClick={handleSave} variant="primary">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Changes
                  </Button>
                  <Button onClick={handleCancel} variant="ghost">
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div className="whitespace-pre-wrap text-light-text-primary dark:text-dark-text-primary">
                  {currentDocument.content}
                </div>
              </div>
            )}

            {/* Document Metadata */}
            {currentDocument && (
              <div className="mt-8 pt-6 border-t border-light-border dark:border-dark-border">
                <h3 className="text-sm font-semibold text-light-text-primary dark:text-dark-text-primary uppercase tracking-wider mb-3">
                  Document Info
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-light-text-secondary dark:text-dark-text-secondary mb-1">
                      Last Updated
                    </div>
                    <div className="text-light-text-primary dark:text-dark-text-primary">
                      {new Date(currentDocument.updatedAt).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-light-text-secondary dark:text-dark-text-secondary mb-1">
                      Version
                    </div>
                    <div className="text-light-text-primary dark:text-dark-text-primary">
                      {currentDocument.version}
                    </div>
                  </div>
                  <div>
                    <div className="text-light-text-secondary dark:text-dark-text-secondary mb-1">
                      Gate
                    </div>
                    <div className="text-light-text-primary dark:text-dark-text-primary">
                      {currentDocument.gateId || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-light-text-secondary dark:text-dark-text-secondary mb-1">
                      Status
                    </div>
                    <div className="text-light-text-primary dark:text-dark-text-primary">
                      {isLocked ? 'Locked' : 'Editable'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
