import { getDatabase } from '../database/sqlite.ts';
import { MonitoringService } from './monitoring.ts';

export class BackgroundScheduler {
  private static timer: NodeJS.Timeout | null = null;
  private static isScanning: boolean = false;

  /**
   * Starts the background scheduler loop.
   */
  public static start(): void {
    if (this.timer) return;

    console.log('Starting LPMS Background Folder Scanning Scheduler...');
    
    // Check every 30 seconds for pending background scans
    this.timer = setInterval(async () => {
      try {
        await this.checkAndTriggerScan();
      } catch (error) {
        console.error('Error inside background scheduler tick:', error);
      }
    }, 30000); // 30 seconds
  }

  /**
   * Stops the background scheduler loop.
   */
  public static stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('LPMS Background Folder Scanning Scheduler stopped.');
    }
  }

  /**
   * Evaluates if a background scan is needed, and if so, triggers it.
   */
  private static async checkAndTriggerScan(): Promise<void> {
    if (this.isScanning) {
      console.log('[Scheduler] A scan is already in progress, skipping tick.');
      return;
    }

    const db = await getDatabase();
    const settings = await db.getSettings();

    if (!settings) return;

    const { google_drive_folder_id, scan_frequency, last_scan, admin_access_token } = settings;

    // Background scans require a folder and a stored admin access token
    if (!google_drive_folder_id || !admin_access_token) {
      return;
    }

    if (!scan_frequency || scan_frequency === 'manual') {
      return;
    }

    const now = new Date();
    let shouldScan = false;

    if (!last_scan) {
      // No scan has ever run, trigger first scan immediately
      shouldScan = true;
    } else {
      const lastScanDate = new Date(last_scan);
      const elapsedMs = now.getTime() - lastScanDate.getTime();

      if (scan_frequency === 'hourly') {
        const oneHourMs = 60 * 60 * 1000;
        if (elapsedMs >= oneHourMs) {
          shouldScan = true;
        }
      } else if (scan_frequency === 'daily') {
        const twentyFourHoursMs = 24 * 60 * 60 * 1000;
        if (elapsedMs >= twentyFourHoursMs) {
          shouldScan = true;
        }
      }
    }

    if (shouldScan) {
      console.log(`[Scheduler] Automatic scan triggered based on frequency configuration: "${scan_frequency}"...`);
      this.isScanning = true;
      try {
        await MonitoringService.scanFolder(admin_access_token);
        console.log('[Scheduler] Background folder scan completed successfully.');
      } catch (error: any) {
        console.error('[Scheduler] Background folder scan failed:', error.message || error);
      } finally {
        this.isScanning = false;
      }
    }
  }
}
