import express from 'express';
import { env } from './config';
import routes from './routes';
import { connectDB } from './config/database';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import './models';
import { loadNseSymbols } from './providers/nseSymbol.provider';
const app = express();

app.use(express.json());
app.use('/api/v1', routes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

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
    console.error('Failed to start server:', error);
  }
}

startServer();