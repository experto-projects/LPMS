import { Router } from 'express';
import { SettingsController } from '../controllers/settingsController.ts';
import { MonitoringController } from '../controllers/monitoringController.ts';
import { AuthController } from '../controllers/authController.ts';

const router = Router();

// Auth Endpoints
router.post('/auth/session', AuthController.storeSession);

// Settings Endpoints
router.get('/settings', SettingsController.getSettings);
router.post('/settings', SettingsController.saveSettings);

// Monitoring / Scanning Endpoints
router.get('/monitoring', MonitoringController.getMonitoringData);
router.post('/scan', MonitoringController.scanFolder);

export default router;
