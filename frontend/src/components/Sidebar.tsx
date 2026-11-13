import React from 'react';
import {
  ShieldCheck,
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  Receipt,
  User,
  Settings,
  LogOut,
  Users,
  FileText,
  Shield,
  ShieldAlert,
  BarChart3,
  X,
} from 'lucide-react';
import { Screen, UserProfile, UserRole } from '../types';

interface SidebarProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
  userRole: UserRole;
  currentUser: UserProfile | null;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentScreen,
  onNavigate,
  userRole,
  currentUser,
  mobileOpen,
  onCloseMobile,
  onLogout,
}) => {
  const customerNavItems = [
    { id: 'dashboard' as Screen, label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'accounts' as Screen, label: 'My Accounts', icon: <Wallet className="w-5 h-5" /> },
    { id: 'transfer' as Screen, label: 'Money Transfer', icon: <ArrowLeftRight className="w-5 h-5" /> },
    { id: 'transactions' as Screen, label: 'Transactions', icon: <Receipt className="w-5 h-5" /> },
    { id: 'profile' as Screen, label: 'Profile', icon: <User className="w-5 h-5" /> },
    { id: 'settings' as Screen, label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  const adminNavItems = [
    { id: 'admin-dashboard' as Screen, label: 'Overview & Telemetry', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'admin-users' as Screen, label: 'User Directory', icon: <Users className="w-5 h-5" /> },
    { id: 'admin-accounts' as Screen, label: 'Account Management', icon: <Wallet className="w-5 h-5" /> },
    { id: 'admin-transactions' as Screen, label: 'Transaction Monitor', icon: <Receipt className="w-5 h-5" /> },
    { id: 'admin-security' as Screen, label: 'Security Center', icon: <ShieldAlert className="w-5 h-5" /> },
    { id: 'admin-reports' as Screen, label: 'Reports & Analytics', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'admin-audit' as Screen, label: 'Audit Trail', icon: <FileText className="w-5 h-5" /> },
    { id: 'settings' as Screen, label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  const auditorNavItems = [
    { id: 'admin-audit' as Screen, label: 'Audit Trail', icon: <FileText className="w-5 h-5" /> },
    { id: 'transactions' as Screen, label: 'Transactions Ledger', icon: <Receipt className="w-5 h-5" /> },
    { id: 'settings' as Screen, label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  const getNavItems = () => {
    if (userRole === 'ADMIN') return adminNavItems;
    if (userRole === 'AUDITOR') return auditorNavItems;
    return customerNavItems;
  };

  const navItems = getNavItems();
  const displayName = currentUser?.fullName || currentUser?.username || (userRole === 'ADMIN' ? 'Administrator' : 'Customer');
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'BV';

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-primary-text/40 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Content */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-app-border flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="px-6 py-5 border-b border-app-border flex items-center justify-between">
          <div
            onClick={() => onNavigate(userRole === 'ADMIN' ? 'admin-dashboard' : userRole === 'AUDITOR' ? 'admin-audit' : 'dashboard')}
            className="flex items-center gap-3 cursor-pointer select-none group"
          >
            <div className="w-10 h-10 rounded-xl bg-deep-purple flex items-center justify-center text-white shadow-sm group-hover:bg-deep-purple-hover transition-colors">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-primary-text block font-sans">
                BALANCE<span className="text-deep-purple">VAULT</span>
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-secondary-text block">
                Trust in Every Transaction
              </span>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-secondary-text hover:bg-pastel-lavender/40 lg:hidden"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
          <div>
            <div className="px-3 mb-2.5 text-[10px] font-bold uppercase tracking-widest text-secondary-text">
              {userRole === 'ADMIN' ? 'Administration' : userRole === 'AUDITOR' ? 'Audit Command' : 'Main Menu'}
            </div>
            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const isActive = currentScreen === item.id;
                return (
                  <button
                    key={item.label}
                    onClick={() => {
                      onNavigate(item.id);
                      onCloseMobile();
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 select-none ${
                      isActive
                        ? 'bg-deep-purple text-white shadow-sm font-semibold'
                        : 'text-primary-text hover:bg-pastel-lavender hover:text-deep-purple'
                    }`}
                  >
                    <span className={isActive ? 'text-white' : 'text-secondary-text'}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Authenticated User Card & Logout Footer */}
        <div className="p-4 border-t border-app-border bg-main-bg/50">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-secondary-lilac/70 border border-accent-purple flex items-center justify-center font-bold text-deep-purple text-sm shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-primary-text truncate">
                  {displayName}
                </p>
                <p className="text-[11px] text-secondary-text truncate capitalize font-medium">
                  {userRole === 'ACCOUNT_HOLDER' ? 'Customer' : userRole.toLowerCase().replace(/_/g, ' ')}
                </p>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="p-1.5 text-secondary-text hover:text-app-error hover:bg-app-error/10 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
