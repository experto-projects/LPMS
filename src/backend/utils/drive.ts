/**
 * Google Drive URL and ID extraction utilities.
 */

/**
 * Extracts a Google Drive Folder ID from a full Google Drive URL or validates a raw ID.
 * Supports:
 * - https://drive.google.com/drive/folders/FOLDER_ID
 * - https://drive.google.com/drive/u/1/folders/FOLDER_ID
 * - Raw folder ID (e.g., 1A2B3C...)
 */
export function extractFolderId(urlOrId: string): string | null {
  const trimmed = urlOrId.trim();
  if (!trimmed) return null;

  // Regular expression to match standard Google Drive Folder IDs (typically 28 to 40 characters)
  const idPattern = /^[a-zA-Z0-9-_]{25,45}$/;
  if (idPattern.test(trimmed)) {
    return trimmed;
  }

  // Regular expression to match folder URL and extract ID
  const urlPattern = /\/folders\/([a-zA-Z0-9-_]{25,45})/;
  const match = trimmed.match(urlPattern);
  if (match && match[1]) {
    return match[1];
  }

  return null;
}
