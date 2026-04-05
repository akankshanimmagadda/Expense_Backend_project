const swaggerJsdoc = require('swagger-jsdoc');

const serverUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Finance Dashboard Backend API',
    version: '1.0.0',
    description: 'REST API documentation for the finance dashboard backend.',
  },
  servers: [
    {
      url: serverUrl,
      description: 'Primary API server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [{ bearerAuth: [] }],
};

const options = {
  swaggerDefinition,
  apis: [],
};

module.exports = swaggerJsdoc(options);
