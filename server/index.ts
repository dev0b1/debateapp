import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import router from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createServer } from "http";

// Set NODE_ENV if not already set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

// Check for required environment variables
const requiredEnvVars = [
  'LIVEKIT_URL',
  'LIVEKIT_API_KEY', 
  'LIVEKIT_API_SECRET',
  'DEEPGRAM_API_KEY',
  'OPENROUTER_API_KEY'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.warn('⚠️  Missing required environment variables:');
  missingVars.forEach(varName => console.warn(`   - ${varName}`));
  console.warn('\n📝 Please create a .env file with these variables. See SETUP.md for details.');
  console.warn('🚀 The app will still start, but some features may not work properly.\n');
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Create HTTP server
  const server = createServer(app);
  
  // Apply routes
  app.use(router);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    console.error('Server error:', err);
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "localhost",
  }, () => {
    log(`🚀 Confidence Compass server running on port ${port}`);
    log(`📱 Open http://localhost:${port} in your browser`);
    log(`🌍 Environment: ${process.env.NODE_ENV}`);
    
    if (missingVars.length > 0) {
      log(`⚠️  Some features may not work - missing ${missingVars.length} environment variables`);
    } else {
      log(`✅ All required environment variables are configured`);
    }
  });
})();
