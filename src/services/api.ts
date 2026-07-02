/**
 * API Service for interacting with the backend Express REST API endpoints.
 */

export interface SettingsResponse {
  google_drive_folder_url: string;
  google_drive_folder_id: string;
  last_scan: string | null;
}

export interface TeacherSubmissionRow {
  documentId: string;
  teacherName: string;
  lastModified: string;
  submissions: { [dateColumn: string]: boolean };
  error?: string | null;
}

export interface MonitoringDataset {
  folderId: string;
  folderName: string;
  scanTime: string;
  columns: string[];
  rows: TeacherSubmissionRow[];
}

export class ApiService {
  /**
   * Retrieves application settings from the backend.
   */
  public static async getSettings(): Promise<SettingsResponse> {
    const response = await fetch('/api/settings');
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to retrieve application settings.');
    }
    const result = await response.json();
    return result.data;
  }

  /**
   * Saves Google Drive folder configuration. Passes OAuth access token to verify folder existence.
   */
  public static async saveSettings(folderUrl: string, accessToken?: string | null): Promise<SettingsResponse> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch('/api/settings', {
      method: 'POST',
      headers,
      body: JSON.stringify({ google_drive_folder_url: folderUrl }),
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
  public static async scanFolder(accessToken: string): Promise<MonitoringDataset> {
    const response = await fetch('/api/scan', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
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
}
