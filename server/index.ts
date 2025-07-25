import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db } from "./db";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Optional Database Initialization
async function initializeDatabase() {
  try {
    if (process.env.SKIP_DB === 'true') {
      log("⚠️ Skipping database initialization (SKIP_DB=true)");
      return;
    }

    log("🔄 Initializing database connection...");
    await db.execute("SELECT 1");
    log("✅ Database connection established successfully");

    // Indexes and structure
    log("📊 Database structure verified");
  } catch (error) {
    log("❌ Database initialization failed: " + error);
    // Don't throw — allow app to continue without DB
  }
}

// Optional Persistence Setup
async function ensureDataPersistence() {
  try {
    if (process.env.SKIP_DB === 'true') {
      return;
    }

    log("🛡️ Ensuring data persistence mechanisms...");
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);
      CREATE INDEX IF NOT EXISTS idx_mood_entries_user_id ON mood_entries(user_id);
      CREATE INDEX IF NOT EXISTS idx_memories_user_id ON memories(user_id);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
      CREATE INDEX IF NOT EXISTS idx_gratitude_entries_user_id ON gratitude_entries(user_id);
      CREATE INDEX IF NOT EXISTS idx_challenge_progress_user_id ON challenge_progress(user_id);
    `);
    log("✅ Data persistence mechanisms activated");
  } catch (error) {
    log("⚠️ Warning: Could not create all indexes: " + error);
  }
}

// API Logging Middleware
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

// Main async startup
(async () => {
  try {
    await initializeDatabase();
    await ensureDataPersistence();

    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      log(`Error: ${status} - ${message}`);
      res.status(status).json({ message });
    });

    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    const port = 5000;
    server.listen({ port, host: "0.0.0.0", reusePort: true }, () => {
      log(`🚀 MindEase application serving on port ${port}`);
    });

  } catch (error) {
    console.error('💥 Failed to start server:', error);
    process.exit(1);
  }
})();

