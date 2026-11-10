import React, { useState } from 'react';
import { Menu, Search, Bell, Shield, ChevronDown, CheckCircle, Info } from 'lucide-react';
import type { UserRole, Screen } from '../types';

interface TopbarProps {
  title: string;
  subtitle?: string;
  onOpenMobileMenu: () => void;
  userRole: UserRole;
  onNavigate: (screen: Screen) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  title,
  subtitle,
  onOpenMobileMenu,
  userRole,
  onNavigate,
  searchQuery = '',
  onSearchChange,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const notifications = [
    {
      id: '1',
      title: 'Monthly Statement Generated',
      time: '10m ago',
      read: false,
      icon: <CheckCircle className="w-4 h-4 text-app-success" />,
    },
    {
      id: '2',
      title: 'Security Notice: New session active',
      time: '2h ago',
      read: true,
      icon: <Info className="w-4 h-4 text-app-info" />,
    },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-app-border px-4 lg:px-8 py-3.5">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile trigger & Page title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileMenu}
            className="p-2 rounded-xl border border-app-border text-secondary-text hover:bg-pastel-mint/30 hover:text-deep-sage lg:hidden focus:outline-none"
            aria-label="Open navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg lg:text-xl font-bold tracking-tight text-primary-text">{title}</h1>
            {subtitle && <p className="text-xs text-secondary-text hidden sm:block">{subtitle}</p>}
          </div>
        </div>

        {/* Center: Search Interface */}
        <div className="flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Search className="w-4 h-4 text-secondary-text absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
              placeholder="Search accounts, transactions, or reference IDs..."
              className="w-full bg-light-bg rounded-xl border border-app-border pl-9 pr-4 py-2 text-xs text-primary-text placeholder:text-secondary-text/70 focus:outline-none focus:border-sage-green focus:ring-2 focus:ring-sage-green/20 transition-all"
            />
          </div>
        </div>

        {/* Right: Notifications & User profile menu */}
        <div className="flex items-center gap-3">
          {/* Security Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-pastel-mint/40 border border-soft-sage/60 rounded-full text-xs font-semibold text-deep-sage">
            <Shield className="w-3.5 h-3.5" />
            <span>256-Bit TLS</span>
          </div>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowProfileMenu(false);
              }}
              className="relative p-2 rounded-xl text-secondary-text hover:text-deep-sage hover:bg-pastel-mint/30 border border-transparent hover:border-app-border transition-colors focus:outline-none"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-app-error ring-2 ring-white" />
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-modal border border-app-border py-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-4 py-2 border-b border-app-border flex items-center justify-between">
                  <span className="font-semibold text-xs uppercase tracking-wider text-primary-text">Notifications</span>
                  <span className="text-[11px] font-medium text-deep-sage hover:underline cursor-pointer">Mark all as read</span>
                </div>
                <div className="divide-y divide-app-border/60 max-h-64 overflow-y-auto">
                  {notifications.map((n) => (
                    <div key={n.id} className="p-3 hover:bg-light-bg/80 flex items-start gap-3 transition-colors">
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
              className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-pastel-mint/20 border border-transparent hover:border-app-border transition-colors focus:outline-none"
            >
              <div className="w-8 h-8 rounded-full bg-deep-sage text-white font-bold text-xs flex items-center justify-center">
                {userRole === 'ADMIN' ? 'AD' : 'EV'}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-secondary-text" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-modal border border-app-border py-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-4 py-2.5 border-b border-app-border">
                  <p className="text-xs font-bold text-primary-text">
                    {userRole === 'ADMIN' ? 'Compliance Admin' : 'Eleanor Vance'}
                  </p>
                  <p className="text-[11px] text-secondary-text truncate">
                    {userRole === 'ADMIN' ? 'admin@balancevault.com' : 'eleanor.vance@example.com'}
                  </p>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      onNavigate('profile');
                      setShowProfileMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-primary-text hover:bg-pastel-mint/30 hover:text-deep-sage transition-colors"
                  >
                    View Customer Profile
                  </button>
                  <button
                    onClick={() => {
                      onNavigate('settings');
                      setShowProfileMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-primary-text hover:bg-pastel-mint/30 hover:text-deep-sage transition-colors"
                  >
                    Account Settings
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

