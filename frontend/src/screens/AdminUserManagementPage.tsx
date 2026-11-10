import React, { useState } from 'react';
import { Search, Eye, Ban, CheckCircle } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { DataTable } from '../components/DataTable';
import type { Column } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { SecondaryButton } from '../components/SecondaryButton';
import { Modal } from '../components/Modal';
import type { UserRole } from '../types';

interface ManagedUser {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  status: 'ACTIVE' | 'SUSPENDED';
  accountsCount: number;
  totalBalance: number;
  createdAt: string;
}

const DEMO_USERS: ManagedUser[] = [
  {
    id: 'usr_01',
    username: 'eleanor.vance',
    email: 'eleanor.vance@example.com',
    role: 'ACCOUNT_HOLDER',
    status: 'ACTIVE',
    accountsCount: 3,
    totalBalance: 712171.25,
    createdAt: '2025-11-12',
  },
  {
    id: 'usr_02',
    username: 'admin',
    email: 'admin@balancevault.local',
    role: 'ADMIN',
    status: 'ACTIVE',
    accountsCount: 0,
    totalBalance: 0,
    createdAt: '2025-10-01 (Seed)',
  },
  {
    id: 'usr_03',
    username: 'auditor',
    email: 'auditor@balancevault.local',
    role: 'AUDITOR',
    status: 'ACTIVE',
    accountsCount: 0,
    totalBalance: 0,
    createdAt: '2025-10-01 (Seed)',
  },
  {
    id: 'usr_04',
    username: 'marcus.sterling',
    email: 'm.sterling@sterling-holding.co',
    role: 'ACCOUNT_HOLDER',
    status: 'ACTIVE',
    accountsCount: 1,
    totalBalance: 245000.00,
    createdAt: '2026-01-15',
  },
  {
    id: 'usr_05',
    username: 'suspect.bot',
    email: 'probe@suspicious-traffic.net',
    role: 'ACCOUNT_HOLDER',
    status: 'SUSPENDED',
    accountsCount: 0,
    totalBalance: 0,
    createdAt: '2026-03-22',
  },
];

interface AdminUserManagementPageProps {
  onShowToast: (title: string, message?: string, type?: 'success' | 'info') => void;
}

export const AdminUserManagementPage: React.FC<AdminUserManagementPageProps> = ({ onShowToast }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [users, setUsers] = useState<ManagedUser[]>(DEMO_USERS);

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const toggleUserStatus = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, status: u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' }
          : u
      )
    );
    onShowToast('User Status Updated', 'Account state modified in audit log', 'info');
    if (selectedUser && selectedUser.id === userId) {
      setSelectedUser(null);
    }
  };

  const columns: Column<ManagedUser>[] = [
    {
      header: 'User Identifier',
      accessor: (row) => (
        <div>
          <span className="font-bold text-sm text-primary-text block">{row.username}</span>
          <span className="text-xs text-secondary-text">{row.email}</span>
        </div>
      ),
    },
    {
      header: 'Assigned Role',
      accessor: (row) => (
        <span
          className={`px-2.5 py-1 rounded-full text-xs font-bold ${row.role === 'ADMIN'
            ? 'bg-deep-sage text-white'
            : row.role === 'AUDITOR'
              ? 'bg-amber-100 text-amber-800'
              : 'bg-pastel-mint text-deep-sage'
            }`}
        >
          {row.role}
        </span>
      ),
    },
    {
      header: 'Vault Accounts',
      accessor: (row) => (
        <span className="text-xs font-medium text-secondary-text">
          {row.accountsCount} active account(s)
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (row) => <StatusBadge status={row.status} size="sm" />,
    },
    {
      header: 'Actions',
      className: 'text-right',
      headerClassName: 'text-right',
      accessor: (row) => (
        <div className="flex items-center justify-end gap-2">
          <SecondaryButton
            size="sm"
            onClick={() => setSelectedUser(row)}
            icon={<Eye className="w-3.5 h-3.5" />}
          >
            Inspect
          </SecondaryButton>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="User &amp; Credential Directory"
        description="Inspect registered tenants, manage account privileges, and audit role scopes."
      />

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-app-border shadow-subtle flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-secondary-text absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by username or email..."
            className="w-full bg-light-bg rounded-xl border border-app-border pl-9 pr-4 py-2 text-xs text-primary-text focus:outline-none focus:border-sage-green"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-light-bg rounded-xl border border-app-border px-3 py-2 text-xs font-medium text-primary-text focus:outline-none focus:border-sage-green"
          >
            <option value="ALL">All Roles</option>
            <option value="ACCOUNT_HOLDER">ACCOUNT_HOLDER</option>
            <option value="ADMIN">ADMIN</option>
            <option value="AUDITOR">AUDITOR</option>
          </select>
        </div>
      </div>

      {/* Users DataTable */}
      <DataTable
        columns={columns}
        data={filteredUsers}
        keyExtractor={(u) => u.id}
      />

      {/* Inspect User Modal */}
      {selectedUser && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedUser(null)}
          title={`User Dossier: ${selectedUser.username}`}
          subtitle={`Internal UUID: ${selectedUser.id}`}
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-light-bg border border-app-border space-y-2">
              <div className="flex justify-between">
                <span className="text-secondary-text">Role Authorization:</span>
                <span className="font-bold font-mono text-deep-sage">{selectedUser.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary-text">Registered Email:</span>
                <span className="font-semibold text-primary-text">{selectedUser.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-secondary-text">Account State:</span>
                <StatusBadge status={selectedUser.status} size="sm" />
              </div>
              <div className="flex justify-between">
                <span className="text-secondary-text">Creation Epoch:</span>
                <span className="text-primary-text">{selectedUser.createdAt}</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <SecondaryButton
                size="sm"
                onClick={() => toggleUserStatus(selectedUser.id)}
                icon={selectedUser.status === 'ACTIVE' ? <Ban className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
              >
                {selectedUser.status === 'ACTIVE' ? 'Suspend Access' : 'Activate User'}
              </SecondaryButton>
              <SecondaryButton size="sm" onClick={() => setSelectedUser(null)}>
                Close
              </SecondaryButton>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

