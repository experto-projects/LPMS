import { Settings, MonitoringDataset } from '../types.ts';

export class ApiService {
  /**
   * Retrieves application settings from the backend.
   */
  public static async getSettings(): Promise<Settings> {
    const response = await fetch('/api/settings');
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to retrieve application settings.');
    }
    const result = await response.json();
    return result.data;
  }

  /**
   * Saves Google Drive folder configuration and scan frequency.
   */
  public static async saveSettings(folderUrl: string, scanFrequency: string): Promise<Settings> {
    const response = await fetch('/api/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        google_drive_folder_url: folderUrl,
        scan_frequency: scanFrequency
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to save settings.');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Triggers a fresh Google folder scan via the backend.
   */
  public static async scanFolder(): Promise<MonitoringDataset> {
    const response = await fetch('/api/scan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to complete scanning process.');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Retrieves the latest stored monitoring dataset.
   */
  public static async getMonitoringData(): Promise<MonitoringDataset | null> {
    const response = await fetch('/api/monitoring');
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to fetch monitoring data.');
    }
    const result = await response.json();
    return result.data || null;
  }

  /**
   * Retrieves the current logged in user profile from the backend.
   */
  public static async getProfile(): Promise<{ id: string; name: string; email: string } | null> {
    const response = await fetch('/api/auth/me');
    if (!response.ok) {
      return null;
    }
    const result = await response.json();
    return result.success ? result.user : null;
  }

  /**
   * Logs out the user on the backend.
   */
  public static async logout(): Promise<void> {
    await fetch('/api/auth/logout', { method: 'POST' });
  }
}
