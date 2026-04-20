import express from 'express';
import { env } from './config';
import routes from './routes';
import { connectDB } from './config/database';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import './models';
import { loadNseSymbols } from './providers/nseSymbol.provider';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import { requestContext } from './middlewares/requestContext.middleware';
const app = express();

app.use(requestContext);
app.use(express.json({ limit: '1mb' }));
app.use('/api/v1', routes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use(notFoundHandler);
app.use(errorHandler);

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