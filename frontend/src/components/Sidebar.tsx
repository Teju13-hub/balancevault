import React from 'react';
import {
  ShieldCheck,
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  Receipt,
  Activity,
  User,
  Settings,
  LogOut,
  Users,
  FileCheck2,
  FileText,
  Shield,
  X,
  ExternalLink,
} from 'lucide-react';
import { Screen, UserRole } from '../types';

interface SidebarProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
  userRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentScreen,
  onNavigate,
  userRole,
  onRoleChange,
  mobileOpen,
  onCloseMobile,
  onLogout,
}) => {
  const customerNavItems = [
    { id: 'dashboard' as Screen, label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'accounts' as Screen, label: 'My Accounts', icon: <Wallet className="w-5 h-5" /> },
    { id: 'transfer' as Screen, label: 'Money Transfer', icon: <ArrowLeftRight className="w-5 h-5" /> },
    { id: 'transactions' as Screen, label: 'Transactions', icon: <Receipt className="w-5 h-5" /> },
    { id: 'accounts' as Screen, label: 'Account Activity', icon: <Activity className="w-5 h-5" /> },
    { id: 'profile' as Screen, label: 'Profile', icon: <User className="w-5 h-5" /> },
    { id: 'settings' as Screen, label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  const adminNavItems = [
    { id: 'admin-dashboard' as Screen, label: 'Admin Dashboard', icon: <Shield className="w-5 h-5" /> },
    { id: 'admin-users' as Screen, label: 'User Management', icon: <Users className="w-5 h-5" /> },
    { id: 'admin-onboarding' as Screen, label: 'Onboarding (KYC)', icon: <FileCheck2 className="w-5 h-5" /> },
    { id: 'admin-audit' as Screen, label: 'Audit Trail', icon: <FileText className="w-5 h-5" /> },
  ];

  const isAdminView = userRole === 'ADMIN' || userRole === 'AUDITOR' || currentScreen.startsWith('admin-');

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
            onClick={() => onNavigate('dashboard')}
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

        {/* View Switcher Pill */}
        <div className="px-5 pt-4 pb-2">
          <div className="p-1 bg-pastel-lavender/60 rounded-xl border border-secondary-lilac flex text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                onRoleChange('ACCOUNT_HOLDER');
                onNavigate('dashboard');
              }}
              className={`flex-1 py-1.5 rounded-lg transition-all text-center ${
                !isAdminView
                  ? 'bg-deep-purple text-white shadow-sm'
                  : 'text-deep-purple hover:bg-white/60'
              }`}
            >
              Customer
            </button>
            <button
              type="button"
              onClick={() => {
                onRoleChange('ADMIN');
                onNavigate('admin-dashboard');
              }}
              className={`flex-1 py-1.5 rounded-lg transition-all text-center ${
                isAdminView
                  ? 'bg-deep-purple text-white shadow-sm'
                  : 'text-deep-purple hover:bg-white/60'
              }`}
            >
              Admin Mode
            </button>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-6">
          {/* Main Navigation */}
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-secondary-text">
              {isAdminView ? 'Administration' : 'Main Menu'}
            </div>
            <nav className="space-y-1">
              {(isAdminView ? adminNavItems : customerNavItems).map((item) => {
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

          {/* Quick Landing Page link for review */}
          <div className="pt-2 border-t border-app-border/60">
            <button
              onClick={() => {
                onNavigate('landing');
                onCloseMobile();
              }}
              className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium text-secondary-text hover:text-deep-purple hover:bg-pastel-lavender/30 transition-colors"
            >
              <span className="flex items-center gap-2">
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Public Landing Page</span>
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-pastel-lavender font-semibold text-deep-purple">
                Preview
              </span>
            </button>
          </div>
        </div>

        {/* User Card & Logout Footer */}
        <div className="p-4 border-t border-app-border bg-main-bg/50">
          <div className="flex items-center justify-between mb-3 px-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-secondary-lilac/70 border border-accent-purple flex items-center justify-center font-bold text-deep-purple text-sm shrink-0">
                {isAdminView ? 'AD' : 'BV'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-primary-text truncate">
                  {isAdminView ? 'Security Officer' : 'Eleanor Vance'}
                </p>
                <p className="text-[11px] text-secondary-text truncate capitalize">
                  {userRole.toLowerCase().replace('_', ' ')}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-app-error hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-200"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
