import { env } from './config';
import { connectDB } from './config/database';
import './models';
import { loadNseSymbols } from './providers/nseSymbol.provider';
import { createApp } from './app';

const app = createApp();

const shutdown = (signal: string, error?: unknown) => {
  if (error) {
    console.error(`[startup] ${signal}`, error);
  } else {
    console.error(`[startup] ${signal}`);
  }

  process.exit(1);
};

async function startServer() {
  try {
    await connectDB();
    await loadNseSymbols();
    app.listen(env.port, () => {
      console.log(
        `Server running on port ${env.port} in ${env.nodeEnv} mode`
      );
    });
  } catch (error) {
    shutdown('Failed to start server', error);
  }
}

process.on('uncaughtException', (error) => {
  shutdown('uncaughtException', error);
});

process.on('unhandledRejection', (reason) => {
  shutdown('unhandledRejection', reason);
});

startServer();
