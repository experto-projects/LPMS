import { GoogleService, GoogleDocFile, GoogleDocTab } from './google.ts';
import { getDatabase } from '../database/sqlite.ts';

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
  columns: string[]; // unique sorted lesson execution dates
  rows: TeacherSubmissionRow[];
}

export class MonitoringService {
  /**
   * Scans the saved Google Drive folder and generates a fresh monitoring dataset.
   */
  public static async scanFolder(accessToken: string): Promise<MonitoringDataset> {
    const db = await getDatabase();
    const settings = await db.getSettings();

    if (!settings || !settings.google_drive_folder_id) {
      throw new Error('No Google Drive folder has been configured yet. Please configure a folder first.');
    }

    const folderId = settings.google_drive_folder_id;

    // 1. Validate folder and get its actual name
    const folderMeta = await GoogleService.validateFolder(accessToken, folderId);

    // 2. Retrieve all Google Documents inside the folder
    const documents = await GoogleService.getDocumentsInFolder(accessToken, folderId);

    if (documents.length === 0) {
      // Return a blank dataset if there are no documents
      return {
        folderId,
        folderName: folderMeta.name,
        scanTime: new Date().toISOString(),
        columns: [],
        rows: []
      };
    }

    // 3. For each document, retrieve its tabs concurrently
    const docTabsPromises = documents.map(async (doc) => {
      try {
        const tabs = await GoogleService.getDocumentTabs(accessToken, doc.id);
        return {
          documentId: doc.id,
          teacherName: doc.name,
          lastModified: doc.modifiedTime,
          tabs,
          error: null
        };
      } catch (err: any) {
        console.error(`Error reading document tabs for document ID ${doc.id}:`, err);
        return {
          documentId: doc.id,
          teacherName: doc.name,
          lastModified: doc.modifiedTime,
          tabs: [] as GoogleDocTab[],
          error: err.message || 'Failed to fetch tabs'
        };
      }
    });

    const parsedDocs = await Promise.all(docTabsPromises);

    // 4. Collect and aggregate all unique tab titles across all documents to form the columns
    const uniqueDatesSet = new Set<string>();
    parsedDocs.forEach((d) => {
      d.tabs.forEach((tab) => {
        if (tab.title) {
          uniqueDatesSet.add(tab.title);
        }
      });
    });

    const uniqueDates = Array.from(uniqueDatesSet);

    // Sort unique dates dynamically
    // We try to parse them as dates first, sorting chronological. If they are not valid dates, sort alphabetically.
    const sortedColumns = uniqueDates.sort((a, b) => {
      const timeA = Date.parse(a);
      const timeB = Date.parse(b);
      
      const isAValidDate = !isNaN(timeA);
      const isBValidDate = !isNaN(timeB);

      if (isAValidDate && isBValidDate) {
        return timeA - timeB;
      } else if (isAValidDate) {
        return -1; // place valid dates first
      } else if (isBValidDate) {
        return 1;
      } else {
        return a.localeCompare(b);
      }
    });

    // 5. Build rows mapping each teacher to their tab presence
    const rows: TeacherSubmissionRow[] = parsedDocs.map((d) => {
      const submissions: { [dateColumn: string]: boolean } = {};
      
      // Initialize all columns as false
      sortedColumns.forEach((col) => {
        submissions[col] = false;
      });

      // Mark matched columns as true
      d.tabs.forEach((tab) => {
        if (tab.title && submissions[tab.title] !== undefined) {
          submissions[tab.title] = true;
        }
      });

      return {
        documentId: d.documentId,
        teacherName: d.teacherName,
        lastModified: d.lastModified,
        submissions,
        error: d.error
      };
    });

    // 6. Save dataset and scanning metadata into database
    const dataset: MonitoringDataset = {
      folderId,
      folderName: folderMeta.name,
      scanTime: new Date().toISOString(),
      columns: sortedColumns,
      rows
    };

    await db.saveScanResult(dataset);

    return dataset;
  }

  /**
   * Retrieves the latest scan result from the database.
   */
  public static async getLatestMonitoringData(): Promise<MonitoringDataset | null> {
    const db = await getDatabase();
    const scanResult = await db.getLatestScan();
    if (!scanResult) return null;

    try {
      return JSON.parse(scanResult.dataset) as MonitoringDataset;
    } catch (err) {
      console.error('Failed to parse saved monitoring dataset JSON:', err);
      return null;
    }
  }
}
