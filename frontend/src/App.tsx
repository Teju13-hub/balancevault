import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { ToastNotification } from './components/ToastNotification';
import type { Toast } from './components/ToastNotification';
import type { Screen, UserRole } from './types';

// Screens
import { LandingPage } from './screens/LandingPage';
import { LoginPage } from './screens/LoginPage';
import { RegisterPage } from './screens/RegisterPage';
import { CustomerDashboard } from './screens/CustomerDashboard';
import { AccountDetailsPage } from './screens/AccountDetailsPage';
import { MoneyTransferPage } from './screens/MoneyTransferPage';
import { TransactionHistoryPage } from './screens/TransactionHistoryPage';
import { CustomerProfilePage } from './screens/CustomerProfilePage';
import { SettingsPage } from './screens/SettingsPage';
import { AdminDashboard } from './screens/AdminDashboard';
import { AdminUserManagementPage } from './screens/AdminUserManagementPage';
import { AdminOnboardingPage } from './screens/AdminOnboardingPage';
import { AdminAuditLogPage } from './screens/AdminAuditLogPage';

export function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');
  const [userRole, setUserRole] = useState<UserRole>('ACCOUNT_HOLDER');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const showToast = (title: string, message?: string, type: Toast['type'] = 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      dismissToast(id);
    }, 4500);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleRoleChange = (role: UserRole) => {
    setUserRole(role);
    showToast(
      `Switched to ${role.replace(/_/g, ' ')} view`,
      `Permissions and navigation updated to ${role} role`,
      'info'
    );
  };

  const handleLogout = () => {
    showToast('Signed Out', 'You have been safely signed out', 'info');
    setCurrentScreen('login');
  };

  // Fullscreen standalone pages
  if (currentScreen === 'landing') {
    return <LandingPage onNavigate={setCurrentScreen} />;
  }

  if (currentScreen === 'login') {
    return (
      <LoginPage
        onNavigate={setCurrentScreen}
        onLoginSuccess={(role) => {
          setUserRole(role);
          setCurrentScreen(role === 'ADMIN' ? 'admin-dashboard' : 'dashboard');
          showToast('Authentication Successful', `Welcome back as ${role.replace(/_/g, ' ')}`, 'success');
        }}
      />
    );
  }

  if (currentScreen === 'register') {
    return (
      <RegisterPage
        onNavigate={setCurrentScreen}
        onRegisterSuccess={(role) => {
          setUserRole(role);
          setCurrentScreen('dashboard');
          showToast('Account Created', 'Default role ACCOUNT_HOLDER assigned', 'success');
        }}
      />
    );
  }

  // Header metadata mapping
  const screenMeta: Record<Screen, { title: string; subtitle: string }> = {
    landing: { title: 'BalanceVault', subtitle: 'Trust in Every Transaction' },
    login: { title: 'Sign In', subtitle: 'Access your account' },
    register: { title: 'Open Account', subtitle: 'Register verified vault' },
    dashboard: { title: 'Vault Overview', subtitle: 'Primary portfolio status and balances' },
    accounts: { title: 'Accounts & Vaults', subtitle: 'Segregated account records' },
    transfer: { title: 'Money Movement', subtitle: 'Internal vault sweep and wire simulation' },
    transactions: { title: 'Transaction History', subtitle: 'Verified append-only ledger entries' },
    profile: { title: 'Customer Profile', subtitle: 'Identity credentials and security limits' },
    settings: { title: 'System Settings', subtitle: 'Preferences and session parameters' },
    'admin-dashboard': { title: 'Admin Command Center', subtitle: 'System integrity and security metrics' },
    'admin-users': { title: 'User Directory', subtitle: 'Tenant roles and access control' },
    'admin-onboarding': { title: 'KYC Onboarding', subtitle: 'Compliance review pipeline' },
    'admin-audit': { title: 'Audit Trail', subtitle: 'Immutable database event logs' },
  };

  const currentMeta = screenMeta[currentScreen] || { title: 'BalanceVault', subtitle: '' };

  return (
    <div className="min-h-screen bg-main-bg flex">
      {/* Global Sidebar */}
      <Sidebar
        currentScreen={currentScreen}
        onNavigate={setCurrentScreen}
        userRole={userRole}
        onRoleChange={handleRoleChange}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onLogout={handleLogout}
      />

      {/* Main App Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          title={currentMeta.title}
          subtitle={currentMeta.subtitle}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          userRole={userRole}
          onNavigate={setCurrentScreen}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-in fade-in duration-200">
          {currentScreen === 'dashboard' && (
            <CustomerDashboard
              onNavigate={setCurrentScreen}
              onShowToast={showToast}
            />
          )}

          {currentScreen === 'accounts' && (
            <AccountDetailsPage
              onNavigate={setCurrentScreen}
              onShowToast={showToast}
            />
          )}

          {currentScreen === 'transfer' && (
            <MoneyTransferPage
              onNavigate={setCurrentScreen}
              onShowToast={showToast}
            />
          )}

          {currentScreen === 'transactions' && (
            <TransactionHistoryPage onShowToast={showToast} />
          )}

          {currentScreen === 'profile' && (
            <CustomerProfilePage onShowToast={showToast} />
          )}

          {currentScreen === 'settings' && (
            <SettingsPage onShowToast={showToast} />
          )}

          {currentScreen === 'admin-dashboard' && (
            <AdminDashboard
              onNavigate={setCurrentScreen}
              onShowToast={showToast}
            />
          )}

          {currentScreen === 'admin-users' && (
            <AdminUserManagementPage onShowToast={showToast} />
          )}

          {currentScreen === 'admin-onboarding' && (
            <AdminOnboardingPage onShowToast={showToast} />
          )}

          {currentScreen === 'admin-audit' && (
            <AdminAuditLogPage onShowToast={showToast} />
          )}
        </main>
      </div>

      {/* Toast Notifications */}
      <ToastNotification toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default App;
