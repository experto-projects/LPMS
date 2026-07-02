import express from "express";
import path from "path";
import cors from "cors";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import apiRouter from "./routes/api.ts";
import { BackgroundScheduler } from "./services/scheduler.ts";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Start background monitoring scheduler
  BackgroundScheduler.start();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // REST API routes
  app.use("/api", apiRouter);

  // Dynamic path resolution for frontend assets
  const rootDir = process.cwd();
  let frontendPath = path.resolve(rootDir, "frontend");
  
  if (!fs.existsSync(frontendPath)) {
    frontendPath = path.resolve(rootDir, "../frontend");
  }
  if (!fs.existsSync(frontendPath)) {
    frontendPath = rootDir;
  }

  // Setup static serving / SPA integration depending on environment
  if (process.env.NODE_ENV !== "production") {
    console.log(`Development Mode: Mounting Vite middleware relative to: ${frontendPath}`);
    const vite = await createViteServer({
      root: frontendPath,
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    let distPath = path.resolve(frontendPath, "dist");
    if (!fs.existsSync(distPath)) {
      distPath = path.resolve(rootDir, "dist");
    }
    
    console.log(`Production Mode: Serving static compiled assets from: ${distPath}`);
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Project LAMP Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start Project LAMP server:", error);
});
