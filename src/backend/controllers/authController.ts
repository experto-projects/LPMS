import { Request, Response } from 'express';
import { getDatabase } from '../database/sqlite.ts';

export class AuthController {
  /**
   * Stores the admin's Google ID and Access Token securely in the database.
   */
  public static async storeSession(req: Request, res: Response): Promise<void> {
    try {
      const { googleId, accessToken } = req.body;

      if (!googleId || !accessToken) {
        res.status(400).json({
          success: false,
          message: 'Google ID and Access Token are required.'
        });
        return;
      }

      const db = await getDatabase();
      await db.storeAdminSession(googleId, accessToken);

      res.json({
        success: true,
        message: 'Admin authentication credentials stored successfully.'
      });
    } catch (error: any) {
      console.error('Error storing admin session:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to securely store authentication credentials.'
      });
    }
  }
}
