export interface Settings {
  google_drive_folder_url: string;
  google_drive_folder_id: string;
  last_scan: string | null;
  scan_frequency: string;
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
