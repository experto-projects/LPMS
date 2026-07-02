import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import apiRouter from './src/backend/routes/api.ts';
import { BackgroundScheduler } from './src/backend/services/scheduler.ts';
import dotenv from 'dotenv';
import { makeHandler } from 'cloudflare-express';

dotenv.config();

const app = express();

// Standard middleware
app.use(express.json());

// API router endpoints
app.use('/api', apiRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Start background monitoring scheduler (only on Node.js/local server)
const isLocalNode = typeof process !== 'undefined' && process.release && process.release.name === 'node';
if (isLocalNode) {
  try {
    BackgroundScheduler.start();
  } catch (err) {
    console.error('Failed to start background scheduler:', err);
  }
}

// Integrate Vite dev server or static production server (only for local Node execution)
const setupStaticAssets = async () => {
  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
};

// Node.js direct execution listen
const isLocalListen = typeof process !== 'undefined' && (process.env.PORT !== undefined || !('LPMS_KV' in globalThis));
if (isLocalNode && isLocalListen) {
  setupStaticAssets().then(() => {
    const PORT = 3000;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }).catch((err) => {
    console.error('Failed to start Express assets/server:', err);
  });
}

// Cloudflare Workers fetch handler export
export default {
  async fetch(request: Request, env: any, ctx: any) {
    // 1. Map environment variables & KV bindings from Cloudflare env to global scopes
    globalThis.env = env;
    if (env) {
      for (const [key, value] of Object.entries(env)) {
        if (typeof value === 'string') {
          process.env[key] = value;
        } else {
          // Binding namespaces (like LPMS_KV) are objects
          (globalThis as any)[key] = value;
        }
      }
    }

    // 2. Delegate handling to the Express app via cloudflare-express adapter
    const handler = makeHandler(app);
    return handler(request, env, ctx);
  }
};

