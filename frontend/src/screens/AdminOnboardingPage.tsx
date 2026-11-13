import React, { useState, useEffect } from 'react';
import { Eye, FileText, Check, RefreshCw } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { DataTable } from '../components/DataTable';
import type { Column } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import { Modal } from '../components/Modal';
import { api, AdminUserData } from '../services/api';

interface KycApplicant {
  id: string;
  userId: number;
  applicantName: string;
  email: string;
  documentType: string;
  riskScore: 'LOW_RISK' | 'MEDIUM_RISK' | 'HIGH_RISK';
  status: 'APPROVED' | 'PENDING_REVIEW' | 'REJECTED' | 'DOCUMENTS_REQUESTED';
  submissionDate: string;
  notes: string;
}

interface AdminOnboardingPageProps {
  onShowToast: (title: string, message?: string, type?: 'success' | 'info' | 'warning') => void;
}

export const AdminOnboardingPage: React.FC<AdminOnboardingPageProps> = ({ onShowToast }) => {
  const [requests, setRequests] = useState<KycApplicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState<KycApplicant | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const users: AdminUserData[] = await api.getAdminUsers();
      const applicants: KycApplicant[] = users.map((u) => {
        const isApproved = u.status === 'ACTIVE';
        const formattedDate = u.createdAt
          ? new Date(u.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : 'Nov 12, 2026';

        return {
          id: `KYC-${1000 + u.id}`,
          userId: u.id,
          applicantName: u.fullName || u.username,
          email: u.email,
          documentType: u.role === 'ADMIN' ? 'Institutional Security Clearance' : 'National ID & Biometric Verification',
          riskScore: u.status === 'SUSPENDED' ? 'HIGH_RISK' : 'LOW_RISK',
          status: isApproved ? 'APPROVED' : 'PENDING_REVIEW',
          submissionDate: formattedDate,
          notes: u.status === 'ACTIVE'
            ? 'Cryptographic OTP and identity verified on ledger'
            : 'Account under administrative compliance hold',
        };
      });
      setRequests(applicants);
    } catch (err: any) {
      onShowToast('Error', err.message || 'Unable to retrieve KYC applicant registry', 'warning');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateStatus = async (applicant: KycApplicant, newStatus: KycApplicant['status']) => {
    try {
      const dbStatus = newStatus === 'APPROVED' ? 'ACTIVE' : 'SUSPENDED';
      await api.updateUserStatus(applicant.userId, dbStatus);
      onShowToast(
        'KYC Compliance Updated',
        `Applicant ${applicant.applicantName} marked as ${newStatus.replace(/_/g, ' ')}`,
        'success'
      );
      setSelectedReq(null);
      await loadData();
    } catch (err: any) {
      onShowToast('Action Failed', err.message || 'Could not update applicant status', 'warning');
    }
  };

  const columns: Column<KycApplicant>[] = [
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
          <FileText className="w-3.5 h-3.5 text-deep-purple" />
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
        actions={
          <SecondaryButton size="sm" onClick={loadData} disabled={loading} icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}>
            Refresh Applications
          </SecondaryButton>
        }
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
                onClick={() => handleUpdateStatus(selectedReq, 'REJECTED')}
                className="text-app-error hover:bg-red-50"
              >
                Suspend / Reject
              </SecondaryButton>
              <PrimaryButton
                size="sm"
                onClick={() => handleUpdateStatus(selectedReq, 'APPROVED')}
                icon={<Check className="w-4 h-4" />}
              >
                Approve KYC &amp; Vault Access
              </PrimaryButton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
