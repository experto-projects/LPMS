import { Request, Response } from 'express';
import { getDatabase } from '../database/sqlite.ts';
import { extractFolderId } from '../utils/drive.ts';
import { GoogleService } from '../services/google.ts';

export class SettingsController {
  /**
   * Retrieves the current settings.
   */
  public static async getSettings(req: Request, res: Response): Promise<void> {
    try {
      const db = await getDatabase();
      const settings = await db.getSettings();
      
      res.json({
        success: true,
        data: settings || {
          google_drive_folder_url: '',
          google_drive_folder_id: '',
          last_scan: null
        }
      });
    } catch (error: any) {
      console.error('Error getting settings:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve application settings. Please try again later.'
      });
    }
  }

  /**
   * Validates and saves Google Drive folder settings.
   */
  public static async saveSettings(req: Request, res: Response): Promise<void> {
    try {
      const { google_drive_folder_url } = req.body;
      const authHeader = req.headers.authorization;

      if (!google_drive_folder_url) {
        res.status(400).json({
          success: false,
          message: 'The Google Drive Folder URL is required.'
        });
        return;
      }

      // Extract the folder ID
      const folderId = extractFolderId(google_drive_folder_url);
      if (!folderId) {
        res.status(400).json({
          success: false,
          message: 'Invalid Google Drive Folder URL. Please provide a valid folder URL.'
        });
        return;
      }

      // Optional: If an OAuth access token is passed in the header, let's verify folder access
      if (authHeader) {
        try {
          const accessToken = authHeader.replace(/^Bearer\s+/i, '');
          await GoogleService.validateFolder(accessToken, folderId);
        } catch (err: any) {
          res.status(400).json({
            success: false,
            message: `Could not verify access to the Google Drive folder: ${err.message}`
          });
          return;
        }
      }

      const db = await getDatabase();
      await db.saveSettings(google_drive_folder_url, folderId);

      res.json({
        success: true,
        message: 'Google Drive folder configuration saved successfully.',
        data: {
          google_drive_folder_url,
          google_drive_folder_id: folderId,
          last_scan: null
        }
      });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'An unexpected error occurred while saving configuration.'
      });
    }
  }
}
