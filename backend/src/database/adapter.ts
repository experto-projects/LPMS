/**
 * Database abstraction layer to support easy swapping of the underlying database engine
 * (e.g. from SQLite to PostgreSQL in the future).
 */

export interface Settings {
  google_drive_folder_url: string;
  google_drive_folder_id: string;
  last_scan: string | null;
  scan_frequency: string; // 'manual', 'hourly', 'daily'
  admin_google_id: string | null;
  admin_access_token: string | null;
  admin_name?: string | null;
  admin_email?: string | null;
}

export interface ScanResult {
  id?: number;
  scan_time: string;
  dataset: string; // JSON string containing the grid dataset
}

export interface IDatabase {
  init(): Promise<void>;
  getSettings(): Promise<Settings | null>;
  saveSettings(url: string, folderId: string, scanFrequency: string): Promise<void>;
  storeAdminSession(googleId: string, accessToken: string): Promise<void>;
  updateLastScan(time: string): Promise<void>;
  saveScanResult(dataset: any): Promise<ScanResult>;
  getLatestScan(): Promise<ScanResult | null>;
  saveToDisk(): Promise<void>;
}
