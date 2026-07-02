import fs from 'fs/promises';
import path from 'path';
import { IDatabase, Settings, ScanResult } from './adapter.ts';

export class SQLiteDatabase implements IDatabase {
  private filePath: string;
  private data: {
    settings: Settings | null;
    scans: ScanResult[];
  } = {
    settings: null,
    scans: []
  };
  private isLoaded: boolean = false;
  private useKV: boolean = false;
  private kvNamespace: any = null;

  constructor() {
    this.filePath = path.join(process.cwd(), 'lpms_store.json');
  }

  /**
   * Dynamically resolves the Cloudflare KV namespace if available in the execution environment.
   */
  private getKV(): any {
    if (this.kvNamespace) return this.kvNamespace;

    if (typeof globalThis !== 'undefined') {
      // Check global scope for LPMS_KV binding (standard for Workers)
      if ('LPMS_KV' in globalThis) {
        this.kvNamespace = (globalThis as any).LPMS_KV;
        this.useKV = true;
        return this.kvNamespace;
      }
      
      // Check standard env context on global
      const g = globalThis as any;
      if (g.env && g.env.LPMS_KV) {
        this.kvNamespace = g.env.LPMS_KV;
        this.useKV = true;
        return this.kvNamespace;
      }
    }
    return null;
  }

  private async load(): Promise<void> {
    const kv = this.getKV();
    if (kv) {
      this.useKV = true;
      try {
        const settingsStr = await kv.get('settings');
        const scansStr = await kv.get('scans');
        
        this.data = {
          settings: settingsStr ? JSON.parse(settingsStr) : null,
          scans: scansStr ? JSON.parse(scansStr) : []
        };
        this.isLoaded = true;
        return;
      } catch (kvErr) {
        console.error('Failed to load data from Cloudflare KV, falling back to local storage:', kvErr);
      }
    }

    // Node.js fallback (local filesystem)
    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      this.data = JSON.parse(content);
      this.isLoaded = true;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // File does not exist yet, initialize with default empty state
        this.data = {
          settings: null,
          scans: []
        };
        await this.saveToDisk();
        this.isLoaded = true;
      } else {
        console.error('Failed to load JSON database:', error);
      }
    }
  }

  private async saveToDisk(): Promise<void> {
    const kv = this.getKV();
    if (kv) {
      try {
        await kv.put('settings', JSON.stringify(this.data.settings));
        await kv.put('scans', JSON.stringify(this.data.scans));
        return;
      } catch (kvErr) {
        console.error('Failed to save data to Cloudflare KV:', kvErr);
      }
    }

    // Node.js fallback (local filesystem)
    try {
      await fs.writeFile(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to write JSON database to disk:', error);
    }
  }

  async init(): Promise<void> {
    if (!this.isLoaded) {
      await this.load();
    }
  }

  async getSettings(): Promise<Settings | null> {
    await this.init();
    return this.data.settings;
  }

  async saveSettings(url: string, folderId: string, scanFrequency: string): Promise<void> {
    await this.init();
    const existing = this.data.settings;
    this.data.settings = {
      google_drive_folder_url: url,
      google_drive_folder_id: folderId,
      scan_frequency: scanFrequency,
      last_scan: existing ? existing.last_scan : null,
      admin_google_id: existing ? existing.admin_google_id : null,
      admin_access_token: existing ? existing.admin_access_token : null
    };
    await this.saveToDisk();
  }

  async storeAdminSession(googleId: string, accessToken: string): Promise<void> {
    await this.init();
    if (this.data.settings) {
      this.data.settings.admin_google_id = googleId;
      this.data.settings.admin_access_token = accessToken;
    } else {
      this.data.settings = {
        google_drive_folder_url: '',
        google_drive_folder_id: '',
        last_scan: null,
        scan_frequency: 'manual',
        admin_google_id: googleId,
        admin_access_token: accessToken
      };
    }
    await this.saveToDisk();
  }

  async updateLastScan(time: string): Promise<void> {
    await this.init();
    if (this.data.settings) {
      this.data.settings.last_scan = time;
      await this.saveToDisk();
    }
  }

  async saveScanResult(dataset: any): Promise<ScanResult> {
    await this.init();
    const scanTime = new Date().toISOString();
    const datasetStr = JSON.stringify(dataset);

    const nextId = this.data.scans.length > 0 
      ? Math.max(...this.data.scans.map(s => s.id || 0)) + 1 
      : 1;

    const newScan: ScanResult = {
      id: nextId,
      scan_time: scanTime,
      dataset: datasetStr
    };

    this.data.scans.push(newScan);
    await this.updateLastScan(scanTime); // updateLastScan saves to disk too
    await this.saveToDisk();

    return newScan;
  }

  async getLatestScan(): Promise<ScanResult | null> {
    await this.init();
    if (this.data.scans.length === 0) return null;
    return this.data.scans[this.data.scans.length - 1];
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
