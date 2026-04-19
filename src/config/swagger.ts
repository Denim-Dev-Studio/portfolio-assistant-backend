import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Portfolio Assistant API',
      version: '1.0.0',
      description: 'API documentation for Portfolio Monitoring Chat App',
    },
    servers: [
      {
        url: 'http://localhost:5050/api/v1',
      },
    ],
  },
  apis: ['src/routes/*.ts'], // where swagger docs will live
};

export const swaggerSpec = swaggerJsdoc(options);