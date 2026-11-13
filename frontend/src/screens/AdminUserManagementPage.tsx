import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Shield,
  Ban,
  CheckCircle,
  RefreshCw,
  Lock,
  Unlock,
  Eye,
  Users,
  AlertTriangle,
  Wallet,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { DataTable, Column } from '../components/DataTable';
import { SecondaryButton } from '../components/SecondaryButton';
import { PrimaryButton } from '../components/PrimaryButton';
import { Modal } from '../components/Modal';
import { api, AdminUserData } from '../services/api';
import { formatCurrency, formatINR } from '../utils/currency';

interface AdminUserManagementPageProps {
  onShowToast: (title: string, message?: string, type?: 'success' | 'info' | 'warning') => void;
}

export const AdminUserManagementPage: React.FC<AdminUserManagementPageProps> = ({ onShowToast }) => {
  const [users, setUsers] = useState<AdminUserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Profile Details Modal State
  const [selectedUser, setSelectedUser] = useState<AdminUserData | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  // Confirmation Action Modal State
  const [actionUser, setActionUser] = useState<AdminUserData | null>(null);
  const [actionType, setActionType] = useState<'lock' | 'unlock' | 'suspend' | 'reactivate' | null>(null);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await api.getAdminUsers();
      setUsers(data);
    } catch (err: any) {
      onShowToast('Error', err.message || 'Unable to retrieve user registry', 'warning');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Filtered dataset
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const s = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !s ||
        u.username.toLowerCase().includes(s) ||
        u.email.toLowerCase().includes(s) ||
        (u.fullName && u.fullName.toLowerCase().includes(s)) ||
        (u.accounts && u.accounts.some((acc) => acc.accountNumber.toLowerCase().includes(s)));

      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;

      let matchesStatus = true;
      if (statusFilter === 'LOCKED') {
        matchesStatus = Boolean(u.isLocked);
      } else if (statusFilter === 'ACTIVE') {
        matchesStatus = u.status === 'ACTIVE' && !u.isLocked;
      } else if (statusFilter === 'SUSPENDED') {
        matchesStatus = u.status === 'SUSPENDED';
      }

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredUsers.slice(startIndex, startIndex + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter, statusFilter, pageSize]);

  // Aggregate Metrics for Header
  const totalCustomersCount = users.filter((u) => u.role === 'ACCOUNT_HOLDER').length;
  const activeCount = users.filter((u) => u.status === 'ACTIVE' && !u.isLocked).length;
  const lockedCount = users.filter((u) => u.isLocked).length;
  const suspendedCount = users.filter((u) => u.status === 'SUSPENDED').length;

  const handleOpenAction = (user: AdminUserData, type: 'lock' | 'unlock' | 'suspend' | 'reactivate') => {
    setActionUser(user);
    setActionType(type);
    setActionModalOpen(true);
  };

  const handleExecuteAction = async () => {
    if (!actionUser || !actionType) return;
    setActionLoading(true);

    try {
      if (actionType === 'lock') {
        const updated = await api.lockCustomer(actionUser.id);
        onShowToast('Customer Locked', `User ${updated.username} has been locked and suspended.`, 'warning');
      } else if (actionType === 'unlock') {
        const updated = await api.unlockCustomer(actionUser.id);
        onShowToast('Customer Unlocked', `User ${updated.username} is unlocked and failed login attempts reset.`, 'success');
      } else if (actionType === 'suspend') {
        const updated = await api.updateUserStatus(actionUser.id, 'SUSPENDED');
        onShowToast('Account Suspended', `User ${updated.username} status set to SUSPENDED.`, 'warning');
      } else if (actionType === 'reactivate') {
        const updated = await api.updateUserStatus(actionUser.id, 'ACTIVE');
        onShowToast('Account Reactivated', `User ${updated.username} status set to ACTIVE.`, 'success');
      }

      setActionModalOpen(false);
      setActionUser(null);
      setActionType(null);
      await loadUsers();

      // If profile modal is open for this user, refresh it
      if (selectedUser && selectedUser.id === actionUser.id) {
        const refreshed = await api.getAdminCustomerDetails(actionUser.id);
        setSelectedUser(refreshed);
      }
    } catch (err: any) {
      onShowToast('Action Failed', err.message || 'Operation could not be completed', 'warning');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenProfile = async (user: AdminUserData) => {
    setSelectedUser(user);
    setProfileModalOpen(true);
    setProfileLoading(true);
    try {
      const details = await api.getAdminCustomerDetails(user.id);
      setSelectedUser(details);
    } catch (err: any) {
      // Fallback to current user record if detailed fetch fails
      console.warn('Detailed profile fetch fallback', err);
    } finally {
      setProfileLoading(false);
    }
  };

  const columns: Column<AdminUserData>[] = [
    {
      header: 'Customer / User',
      accessor: (row) => (
        <div>
          <span className="font-bold text-xs text-primary-text block">{row.fullName || row.username}</span>
          <span className="text-[11px] text-secondary-text font-mono">@{row.username}</span>
        </div>
      ),
    },
    {
      header: 'Email Address',
      accessor: (row) => <span className="text-xs text-primary-text font-mono">{row.email}</span>,
    },
    {
      header: 'Assigned Role',
      accessor: (row) => {
        let label = 'Customer';
        let badgeColor = 'bg-pastel-lavender text-deep-purple border-secondary-lilac';
        if (row.role === 'ADMIN') {
          label = 'Administrator';
          badgeColor = 'bg-purple-900 text-white border-purple-950';
        } else if (row.role === 'AUDITOR') {
          label = 'Auditor';
          badgeColor = 'bg-blue-100 text-blue-800 border-blue-200';
        }
        return (
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badgeColor}`}>
            {label}
          </span>
        );
      },
    },
    {
      header: 'Account Status',
      accessor: (row) => (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
              row.status === 'ACTIVE'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-rose-100 text-rose-800'
            }`}
          >
            {row.status}
          </span>
          {row.isLocked && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" />
              <span>Locked</span>
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Security Telemetry',
      accessor: (row) => {
        const attempts = row.failedLoginAttempts || 0;
        return (
          <div>
            <span
              className={`text-xs font-semibold ${
                attempts >= 5 ? 'text-rose-600 font-bold' : attempts > 0 ? 'text-amber-600' : 'text-emerald-600'
              }`}
            >
              {attempts} failed {attempts === 1 ? 'attempt' : 'attempts'}
            </span>
            <span className="text-[10px] text-secondary-text block">
              {row.isLocked ? 'Account Locked' : 'Normal Standing'}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Vaults & Balance',
      accessor: (row) => {
        const count = row.accountCount ?? (row.accounts ? row.accounts.length : 0);
        const bal = row.totalBalance ?? 0;
        return (
          <div>
            <span className="font-semibold text-xs text-primary-text block">{formatINR(bal)}</span>
            <span className="text-[11px] text-secondary-text">{count} {count === 1 ? 'Account' : 'Accounts'}</span>
          </div>
        );
      },
    },
    {
      header: 'Joined Date',
      accessor: (row) => (
        <span className="text-xs text-secondary-text font-mono">
          {new Date(row.createdAt).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}
        </span>
      ),
    },
    {
      header: 'Actions',
      className: 'text-right',
      headerClassName: 'text-right',
      accessor: (row) => {
        const isAdmin = row.role === 'ADMIN';

        return (
          <div className="flex items-center justify-end gap-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleOpenProfile(row);
              }}
              className="p-1.5 rounded-lg text-secondary-text hover:text-deep-purple hover:bg-pastel-lavender/40 transition-colors cursor-pointer"
              title="Inspect Customer Profile & Vaults"
            >
              <Eye className="w-4 h-4" />
            </button>

            {isAdmin ? (
              <span className="text-[10px] text-secondary-text/60 italic px-2">Protected</span>
            ) : row.isLocked ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenAction(row, 'unlock');
                }}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors flex items-center gap-1 cursor-pointer"
                title="Unlock Locked Customer"
              >
                <Unlock className="w-3 h-3" />
                <span>Unlock</span>
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenAction(row, 'lock');
                }}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition-colors flex items-center gap-1 cursor-pointer"
                title="Lock Customer Account"
              >
                <Lock className="w-3 h-3" />
                <span>Lock</span>
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Directory &amp; Access Controls"
        description="Search customer profiles, inspect associated bank accounts, and enforce administrative security locks."
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border border-app-border shadow-subtle">
          <span className="text-[11px] font-bold uppercase tracking-wider text-secondary-text block">Total Directory</span>
          <p className="text-xl font-extrabold text-primary-text mt-1">{users.length}</p>
          <span className="text-[11px] text-secondary-text">{totalCustomersCount} customer tenants</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-app-border shadow-subtle">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block">Active Standing</span>
          <p className="text-xl font-extrabold text-emerald-700 mt-1">{activeCount}</p>
          <span className="text-[11px] text-secondary-text">Full transaction capability</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-app-border shadow-subtle">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 block">Locked Accounts</span>
          <p className="text-xl font-extrabold text-amber-700 mt-1">{lockedCount}</p>
          <span className="text-[11px] text-secondary-text">Security lockouts (5 failed logins)</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-app-border shadow-subtle">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 block">Suspended</span>
          <p className="text-xl font-extrabold text-rose-700 mt-1">{suspendedCount}</p>
          <span className="text-[11px] text-secondary-text">Administratively suspended</span>
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="p-4 bg-white rounded-2xl border border-app-border shadow-subtle flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-secondary-text absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search name, email, username, or account..."
            className="w-full bg-light-bg rounded-xl border border-app-border pl-9 pr-4 py-2 text-xs text-primary-text placeholder:text-secondary-text focus:outline-none focus:border-deep-purple focus:ring-2 focus:ring-pastel-lavender"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-light-bg rounded-xl border border-app-border px-3 py-2 text-xs font-medium text-primary-text focus:outline-none focus:border-deep-purple"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="LOCKED">Locked Accounts</option>
            <option value="SUSPENDED">Suspended Only</option>
          </select>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-light-bg rounded-xl border border-app-border px-3 py-2 text-xs font-medium text-primary-text focus:outline-none focus:border-deep-purple"
          >
            <option value="ALL">All Roles</option>
            <option value="ACCOUNT_HOLDER">Customer Accounts</option>
            <option value="ADMIN">Administrators</option>
            <option value="AUDITOR">Auditors</option>
          </select>

          {/* Page Size */}
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="bg-light-bg rounded-xl border border-app-border px-3 py-2 text-xs font-medium text-primary-text focus:outline-none focus:border-deep-purple"
          >
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
          </select>

          <button
            onClick={() => {
              setSearchTerm('');
              setRoleFilter('ALL');
              setStatusFilter('ALL');
            }}
            className="text-xs font-semibold text-deep-purple hover:underline px-2 py-1 cursor-pointer"
          >
            Reset
          </button>

          <button
            onClick={loadUsers}
            className="p-2 rounded-xl text-secondary-text hover:text-deep-purple hover:bg-pastel-lavender/40 transition-colors cursor-pointer"
            title="Refresh User List"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Users DataTable */}
      <DataTable
        columns={columns}
        data={paginatedUsers}
        keyExtractor={(item) => String(item.id)}
        emptyMessage="No customer accounts match your search or filter criteria."
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        onRowClick={(item) => handleOpenProfile(item)}
      />

      {/* Customer Profile & Vaults Modal */}
      {profileModalOpen && selectedUser && (
        <Modal
          isOpen={true}
          onClose={() => {
            setProfileModalOpen(false);
            setSelectedUser(null);
          }}
          title={`Customer Profile: ${selectedUser.fullName || selectedUser.username}`}
          subtitle={`User ID #${selectedUser.id} • Registered ${new Date(selectedUser.createdAt).toLocaleDateString()}`}
        >
          <div className="space-y-4 pt-2 text-xs">
            {profileLoading ? (
              <div className="py-8 text-center text-secondary-text flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-deep-purple" />
                <span>Loading complete vault details...</span>
              </div>
            ) : (
              <>
                {/* Identity Summary Card */}
                <div className="p-4 rounded-xl bg-light-bg border border-app-border grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-secondary-text block">Username</span>
                    <span className="font-mono font-semibold text-primary-text block mt-0.5">@{selectedUser.username}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-secondary-text block">Email</span>
                    <span className="font-mono text-primary-text block mt-0.5 truncate" title={selectedUser.email}>{selectedUser.email}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-secondary-text block">Role</span>
                    <span className="font-semibold text-deep-purple block mt-0.5">{selectedUser.role}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-secondary-text block">Status</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        selectedUser.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {selectedUser.status}
                      </span>
                      {selectedUser.isLocked && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          Locked
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Security Telemetry Details */}
                <div className="p-3.5 rounded-xl bg-pastel-lavender/30 border border-secondary-lilac flex items-center justify-between">
                  <div>
                    <span className="font-bold text-deep-purple block">Security &amp; Authentication Posture</span>
                    <span className="text-[11px] text-secondary-text">
                      Failed Login Counter: <strong>{selectedUser.failedLoginAttempts || 0} / 5 attempts</strong>.
                      {selectedUser.isLocked ? ' Account currently locked under brute-force mitigation.' : ' Account in good standing.'}
                    </span>
                  </div>
                  {selectedUser.role !== 'ADMIN' && (
                    selectedUser.isLocked ? (
                      <button
                        onClick={() => handleOpenAction(selectedUser, 'unlock')}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Unlock Account</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenAction(selectedUser, 'lock')}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Lock Account</span>
                      </button>
                    )
                  )}
                </div>

                {/* Associated Bank Accounts Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs uppercase tracking-wider text-secondary-text flex items-center gap-1.5">
                      <Wallet className="w-4 h-4 text-deep-purple" />
                      <span>Associated Bank Vaults ({selectedUser.accounts ? selectedUser.accounts.length : 0})</span>
                    </span>
                    <span className="text-xs font-bold text-deep-purple">
                      Total Balance: {formatINR(selectedUser.totalBalance ?? 0)}
                    </span>
                  </div>

                  {selectedUser.accounts && selectedUser.accounts.length > 0 ? (
                    <div className="border border-app-border rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-light-bg border-b border-app-border text-[11px] font-semibold text-secondary-text uppercase">
                          <tr>
                            <th className="px-3 py-2">Account Number</th>
                            <th className="px-3 py-2">Currency</th>
                            <th className="px-3 py-2">Balance</th>
                            <th className="px-3 py-2">Status</th>
                            <th className="px-3 py-2">Created</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-app-border/70">
                          {selectedUser.accounts.map((acc) => (
                            <tr key={acc.id} className="hover:bg-pastel-lavender/10">
                              <td className="px-3 py-2.5 font-mono font-semibold text-primary-text">{acc.accountNumber}</td>
                              <td className="px-3 py-2.5 font-bold text-deep-purple">{acc.currency}</td>
                              <td className="px-3 py-2.5 font-mono font-bold text-primary-text">
                                {formatCurrency(acc.balance, acc.currency)}
                              </td>
                              <td className="px-3 py-2.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  acc.status === 'FROZEN' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                                }`}>
                                  {acc.status || 'ACTIVE'}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-secondary-text font-mono">
                                {new Date(acc.createdAt).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-light-bg text-center text-secondary-text border border-app-border">
                      No associated bank accounts provisioned for this user.
                    </div>
                  )}
                </div>

                {/* Additional Lifecycle Actions */}
                {selectedUser.role !== 'ADMIN' && (
                  <div className="pt-3 border-t border-app-border flex items-center justify-between">
                    <span className="text-secondary-text text-[11px]">Lifecycle Administrative Action:</span>
                    <div className="flex items-center gap-2">
                      {selectedUser.status === 'ACTIVE' ? (
                        <button
                          onClick={() => handleOpenAction(selectedUser, 'suspend')}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>Suspend Customer Access</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenAction(selectedUser, 'reactivate')}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Reactivate Customer</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="pt-2 flex justify-end">
              <SecondaryButton onClick={() => setProfileModalOpen(false)}>
                Close Profile
              </SecondaryButton>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmation Action Modal */}
      {actionModalOpen && actionUser && (
        <Modal
          isOpen={true}
          onClose={() => {
            setActionModalOpen(false);
            setActionUser(null);
            setActionType(null);
          }}
          title={
            actionType === 'lock'
              ? 'Lock Customer Account'
              : actionType === 'unlock'
              ? 'Unlock Customer Account'
              : actionType === 'suspend'
              ? 'Suspend Customer Access'
              : 'Reactivate Customer Access'
          }
          subtitle={`Target: ${actionUser.fullName || actionUser.username} (@${actionUser.username})`}
        >
          <div className="space-y-4 pt-2 text-xs">
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">
                  {actionType === 'lock' && 'Locking this customer will terminate active sessions and block login.'}
                  {actionType === 'unlock' && 'Unlocking this customer will clear failed login counters and restore full login capabilities.'}
                  {actionType === 'suspend' && 'Suspending customer access blocks all authentication and scheduled vault transfers.'}
                  {actionType === 'reactivate' && 'Reactivating will restore account status to ACTIVE.'}
                </p>
                <p className="text-[11px] text-amber-800 mt-1">
                  This action is recorded in the immutable PostgreSQL audit trail with your administrator identity and timestamp.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <SecondaryButton
                type="button"
                onClick={() => {
                  setActionModalOpen(false);
                  setActionUser(null);
                  setActionType(null);
                }}
              >
                Cancel
              </SecondaryButton>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleExecuteAction}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all cursor-pointer ${
                  actionType === 'lock' || actionType === 'suspend'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-md'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-md'
                }`}
              >
                {actionLoading
                  ? 'Executing...'
                  : actionType === 'lock'
                  ? 'Confirm Lock'
                  : actionType === 'unlock'
                  ? 'Confirm Unlock'
                  : actionType === 'suspend'
                  ? 'Confirm Suspension'
                  : 'Confirm Reactivation'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
