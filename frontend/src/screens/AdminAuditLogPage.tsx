import React, { useState } from 'react';
import { Download, Search, Eye, Lock } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { DataTable } from '../components/DataTable';
import type { Column } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { SecondaryButton } from '../components/SecondaryButton';
import { Modal } from '../components/Modal';
import { DEMO_AUDIT_LOGS } from '../data/mockData';
import type { AuditLogEntry } from '../types';

interface AdminAuditLogPageProps {
  onShowToast: (title: string, message?: string, type?: 'success' | 'info') => void;
}

export const AdminAuditLogPage: React.FC<AdminAuditLogPageProps> = ({ onShowToast }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);

  const filteredLogs = DEMO_AUDIT_LOGS.filter((log) => {
    return (
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entityType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.ipAddress.includes(searchTerm)
    );
  });

  const columns: Column<AuditLogEntry>[] = [
    {
      header: 'Timestamp (UTC)',
      accessor: (row) => <span className="font-mono text-xs">{row.timestamp}</span>,
    },
    {
      header: 'Action & Entity',
      accessor: (row) => (
        <div>
          <span className="font-mono font-bold text-xs text-primary-text block">{row.action}</span>
          <span className="text-[11px] text-secondary-text">
            {row.entityType} ({row.entityId})
          </span>
        </div>
      ),
    },
    {
      header: 'Actor',
      accessor: (row) => (
        <div>
          <span className="font-semibold text-xs text-primary-text block">{row.username}</span>
          <span className="text-[11px] text-secondary-text font-mono">{row.ipAddress}</span>
        </div>
      ),
    },
    {
      header: 'Outcome',
      accessor: (row) => <StatusBadge status={row.status} size="sm" />,
    },
    {
      header: 'Inspect',
      className: 'text-right',
      headerClassName: 'text-right',
      accessor: (row) => (
        <SecondaryButton size="sm" onClick={() => setSelectedEntry(row)} icon={<Eye className="w-3.5 h-3.5" />}>
          Details
        </SecondaryButton>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Append-Only Audit Trail"
        description="Immutable system event stream logged via database-level triggers."
        badge={
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-pastel-mint border border-soft-sage text-deep-sage flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" />
            <span>DB Trigger Protected</span>
          </span>
        }
        actions={
          <SecondaryButton
            size="sm"
            icon={<Download className="w-4 h-4" />}
            onClick={() => onShowToast('Export Complete', 'Audit trail exported with HMAC-SHA256 signature', 'success')}
          >
            Export Signed Log
          </SecondaryButton>
        }
      />

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-app-border shadow-subtle flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-secondary-text absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search action, actor, or IP..."
            className="w-full bg-light-bg rounded-xl border border-app-border pl-9 pr-4 py-2 text-xs text-primary-text focus:outline-none focus:border-sage-green"
          />
        </div>

        <div className="text-xs text-secondary-text">
          Showing <strong className="text-primary-text">{filteredLogs.length}</strong> verified events
        </div>
      </div>

      {/* Audit Log DataTable */}
      <DataTable
        columns={columns}
        data={filteredLogs}
        keyExtractor={(item) => item.id}
      />

      {/* Audit Log Inspection Modal */}
      {selectedEntry && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedEntry(null)}
          title={`Audit Payload: ${selectedEntry.action}`}
          subtitle={`Event ID: ${selectedEntry.id}`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-light-bg border border-app-border space-y-2">
              <div className="flex justify-between">
                <span className="text-secondary-text">Timestamp:</span>
                <span className="font-mono text-primary-text">{selectedEntry.timestamp}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary-text">Actor Username:</span>
                <span className="font-semibold text-primary-text">{selectedEntry.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary-text">Origin IP Address:</span>
                <span className="font-mono text-primary-text">{selectedEntry.ipAddress}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary-text">Target Resource:</span>
                <span className="font-mono text-primary-text">{selectedEntry.entityType} ({selectedEntry.entityId})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary-text">Integrity Status:</span>
                <StatusBadge status={selectedEntry.status} size="sm" />
              </div>
            </div>

            <div>
              <span className="font-semibold text-primary-text block mb-1">Details &amp; Audit Context:</span>
              <p className="p-3 bg-white rounded-xl border border-app-border font-mono text-[11px] text-secondary-text leading-relaxed">
                {selectedEntry.details}
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <SecondaryButton size="sm" onClick={() => setSelectedEntry(null)}>
                Close
              </SecondaryButton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

