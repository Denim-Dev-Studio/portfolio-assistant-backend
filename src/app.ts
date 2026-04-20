import express from "express";
import swaggerUi from "swagger-ui-express";
import routes from "./routes";
import { swaggerSpec } from "./config/swagger";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware";
import { requestContext } from "./middlewares/requestContext.middleware";

export const createApp = () => {
  const app = express();

  app.use(requestContext);
  app.use(express.json({ limit: "1mb" }));
  app.use("/api/v1", routes);
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
