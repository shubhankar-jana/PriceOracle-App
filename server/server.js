const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const connectDB = require('./config/db');
const config = require('./config/env');

// Import cron jobs
const priceUpdater = require('./jobs/priceUpdater');
const predictionRunner = require('./jobs/predictionRunner');
const alertChecker = require('./jobs/alertChecker');
const priceService = require('./services/priceService');

// ============================================================
// Create HTTP server & Socket.IO
// ============================================================
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Make io accessible from routes via app.get('io')
app.set('io', io);

// ============================================================
// Socket.IO Connection Handling
// ============================================================
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  // Join room for a specific asset (for real-time updates)
  socket.on('joinAsset', (symbol) => {
    if (symbol && typeof symbol === 'string') {
      socket.join(symbol.toUpperCase());
      console.log(`[Socket.IO] ${socket.id} joined room: ${symbol.toUpperCase()}`);
    }
  });

  // Leave room for a specific asset
  socket.on('leaveAsset', (symbol) => {
    if (symbol && typeof symbol === 'string') {
      socket.leave(symbol.toUpperCase());
      console.log(`[Socket.IO] ${socket.id} left room: ${symbol.toUpperCase()}`);
    }
  });

  // Join user-specific room (for alerts)
  socket.on('joinUser', (userId) => {
    if (userId) {
      socket.join(`user:${userId}`);
      console.log(`[Socket.IO] ${socket.id} joined user room: ${userId}`);
    }
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id} (${reason})`);
  });
});

// ============================================================
// Start Server
// ============================================================
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Sync assets from ML API on startup (ensures name + category are populated)
    console.log('[Server] Syncing assets from ML API...');
    try {
      const syncResult = await priceService.syncAssets();
      console.log(`[Server] Asset sync complete. Created: ${syncResult.created || 0}`);
      // Immediately fetch latest prices so data is fresh on first page load
      await priceService.updatePrices();
      console.log('[Server] Initial price fetch complete.');
    } catch (syncErr) {
      console.warn('[Server] Initial sync failed (ML API may be offline):', syncErr.message);
    }

    // Initialize cron jobs
    priceUpdater.init(io);

    // Run prediction runner in background so it doesn't block server startup
    predictionRunner.init(io).catch(err => {
      console.warn('[Server] Prediction runner init warning:', err?.message || err);
    });

    alertChecker.init(io);

    // Start listening
    server.listen(config.PORT, () => {
      console.log('\n' + '='.repeat(60));
      console.log('  🔮 PriceOracle API Server');
      console.log('='.repeat(60));
      console.log(`  Environment : ${process.env.NODE_ENV || 'development'}`);
      console.log(`  Port        : ${config.PORT}`);
      console.log(`  ML API      : ${config.ML_API_URL}`);
      console.log(`  Socket.IO   : Enabled`);
      console.log('='.repeat(60) + '\n');
    });
  } catch (error) {
    console.error('[Server] Failed to start:', error.message);
    process.exit(1);
  }
};

// ============================================================
// Graceful Shutdown
// ============================================================
const gracefulShutdown = (signal) => {
  console.log(`\n[Server] ${signal} received. Shutting down gracefully...`);

  server.close(() => {
    console.log('[Server] HTTP server closed');

    // Close Socket.IO
    io.close(() => {
      console.log('[Server] Socket.IO closed');
    });

    // Close MongoDB connection
    const mongoose = require('mongoose');
    mongoose.connection.close(false, () => {
      console.log('[Server] MongoDB connection closed');
      process.exit(0);
    });
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('[Server] Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Server] Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('[Server] Uncaught Exception:', error.message);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Start the server
startServer();
