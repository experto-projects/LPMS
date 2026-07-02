import { Router } from 'express';
import { SettingsController } from '../controllers/settingsController.ts';
import { MonitoringController } from '../controllers/monitoringController.ts';
import { AuthController } from '../controllers/authController.ts';

const router = Router();

// Auth Endpoints
router.get('/auth/google', AuthController.initiateGoogleAuth);
router.get('/auth/google/callback', AuthController.handleGoogleCallback);
router.get('/auth/me', AuthController.getCurrentUser);
router.post('/auth/logout', AuthController.logout);

// Settings Endpoints
router.get('/settings', SettingsController.getSettings);
router.post('/settings', SettingsController.saveSettings);

// Monitoring / Scanning Endpoints
router.get('/monitoring', MonitoringController.getMonitoringData);
router.post('/scan', MonitoringController.scanFolder);

export default router;
