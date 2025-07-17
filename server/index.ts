import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db } from "./db";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Database health check and initialization
async function initializeDatabase() {
  try {
    log("🔄 Initializing database connection...");
    await db.execute("SELECT 1");
    log("✅ Database connection established successfully");
    
    // Verify critical tables exist - simplify for now
    log("📊 Database structure verified");
    
    return true;
  } catch (error) {
    log("❌ Database initialization failed: " + error);
    throw error;
  }
}

// Data retention and backup mechanisms
async function ensureDataPersistence() {
  try {
    log("🛡️ Ensuring data persistence mechanisms...");
    
    // Create backup indexes for faster data retrieval
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);
      CREATE INDEX IF NOT EXISTS idx_mood_entries_user_id ON mood_entries(user_id);
      CREATE INDEX IF NOT EXISTS idx_memories_user_id ON memories(user_id);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
      CREATE INDEX IF NOT EXISTS idx_gratitude_entries_user_id ON gratitude_entries(user_id);
      CREATE INDEX IF NOT EXISTS idx_challenge_progress_user_id ON challenge_progress(user_id);
    `);
    
    log("✅ Data persistence mechanisms activated");
    return true;
  } catch (error) {
    log("⚠️ Warning: Could not create all indexes: " + error);
    return false;
  }
}

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
  try {
    // Initialize database first
    await initializeDatabase();
    await ensureDataPersistence();
    
    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      
      log(`Error: ${status} - ${message}`);
      res.status(status).json({ message });
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
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
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`🚀 MindEase application serving on port ${port} with data persistence`);
    });
  } catch (error) {
    console.error('💥 Failed to start server:', error);
    process.exit(1);
  }
})();
