import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { initAuth, googleSignIn, logout } from './services/auth.ts';
import { ApiService, SettingsResponse, MonitoringDataset } from './services/api.ts';
import { LoginView } from './components/LoginView.tsx';
import { SettingsPanel } from './components/SettingsPanel.tsx';
import { MonitoringGrid } from './components/MonitoringGrid.tsx';
import { NotificationToast, NotificationType } from './components/NotificationToast.tsx';
import { BookOpenCheck, LogOut, RefreshCw } from 'lucide-react';

export default function App() {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(true);

  // Application Data state
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [dataset, setDataset] = useState<MonitoringDataset | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // Notification state
  const [notification, setNotification] = useState<{ message: string | null; type: NotificationType }>({
    message: null,
    type: 'info',
  });

  // Initialize auth state listener and load cached data
  useEffect(() => {
    // 1. Initial configuration load (can be done without login)
    loadSettings();
    loadMonitoringData();

    // 2. Setup auth state listener
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        setNeedsAuth(false);
        setIsInitializing(false);
      },
      () => {
        setUser(null);
        setToken(null);
        setNeedsAuth(true);
        setIsInitializing(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const showNotification = (message: string, type: NotificationType = 'info') => {
    setNotification({ message, type });
  };

  const clearNotification = () => {
    setNotification((prev) => ({ ...prev, message: null }));
  };

  const loadSettings = async () => {
    setIsLoadingSettings(true);
    try {
      const data = await ApiService.getSettings();
      setSettings(data);
    } catch (err: any) {
      console.error('Failed to load settings:', err);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  const loadMonitoringData = async () => {
    setIsLoadingData(true);
    try {
      const data = await ApiService.getMonitoringData();
      setDataset(data);
    } catch (err: any) {
      console.error('Failed to load monitoring data:', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    clearNotification();
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        setNeedsAuth(false);
        showNotification('Successfully authenticated with Google.', 'success');
        
        // Reload settings and verification
        await loadSettings();
        await loadMonitoringData();
      }
    } catch (err: any) {
      console.error('Login failed:', err);
      showNotification(err.message || 'Authentication with Google failed. Please try again.', 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setToken(null);
      setNeedsAuth(true);
      showNotification('You have logged out successfully.', 'success');
    } catch (err: any) {
      showNotification('An error occurred during sign out.', 'error');
    }
  };

  const handleSaveSettings = async (url: string) => {
    setIsSavingSettings(true);
    clearNotification();
    try {
      // Pass token so backend can verify folder exists and is readable
      const updated = await ApiService.saveSettings(url, token);
      setSettings(updated);
      showNotification('Google Drive Folder configured and saved successfully.', 'success');
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      showNotification(err.message || 'Failed to save settings. Make sure you have authorized access.', 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleScanFolder = async () => {
    if (!token) {
      setNeedsAuth(true);
      showNotification('Your session has expired. Please sign in with Google to scan.', 'error');
      return;
    }

    setIsScanning(true);
    clearNotification();
    try {
      const scanResult = await ApiService.scanFolder(token);
      setDataset(scanResult);
      
      // Update settings state to refresh last_scan time
      if (settings) {
        setSettings({
          ...settings,
          last_scan: scanResult.scanTime,
        });
      }
      showNotification(`Scan completed! Analyzed ${scanResult.rows.length} teacher documents.`, 'success');
    } catch (err: any) {
      console.error('Scan failed:', err);
      showNotification(err.message || 'Failed to scan the Google Drive folder. Verify folder access permissions.', 'error');
    } finally {
      setIsScanning(false);
    }
  };

  // While checking Firebase Auth status
  if (isInitializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 space-y-4">
        <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin" />
        <p className="text-sm font-medium text-gray-500">Initializing authentication session...</p>
      </div>
    );
  }

  // If user is not logged in or doesn't have a Google OAuth Token
  if (needsAuth || !user) {
    return (
      <LoginView
        onLogin={handleLogin}
        isLoggingIn={isLoggingIn}
        error={notification.type === 'error' ? notification.message : null}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navigation Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="h-9 w-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                <BookOpenCheck className="h-5 w-5" />
              </div>
              <div>
                <span className="font-bold text-gray-900 tracking-tight block text-sm sm:text-base">
                  LPMS Dashboard
                </span>
                <span className="text-[10px] text-gray-400 block -mt-1 font-mono">
                  Phase 1 MVP
                </span>
              </div>
            </div>

            {/* Profile and Logout Actions */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2.5 text-right hidden sm:flex">
                <img
                  src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'Teacher')}`}
                  alt={user.displayName || 'Profile'}
                  referrerPolicy="no-referrer"
                  className="h-8 w-8 rounded-full border border-gray-200"
                />
                <div className="text-xs">
                  <span className="font-medium text-gray-800 block">
                    {user.displayName}
                  </span>
                  <span className="text-gray-400 text-[10px] block">
                    {user.email}
                  </span>
                </div>
              </div>

              <button
                id="logout-btn"
                onClick={handleLogout}
                className="inline-flex items-center justify-center p-2 rounded-lg text-gray-500 hover:text-rose-600 hover:bg-rose-50/50 focus:outline-none transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Quick notification block */}
        <NotificationToast
          message={notification.message}
          type={notification.type}
          onClear={clearNotification}
        />

        {/* Configurations Area */}
        <SettingsPanel
          settings={settings}
          onSave={handleSaveSettings}
          onScan={handleScanFolder}
          isSaving={isSavingSettings}
          isScanning={isScanning}
          lastScanTime={settings?.last_scan || (dataset ? dataset.scanTime : null)}
          folderName={dataset ? dataset.folderName : null}
        />

        {/* Monitoring Grid Area */}
        <div className="space-y-4">
          <div className="border-b border-gray-200 pb-2">
            <h2 className="text-lg font-semibold tracking-tight text-gray-900">
              Lesson Plan Submissions Matrix
            </h2>
            <p className="text-xs text-gray-500">
              Shows lesson execution dates matching tabs extracted from each teacher's Google Doc
            </p>
          </div>

          <MonitoringGrid
            dataset={dataset}
            isLoading={isLoadingData}
            onScan={handleScanFolder}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-6 text-center text-xs text-gray-400">
        <div className="max-w-7xl mx-auto px-4">
          &copy; {new Date().getFullYear()} Lesson Plan Monitoring System. Designed for scale and maintainability.
        </div>
      </footer>
    </div>
  );
}
