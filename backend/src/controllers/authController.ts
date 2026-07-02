import { Request, Response } from 'express';
import { getDatabase } from '../database/sqlite.ts';

function getRedirectUri(req: Request): string {
  if (process.env.APP_URL) {
    return `${process.env.APP_URL.replace(/\/$/, '')}/api/auth/google/callback`;
  }
  const host = req.get('host') || 'localhost:3000';
  const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
  return `${protocol}://${host}/api/auth/google/callback`;
}

export class AuthController {
  /**
   * Redirects the user to Google's OAuth2 Consent screen.
   */
  public static initiateGoogleAuth(req: Request, res: Response): void {
    const redirectUri = getRedirectUri(req);
    // Use configured Client ID, or default to a safe mockable sandbox state for developer review if none provided.
    const clientId = process.env.GOOGLE_CLIENT_ID || '951087547552-6q7rru6h8kqu6iun9r8nd29on5a0sc3c.apps.googleusercontent.com';

    const scopes = [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/documents.readonly',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email'
    ];

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent'
    }).toString();

    res.redirect(authUrl);
  }

  /**
   * Handles Google OAuth2 Callback, exchanges authorization code for tokens, and logs in.
   */
  public static async handleGoogleCallback(req: Request, res: Response): Promise<void> {
    try {
      const code = req.query.code as string;
      if (!code) {
        res.status(400).send('Google authorization code is missing.');
        return;
      }

      const redirectUri = getRedirectUri(req);
      const clientId = process.env.GOOGLE_CLIENT_ID || '';
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';

      // Exchange authorization code for access token
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        }).toString()
      });

      if (!tokenResponse.ok) {
        const errBody = await tokenResponse.text();
        throw new Error(`Google token exchange failed: ${errBody}`);
      }

      const tokens = await tokenResponse.json();
      const accessToken = tokens.access_token;

      // Fetch logged-in user profile from Google API
      const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      let userInfo = { id: 'admin', name: 'LAMP Administrator', email: 'admin@lamp.org' };
      if (userResponse.ok) {
        userInfo = await userResponse.json();
      }

      // Store credentials in sqlite store
      const db = await getDatabase();
      await db.storeAdminSession(userInfo.id, accessToken);

      // Save admin profile metadata
      const settings = await db.getSettings();
      if (settings) {
        settings.admin_name = userInfo.name;
        settings.admin_email = userInfo.email;
        await db.saveToDisk();
      }

      // Return an HTML block that executes postMessage and self-closes
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Authentication Successful</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background-color: #050505; color: #fafafa; margin: 0; }
              .card { text-align: center; padding: 2.5rem; border-radius: 12px; background: #0a0a0a; border: 1px solid #18181b; box-shadow: 0 8px 32px rgba(0,0,0,0.6); max-width: 380px; }
              h1 { color: #10b981; font-size: 1.5rem; margin-bottom: 0.5rem; font-weight: 600; }
              p { color: #a1a1aa; font-size: 0.875rem; line-height: 1.5; }
              .spinner { margin: 1.5rem auto 0; width: 24px; height: 24px; border: 3px solid #18181b; border-top-color: #10b981; border-radius: 50%; animation: spin 1s linear infinite; }
              @keyframes spin { to { transform: rotate(360deg); } }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>Connection Success!</h1>
              <p>Sign-in complete. Connecting you back to Project LAMP...</p>
              <div class="spinner"></div>
            </div>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'OAUTH_AUTH_SUCCESS', 
                  user: ${JSON.stringify({ id: userInfo.id, name: userInfo.name, email: userInfo.email })}
                }, '*');
                setTimeout(() => window.close(), 1200);
              } else {
                window.location.href = '/';
              }
            </script>
          </body>
        </html>
      `);
    } catch (err: any) {
      console.error('Callback error:', err);
      res.status(500).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Authentication Failed</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background-color: #050505; color: #fafafa; margin: 0; }
              .card { text-align: center; padding: 2.5rem; border-radius: 12px; background: #0a0a0a; border: 1px solid #18181b; box-shadow: 0 8px 32px rgba(0,0,0,0.6); max-width: 420px; }
              h1 { color: #ef4444; font-size: 1.5rem; margin-bottom: 0.5rem; font-weight: 600; }
              p { color: #a1a1aa; font-size: 0.875rem; line-height: 1.5; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>Authentication Failed</h1>
              <p>${err.message || 'An unexpected error occurred during Google Sign-in.'}</p>
              <p style="margin-top: 1rem; font-size: 0.75rem; color: #71717a;">Please ensure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are configured correctly in your project settings.</p>
            </div>
          </body>
        </html>
      `);
    }
  }

  /**
   * Retrieves current logged in user profile based on stored credentials.
   */
  public static async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      const db = await getDatabase();
      const settings = await db.getSettings();

      if (settings && settings.admin_google_id && settings.admin_access_token) {
        res.json({
          success: true,
          user: {
            id: settings.admin_google_id,
            name: settings.admin_name || 'LAMP Administrator',
            email: settings.admin_email || 'admin@lamp.org'
          }
        });
      } else {
        res.status(401).json({
          success: false,
          message: 'No active session found.'
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve active session.'
      });
    }
  }

  /**
   * Revokes the session by removing the Google ID and access token.
   */
  public static async logout(req: Request, res: Response): Promise<void> {
    try {
      const db = await getDatabase();
      const settings = await db.getSettings();
      if (settings) {
        settings.admin_google_id = null;
        settings.admin_access_token = null;
        settings.admin_name = null;
        settings.admin_email = null;
        await db.saveToDisk();
      }
      res.json({ success: true, message: 'Logged out successfully.' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to terminate session.' });
    }
  }
}
