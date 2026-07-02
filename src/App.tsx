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

        // Securely sync the user's Google ID and access token to the backend
        try {
          await ApiService.storeAdminSession(result.user.uid, result.accessToken);
        } catch (sessErr) {
          console.error('Failed to sync authentication session with server:', sessErr);
        }

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

  const handleSaveSettings = async (url: string, frequency: string) => {
    setIsSavingSettings(true);
    clearNotification();
    try {
      // Pass token so backend can verify folder exists and is readable
      const updated = await ApiService.saveSettings(url, frequency, token);
      setSettings(updated);
      showNotification('Google Drive configuration and automated scan frequency saved successfully.', 'success');
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#050505] space-y-4">
        <RefreshCw className="h-8 w-8 text-zinc-300 animate-spin" />
        <p className="text-sm font-medium text-zinc-400">Initializing authentication session...</p>
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
    <div className="min-h-screen bg-[#050505] text-zinc-300 flex flex-col font-sans">
      {/* Navigation Header */}
      <header className="bg-[#0a0a0a] border-b border-[#18181b] sticky top-0 z-20 shadow-[0_1px_10px_rgba(0,0,0,0.4)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="h-9 w-9 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center text-zinc-200">
                <BookOpenCheck className="h-5 w-5" />
              </div>
              <div>
                <span className="font-serif italic text-base sm:text-lg text-[#fafafa] tracking-tight block">
                  Project LAMP
                </span>
                <span className="text-[10px] text-zinc-500 block uppercase tracking-widest font-mono">
                  Lesson Approval and Management Portal
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
                  className="h-8 w-8 rounded-full border border-zinc-800"
                />
                <div className="text-xs">
                  <span className="font-medium text-zinc-200 block">
                    {user.displayName}
                  </span>
                  <span className="text-zinc-500 text-[10px] block">
                    {user.email}
                  </span>
                </div>
              </div>

              <button
                id="logout-btn"
                onClick={handleLogout}
                className="inline-flex items-center justify-center p-2 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-900/60 focus:outline-none transition-colors cursor-pointer"
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
          <div className="border-b border-zinc-900 pb-3">
            <h2 className="text-2xl font-serif italic text-[#fafafa] tracking-tight">
              Lesson Plan Submissions Matrix
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
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
      <footer className="bg-[#050505] border-t border-[#18181b] py-6 text-center text-[10px] text-zinc-600 uppercase tracking-widest">
        <div className="max-w-7xl mx-auto px-4">
          &copy; {new Date().getFullYear()} Project LAMP &bull; Lesson Approval and Management Portal
        </div>
      </footer>
    </div>
  );
}
