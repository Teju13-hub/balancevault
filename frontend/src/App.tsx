import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { ToastNotification } from './components/ToastNotification';
import type { Toast } from './components/ToastNotification';
import type { Screen, UserProfile, UserRole } from './types';
import { api, authStorage } from './services/api';

// Screens
import { LandingPage } from './screens/LandingPage';
import { LoginPage } from './screens/LoginPage';
import { RegisterPage } from './screens/RegisterPage';
import { ForgotPasswordPage } from './screens/ForgotPasswordPage';
import { ResetPasswordPage } from './screens/ResetPasswordPage';
import { CustomerDashboard } from './screens/CustomerDashboard';
import { AccountDetailsPage } from './screens/AccountDetailsPage';
import { MoneyTransferPage } from './screens/MoneyTransferPage';
import { TransactionHistoryPage } from './screens/TransactionHistoryPage';
import { CustomerProfilePage } from './screens/CustomerProfilePage';
import { SettingsPage } from './screens/SettingsPage';
import { AdminDashboard } from './screens/AdminDashboard';
import { AdminUserManagementPage } from './screens/AdminUserManagementPage';
import { AdminAuditLogPage } from './screens/AdminAuditLogPage';

function getDefaultScreenForRole(role?: UserRole): Screen {
  if (role === 'ADMIN') return 'admin-dashboard';
  if (role === 'AUDITOR') return 'admin-audit';
  return 'dashboard';
}

export function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => authStorage.getUser());
  const [currentScreen, setCurrentScreen] = useState<Screen>(() => {
    const user = authStorage.getUser();
    if (!user || !authStorage.getToken()) return 'login';
    return getDefaultScreenForRole(user.role);
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [resetTokenParam, setResetTokenParam] = useState<string>('');

  const userRole: UserRole = currentUser?.role || 'ACCOUNT_HOLDER';

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

  // Check URL token and validate session against backend /api/v1/auth/me on mount/refresh
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token') || params.get('resetToken');
    if (urlToken) {
      setResetTokenParam(urlToken.trim());
      setCurrentScreen('reset-password');
      return;
    }

    const token = authStorage.getToken();
    if (token) {
      api.getCurrentUser()
        .then((profile) => {
          setCurrentUser(profile);
          authStorage.setSession(token, profile);
        })
        .catch(() => {
          // Token is invalid or expired
          authStorage.clearSession();
          setCurrentUser(null);
          setCurrentScreen('login');
          showToast('Session Expired', 'Please sign in again to continue', 'info');
        });
    }
  }, []);

  // Strict role guard enforcement
  const handleNavigate = (targetScreen: Screen) => {
    if (
      targetScreen === 'landing' ||
      targetScreen === 'login' ||
      targetScreen === 'register' ||
      targetScreen === 'forgot-password' ||
      targetScreen === 'reset-password'
    ) {
      setCurrentScreen(targetScreen);
      return;
    }

    if (!currentUser) {
      setCurrentScreen('login');
      return;
    }

    // Role-specific screen restrictions
    if (currentUser.role === 'ACCOUNT_HOLDER') {
      if (targetScreen.startsWith('admin-')) {
        showToast('Access Denied', 'Administrative screens are restricted to authorized personnel', 'info');
        setCurrentScreen('dashboard');
        return;
      }
    } else if (currentUser.role === 'ADMIN') {
      if (targetScreen === 'dashboard' || targetScreen === 'transfer' || targetScreen === 'accounts' || targetScreen === 'transactions') {
        showToast('Admin Mode Active', 'Administrators access system command centers only', 'info');
        setCurrentScreen(targetScreen === 'transactions' ? 'admin-transactions' : 'admin-dashboard');
        return;
      }
    } else if (currentUser.role === 'AUDITOR') {
      if (targetScreen === 'transfer' || targetScreen === 'dashboard' || (targetScreen.startsWith('admin-') && targetScreen !== 'admin-audit')) {
        showToast('Read-Only Role', 'Auditors have read-only access to audit trail and ledgers', 'info');
        setCurrentScreen('admin-audit');
        return;
      }
    }

    setCurrentScreen(targetScreen);
  };

  const handleLogout = () => {
    authStorage.clearSession();
    setCurrentUser(null);
    setCurrentScreen('login');
    showToast('Signed Out', 'You have been safely signed out', 'info');
  };

  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    const dest = getDefaultScreenForRole(user.role);
    setCurrentScreen(dest);
    showToast(
      'Authentication Successful',
      `Welcome, ${user.fullName || user.username} (${user.role.replace(/_/g, ' ')})`,
      'success'
    );
  };

  const handleRegisterSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    setCurrentScreen('dashboard');
    showToast(
      'Account Created',
      `Welcome to BalanceVault, ${user.fullName || user.username}`,
      'success'
    );
  };

  // Fullscreen standalone pages
  if (currentScreen === 'landing') {
    return <LandingPage onNavigate={handleNavigate} />;
  }

  if (currentScreen === 'login') {
    return (
      <LoginPage
        onNavigate={handleNavigate}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  if (currentScreen === 'register') {
    return (
      <RegisterPage
        onNavigate={handleNavigate}
        onRegisterSuccess={handleRegisterSuccess}
      />
    );
  }

  if (currentScreen === 'forgot-password') {
    return <ForgotPasswordPage onNavigate={handleNavigate} />;
  }

  if (currentScreen === 'reset-password') {
    return (
      <ResetPasswordPage
        onNavigate={handleNavigate}
        initialToken={resetTokenParam}
      />
    );
  }

  // Header metadata mapping
  const screenMeta: Record<Screen, { title: string; subtitle: string }> = {
    landing: { title: 'BalanceVault', subtitle: 'Trust in Every Transaction' },
    login: { title: 'Sign In', subtitle: 'Access your account' },
    register: { title: 'Open Account', subtitle: 'Register verified vault' },
    'forgot-password': { title: 'Forgot Password', subtitle: 'Self-service account access recovery' },
    'reset-password': { title: 'Reset Password', subtitle: 'Set new secure credentials' },
    dashboard: { title: 'Vault Overview', subtitle: 'Primary portfolio status and balances' },
    accounts: { title: 'Accounts & Vaults', subtitle: 'Segregated account records' },
    transfer: { title: 'Money Movement', subtitle: 'Internal vault sweep and wire simulation' },
    transactions: { title: 'Transaction History', subtitle: 'Verified append-only ledger entries' },
    profile: { title: 'Customer Profile', subtitle: 'Identity credentials and security limits' },
    settings: { title: 'System Settings', subtitle: 'Preferences and session parameters' },
    'admin-dashboard': { title: 'Admin Command Center', subtitle: 'System integrity and security metrics' },
    'admin-users': { title: 'User Directory', subtitle: 'Tenant roles and access control' },
    'admin-accounts': { title: 'Account Management', subtitle: 'Customer and system vault registries' },
    'admin-transactions': { title: 'Transaction Monitor', subtitle: 'Unified ledger streams and suspicious detection' },
    'admin-security': { title: 'Security Center', subtitle: 'Real-time telemetry and brute-force defenses' },
    'admin-reports': { title: 'Reports & Analytics', subtitle: 'Financial aggregation and trend curves' },
    'admin-audit': { title: 'Audit Trail', subtitle: 'Immutable database event logs' },
  };

  const currentMeta = screenMeta[currentScreen] || { title: 'BalanceVault', subtitle: '' };

  return (
    <div className="min-h-screen bg-main-bg flex">
      {/* Global Sidebar */}
      <Sidebar
        currentScreen={currentScreen}
        onNavigate={handleNavigate}
        userRole={userRole}
        currentUser={currentUser}
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
          currentUser={currentUser}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-in fade-in duration-200">
          {currentScreen === 'dashboard' && (
            <CustomerDashboard
              onNavigate={handleNavigate}
              onShowToast={showToast}
              currentUser={currentUser}
            />
          )}

          {currentScreen === 'accounts' && (
            <AccountDetailsPage
              onNavigate={handleNavigate}
              onShowToast={showToast}
            />
          )}

          {currentScreen === 'transfer' && (
            <MoneyTransferPage
              onNavigate={handleNavigate}
              onShowToast={showToast}
            />
          )}

          {currentScreen === 'transactions' && (
            <TransactionHistoryPage onShowToast={showToast} />
          )}

          {currentScreen === 'profile' && (
            <CustomerProfilePage
              onShowToast={showToast}
              currentUser={currentUser}
            />
          )}

          {currentScreen === 'settings' && (
            <SettingsPage
              onShowToast={showToast}
              currentUser={currentUser}
              onLogout={handleLogout}
            />
          )}

          {currentScreen === 'admin-dashboard' && (
            <AdminDashboard
              onNavigate={handleNavigate}
              onShowToast={showToast}
              initialTab="overview"
            />
          )}

          {currentScreen === 'admin-accounts' && (
            <AdminDashboard
              onNavigate={handleNavigate}
              onShowToast={showToast}
              initialTab="accounts"
            />
          )}

          {currentScreen === 'admin-transactions' && (
            <AdminDashboard
              onNavigate={handleNavigate}
              onShowToast={showToast}
              initialTab="transactions"
            />
          )}

          {currentScreen === 'admin-security' && (
            <AdminDashboard
              onNavigate={handleNavigate}
              onShowToast={showToast}
              initialTab="security"
            />
          )}

          {currentScreen === 'admin-reports' && (
            <AdminDashboard
              onNavigate={handleNavigate}
              onShowToast={showToast}
              initialTab="reports"
            />
          )}

          {currentScreen === 'admin-users' && (
            <AdminUserManagementPage onShowToast={showToast} />
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
