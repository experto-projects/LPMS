import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { IDatabase, Settings, ScanResult } from './adapter.ts';
import path from 'path';

export class SQLiteDatabase implements IDatabase {
  private db: Database | null = null;
  private dbPath: string;

  constructor() {
    // Store sqlite database file in the project workspace
    this.dbPath = path.join(process.cwd(), 'lpms.db');
  }

  async init(): Promise<void> {
    if (this.db) return;

    this.db = await open({
      filename: this.dbPath,
      driver: sqlite3.Database
    });

    // Create tables if they do not exist
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        google_drive_folder_url TEXT NOT NULL,
        google_drive_folder_id TEXT NOT NULL,
        last_scan TEXT,
        scan_frequency TEXT NOT NULL DEFAULT 'manual',
        admin_google_id TEXT,
        admin_access_token TEXT
      );

      CREATE TABLE IF NOT EXISTS scans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scan_time TEXT NOT NULL,
        dataset TEXT NOT NULL
      );
    `);

    // Gracefully alter table for migration if columns don't exist
    try {
      await this.db.exec(`ALTER TABLE settings ADD COLUMN scan_frequency TEXT NOT NULL DEFAULT 'manual';`);
    } catch (e) {}
    try {
      await this.db.exec(`ALTER TABLE settings ADD COLUMN admin_google_id TEXT;`);
    } catch (e) {}
    try {
      await this.db.exec(`ALTER TABLE settings ADD COLUMN admin_access_token TEXT;`);
    } catch (e) {}
  }

  private getDb(): Database {
    if (!this.db) {
      throw new Error('Database not initialized. Call init() first.');
    }
    return this.db;
  }

  async getSettings(): Promise<Settings | null> {
    const db = this.getDb();
    const row = await db.get('SELECT google_drive_folder_url, google_drive_folder_id, last_scan, scan_frequency, admin_google_id, admin_access_token FROM settings WHERE id = 1');
    if (!row) return null;
    return {
      google_drive_folder_url: row.google_drive_folder_url,
      google_drive_folder_id: row.google_drive_folder_id,
      last_scan: row.last_scan,
      scan_frequency: row.scan_frequency || 'manual',
      admin_google_id: row.admin_google_id || null,
      admin_access_token: row.admin_access_token || null
    };
  }

  async saveSettings(url: string, folderId: string, scanFrequency: string): Promise<void> {
    const db = this.getDb();
    // Use INSERT OR REPLACE on id = 1 to maintain a single global setting row
    await db.run(
      `INSERT INTO settings (id, google_drive_folder_url, google_drive_folder_id, last_scan, scan_frequency)
       VALUES (1, ?, ?, NULL, ?)
       ON CONFLICT(id) DO UPDATE SET
         google_drive_folder_url = excluded.google_drive_folder_url,
         google_drive_folder_id = excluded.google_drive_folder_id,
         scan_frequency = excluded.scan_frequency`,
      url,
      folderId,
      scanFrequency
    );
  }

  async storeAdminSession(googleId: string, accessToken: string): Promise<void> {
    const db = this.getDb();
    const existing = await this.getSettings();
    if (existing) {
      await db.run(
        `UPDATE settings SET admin_google_id = ?, admin_access_token = ? WHERE id = 1`,
        googleId,
        accessToken
      );
    } else {
      await db.run(
        `INSERT INTO settings (id, google_drive_folder_url, google_drive_folder_id, last_scan, scan_frequency, admin_google_id, admin_access_token)
         VALUES (1, '', '', NULL, 'manual', ?, ?)`,
        googleId,
        accessToken
      );
    }
  }

  async updateLastScan(time: string): Promise<void> {
    const db = this.getDb();
    await db.run('UPDATE settings SET last_scan = ? WHERE id = 1', time);
  }

  async saveScanResult(dataset: any): Promise<ScanResult> {
    const db = this.getDb();
    const scanTime = new Date().toISOString();
    const datasetStr = JSON.stringify(dataset);

    const result = await db.run(
      'INSERT INTO scans (scan_time, dataset) VALUES (?, ?)',
      scanTime,
      datasetStr
    );

    // Also update settings table's last_scan
    await this.updateLastScan(scanTime);

    return {
      id: result.lastID,
      scan_time: scanTime,
      dataset: datasetStr
    };
  }

  async getLatestScan(): Promise<ScanResult | null> {
    const db = this.getDb();
    const row = await db.get('SELECT id, scan_time, dataset FROM scans ORDER BY id DESC LIMIT 1');
    if (!row) return null;
    return {
      id: row.id,
      scan_time: row.scan_time,
      dataset: row.dataset
    };
  }
}

// Export a singleton database instance
let databaseInstance: IDatabase | null = null;

export async function getDatabase(): Promise<IDatabase> {
  if (!databaseInstance) {
    databaseInstance = new SQLiteDatabase();
    await databaseInstance.init();
  }
  return databaseInstance;
}
