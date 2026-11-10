import React, { useState } from 'react';
import { Eye, FileText, Check } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { DataTable } from '../components/DataTable';
import type { Column } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import { Modal } from '../components/Modal';
import { DEMO_ONBOARDING } from '../data/mockData';
import type { OnboardingRequest } from '../types';

interface AdminOnboardingPageProps {
  onShowToast: (title: string, message?: string, type?: 'success' | 'info' | 'warning') => void;
}

export const AdminOnboardingPage: React.FC<AdminOnboardingPageProps> = ({ onShowToast }) => {
  const [requests, setRequests] = useState<OnboardingRequest[]>(DEMO_ONBOARDING);
  const [selectedReq, setSelectedReq] = useState<OnboardingRequest | null>(null);

  const handleUpdateStatus = (id: string, status: OnboardingRequest['status']) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r))
    );
    onShowToast('KYC Status Updated', `Application marked as ${status.replace(/_/g, ' ')}`, 'success');
    setSelectedReq(null);
  };

  const columns: Column<OnboardingRequest>[] = [
    {
      header: 'Applicant Details',
      accessor: (row) => (
        <div>
          <span className="font-bold text-sm text-primary-text block">{row.applicantName}</span>
          <span className="text-xs text-secondary-text">{row.email}</span>
        </div>
      ),
    },
    {
      header: 'Verification Asset',
      accessor: (row) => (
        <span className="inline-flex items-center gap-1.5 text-xs text-primary-text font-medium">
          <FileText className="w-3.5 h-3.5 text-deep-sage" />
          <span>{row.documentType}</span>
        </span>
      ),
    },
    {
      header: 'Risk Assessment',
      accessor: (row) => <StatusBadge status={row.riskScore} size="sm" />,
    },
    {
      header: 'Workflow State',
      accessor: (row) => <StatusBadge status={row.status} size="sm" />,
    },
    {
      header: 'Actions',
      className: 'text-right',
      headerClassName: 'text-right',
      accessor: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <SecondaryButton size="sm" onClick={() => setSelectedReq(row)} icon={<Eye className="w-3.5 h-3.5" />}>
            Review
          </SecondaryButton>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Onboarding &amp; KYC Verification"
        description="Review incoming customer identity applications and approve vault credentials."
      />

      {/* Requests DataTable */}
      <DataTable
        columns={columns}
        data={requests}
        keyExtractor={(r) => r.id}
      />

      {/* Review Modal */}
      {selectedReq && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedReq(null)}
          title={`KYC Compliance Review: ${selectedReq.applicantName}`}
          subtitle={`Application ID: ${selectedReq.id}`}
        >
          <div className="space-y-5 text-xs">
            <div className="p-4 rounded-xl bg-light-bg border border-app-border space-y-2.5">
              <div className="flex justify-between">
                <span className="text-secondary-text">Submission Date:</span>
                <span className="font-semibold text-primary-text">{selectedReq.submissionDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary-text">Document Presented:</span>
                <span className="font-semibold text-primary-text">{selectedReq.documentType} (Validated)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary-text">Automated Risk Score:</span>
                <StatusBadge status={selectedReq.riskScore} size="sm" />
              </div>
              <div className="flex justify-between">
                <span className="text-secondary-text">Compliance Notes:</span>
                <span className="text-primary-text italic">{selectedReq.notes || 'None'}</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <SecondaryButton
                size="sm"
                onClick={() => handleUpdateStatus(selectedReq.id, 'DOCUMENTS_REQUESTED')}
              >
                Request Docs
              </SecondaryButton>
              <SecondaryButton
                size="sm"
                onClick={() => handleUpdateStatus(selectedReq.id, 'REJECTED')}
                className="text-app-error hover:bg-red-50"
              >
                Reject
              </SecondaryButton>
              <PrimaryButton
                size="sm"
                onClick={() => handleUpdateStatus(selectedReq.id, 'APPROVED')}
                icon={<Check className="w-4 h-4" />}
              >
                Approve KYC
              </PrimaryButton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

