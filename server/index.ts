const skipDb = process.env.SKIP_DB === 'true';

(async () => {
  try {
    if (!skipDb) {
      await initializeDatabase();
      await ensureDataPersistence();
    } else {
      log("⚠️ SKIP_DB is true — Skipping DB initialization.");
    }

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
      log(`🚀 ZenMindful app running on port ${port}`);
    });

  } catch (error) {
    console.error('💥 Failed to start server:', error);
    process.exit(1);
  }
})();


