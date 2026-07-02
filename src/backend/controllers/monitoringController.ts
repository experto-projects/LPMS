import { Request, Response } from 'express';
import { MonitoringService } from '../services/monitoring.ts';

export class MonitoringController {
  /**
   * Scans the Google Drive folder to update the lesson plan monitoring grid.
   */
  public static async scanFolder(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        res.status(401).json({
          success: false,
          message: 'Authorization token is missing. Please sign in with Google first.'
        });
        return;
      }

      const accessToken = authHeader.replace(/^Bearer\s+/i, '');
      const dataset = await MonitoringService.scanFolder(accessToken);

      res.json({
        success: true,
        message: 'Google Drive folder scanned successfully.',
        data: dataset
      });
    } catch (error: any) {
      console.error('Error scanning folder:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'An unexpected error occurred during scanning.'
      });
    }
  }

  /**
   * Retrieves the latest scanned monitoring dataset.
   */
  public static async getMonitoringData(req: Request, res: Response): Promise<void> {
    try {
      const dataset = await MonitoringService.getLatestMonitoringData();
      
      res.json({
        success: true,
        data: dataset
      });
    } catch (error: any) {
      console.error('Error retrieving monitoring data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve lesson plan monitoring data. Please try again later.'
      });
    }
  }
}
