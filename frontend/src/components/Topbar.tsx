import React, { useState } from 'react';
import {
  Menu,
  Bell,
  Search,
  Shield,
  ChevronDown,
  ArrowUpRight,
  ArrowDownLeft,
  Lock,
  LogOut,
} from 'lucide-react';
import { Screen, UserProfile, UserRole } from '../types';

interface TopbarProps {
  title: string;
  subtitle?: string;
  onOpenMobileMenu: () => void;
  userRole: UserRole;
  currentUser: UserProfile | null;
  onNavigate: (screen: Screen) => void;
  onLogout: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  title,
  subtitle,
  onOpenMobileMenu,
  userRole,
  currentUser,
  onNavigate,
  onLogout,
  searchQuery,
  onSearchChange,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const displayName = currentUser?.fullName || currentUser?.username || (userRole === 'ADMIN' ? 'Compliance Admin' : 'Customer');
  const displayEmail = currentUser?.email || `${currentUser?.username || 'user'}@balancevault.com`;
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'BV';

  const notifications = [
    {
      id: '1',
      title: 'Monthly statement ready for review',
      time: '10m ago',
      icon: <ArrowDownLeft className="w-4 h-4 text-app-success" />,
    },
    {
      id: '2',
      title: 'Automated ledger checksum verified: 0 mismatches',
      time: '1h ago',
      icon: <Lock className="w-4 h-4 text-deep-purple" />,
    },
    {
      id: '3',
      title: 'Institutional wire cleared successfully',
      time: '3h ago',
      icon: <ArrowUpRight className="w-4 h-4 text-secondary-text" />,
    },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-app-border">
      <div className="px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
        {/* Left Side: Mobile Menu Button & Page Header */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onOpenMobileMenu}
            className="p-2 -ml-2 rounded-xl text-primary-text hover:bg-pastel-lavender/50 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <h1 className="text-lg lg:text-xl font-bold tracking-tight text-primary-text truncate font-sans">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-secondary-text truncate hidden sm:block">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Center / Search Area */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-4">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-secondary-text absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search accounts, transactions, or reference IDs..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-main-bg border border-app-border text-primary-text placeholder:text-secondary-text/70 focus:outline-none focus:border-secondary-lilac focus:ring-2 focus:ring-accent-purple/20 transition-all"
            />
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5">
          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowProfileMenu(false);
              }}
              className="relative p-2 rounded-xl text-secondary-text hover:text-deep-purple hover:bg-pastel-lavender border border-transparent hover:border-app-border transition-colors focus:outline-none"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-app-error ring-2 ring-white" />
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-modal border border-app-border py-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-4 py-2 border-b border-app-border flex items-center justify-between">
                  <span className="font-semibold text-xs uppercase tracking-wider text-primary-text">Notifications</span>
                  <span className="text-[11px] font-medium text-deep-purple hover:underline cursor-pointer">Mark all as read</span>
                </div>
                <div className="divide-y divide-app-border/60 max-h-64 overflow-y-auto">
                  {notifications.map((n) => (
                    <div key={n.id} className="p-3 hover:bg-main-bg/80 flex items-start gap-3 transition-colors">
                      <div className="mt-0.5 shrink-0">{n.icon}</div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-primary-text">{n.title}</p>
                        <p className="text-[10px] text-secondary-text mt-0.5">{n.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Profile Menu Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowProfileMenu(!showProfileMenu);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-pastel-lavender/30 border border-transparent hover:border-app-border transition-colors focus:outline-none"
            >
              <div className="w-8 h-8 rounded-full bg-deep-purple text-white font-bold text-xs flex items-center justify-center">
                {initials}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-secondary-text" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-modal border border-app-border py-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-4 py-2.5 border-b border-app-border">
                  <p className="text-xs font-bold text-primary-text truncate">
                    {displayName}
                  </p>
                  <p className="text-[11px] text-secondary-text truncate">
                    {displayEmail}
                  </p>
                </div>
                <div className="py-1">
                  {userRole === 'ACCOUNT_HOLDER' && (
                    <button
                      onClick={() => {
                        onNavigate('profile');
                        setShowProfileMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-primary-text hover:bg-pastel-lavender/40 hover:text-deep-purple transition-colors"
                    >
                      View Customer Profile
                    </button>
                  )}
                  <button
                    onClick={() => {
                      onNavigate('settings');
                      setShowProfileMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-primary-text hover:bg-pastel-lavender/40 hover:text-deep-purple transition-colors"
                  >
                    Account Settings
                  </button>
                  <div className="my-1 border-t border-app-border" />
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onLogout();
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-app-error hover:bg-app-error/10 flex items-center gap-2 transition-colors font-semibold"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
