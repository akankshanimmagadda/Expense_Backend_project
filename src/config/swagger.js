const swaggerJsdoc = require('swagger-jsdoc');

const serverUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Finance Dashboard Backend API',
    version: '1.0.0',
    description: 'REST API documentation for the finance dashboard backend. Authentication uses JWT bearer tokens. Viewer is dashboard-only, analyst can read records and insights, and admin manages all records and users.',
  },
  servers: [
    {
      url: serverUrl,
      description: 'Primary API server',
    },
  ],
  tags: [
    { name: 'Health', description: 'Service health' },
    { name: 'Auth', description: 'Authentication and registration' },
    { name: 'Users', description: 'User profile and admin management' },
    { name: 'Transactions', description: 'Financial record management' },
    { name: 'Dashboard', description: 'Analytics and summary endpoints' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'fail' },
          message: { type: 'string', example: 'Validation failed' },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string', example: 'amount' },
                message: { type: 'string', example: 'Amount must be a number greater than 0' },
              },
            },
          },
        },
      },
      HealthResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'success' },
          message: { type: 'string', example: 'Finance Dashboard API is running 🚀' },
          version: { type: 'string', example: '1.0.0' },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      User: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '665f6a9b8a2f4c0012345677' },
          name: { type: 'string', example: 'Alice' },
          email: { type: 'string', example: 'alice@example.com' },
          role: { type: 'string', enum: ['viewer', 'analyst', 'admin'], example: 'viewer' },
          status: { type: 'string', enum: ['active', 'inactive'], example: 'active' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'success' },
          token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          data: {
            type: 'object',
            properties: {
              user: { $ref: '#/components/schemas/User' },
            },
          },
        },
      },
      Transaction: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '665f6a9b8a2f4c0012345678' },
          user: { type: 'string', example: '665f6a9b8a2f4c0012345677' },
          amount: { type: 'number', example: 1500 },
          type: { type: 'string', enum: ['income', 'expense'], example: 'income' },
          category: { type: 'string', example: 'salary' },
          date: { type: 'string', format: 'date-time', example: '2026-04-05T12:00:00.000Z' },
          notes: { type: 'string', example: 'March salary payment' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      TransactionListResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'success' },
          results: { type: 'integer', example: 1 },
          pagination: {
            type: 'object',
            properties: {
              total: { type: 'integer', example: 10 },
              page: { type: 'integer', example: 1 },
              limit: { type: 'integer', example: 20 },
              pages: { type: 'integer', example: 1 },
            },
          },
          data: {
            type: 'object',
            properties: {
              transactions: {
                type: 'array',
                items: { $ref: '#/components/schemas/Transaction' },
              },
            },
          },
        },
      },
      SummaryResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'success' },
          data: {
            type: 'object',
            properties: {
              summary: {
                type: 'object',
                properties: {
                  totalIncome: { type: 'number', example: 5000 },
                  totalExpense: { type: 'number', example: 2300.5 },
                  netBalance: { type: 'number', example: 2699.5 },
                  incomeCount: { type: 'integer', example: 4 },
                  expenseCount: { type: 'integer', example: 12 },
                },
              },
              comparison: {
                type: 'object',
                properties: {
                  currentMonth: {
                    type: 'object',
                    properties: {
                      income: { type: 'number', example: 1200 },
                      expense: { type: 'number', example: 700 },
                      netBalance: { type: 'number', example: 500 },
                    },
                  },
                  previousMonth: {
                    type: 'object',
                    properties: {
                      income: { type: 'number', example: 1000 },
                      expense: { type: 'number', example: 650 },
                      netBalance: { type: 'number', example: 350 },
                    },
                  },
                  percentageChange: {
                    type: 'object',
                    properties: {
                      income: { type: 'number', example: 20 },
                      expense: { type: 'number', example: 7.69 },
                      netBalance: { type: 'number', example: 42.86 },
                    },
                  },
                },
              },
            },
          },
        },
      },
      CategoryBreakdownResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'success' },
          data: {
            type: 'object',
            properties: {
              categories: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    category: { type: 'string', example: 'food' },
                    categoryTotal: { type: 'number', example: 250 },
                    breakdown: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          type: { type: 'string', example: 'expense' },
                          total: { type: 'number', example: 250 },
                          count: { type: 'integer', example: 3 },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      TrendResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'success' },
          data: {
            type: 'object',
            properties: {
              trends: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    year: { type: 'integer', example: 2026 },
                    month: { type: 'integer', example: 4 },
                    label: { type: 'string', example: '2026-04' },
                    entries: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          type: { type: 'string', example: 'income' },
                          total: { type: 'number', example: 1200 },
                          count: { type: 'integer', example: 2 },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      WeeklyTrendResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'success' },
          data: {
            type: 'object',
            properties: {
              trends: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    year: { type: 'integer', example: 2026 },
                    week: { type: 'integer', example: 14 },
                    label: { type: 'string', example: '2026-W14' },
                    entries: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          type: { type: 'string', example: 'expense' },
                          total: { type: 'number', example: 300 },
                          count: { type: 'integer', example: 4 },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        security: [],
        responses: {
          200: {
            description: 'API is running',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' },
              },
            },
          },
        },
      },
    },
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', example: 'Alice' },
                  email: { type: 'string', example: 'alice@example.com' },
                  password: { type: 'string', example: 'secret123' },
                  role: { type: 'string', enum: ['viewer', 'analyst', 'admin'], example: 'viewer' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'User registered successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' },
              },
            },
          },
          422: {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login and receive a JWT',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'alice@example.com' },
                  password: { type: 'string', example: 'secret123' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResponse' },
              },
            },
          },
          401: {
            description: 'Invalid credentials',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/users/me': {
      get: {
        tags: ['Users'],
        summary: 'Get the current user profile',
        responses: {
          200: {
            description: 'Current user profile returned',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    data: {
                      type: 'object',
                      properties: {
                        user: { $ref: '#/components/schemas/User' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: 'Not authenticated' },
        },
      },
    },
    '/api/users': {
      get: {
        tags: ['Users'],
        summary: 'List users (admin only)',
        responses: {
          200: { description: 'Users returned successfully' },
          401: { description: 'Not authenticated' },
          403: { description: 'Admin only' },
        },
      },
    },
    '/api/users/{id}': {
      get: {
        tags: ['Users'],
        summary: 'Get a user by ID (admin only)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'User returned successfully' },
          401: { description: 'Not authenticated' },
          403: { description: 'Admin only' },
          404: { description: 'User not found' },
        },
      },
    },
    '/api/users/{id}/role': {
      patch: {
        tags: ['Users'],
        summary: 'Update user role (admin only)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['role'],
                properties: {
                  role: { type: 'string', enum: ['viewer', 'analyst', 'admin'], example: 'analyst' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Role updated successfully' },
          400: { description: 'Invalid request' },
          401: { description: 'Not authenticated' },
          403: { description: 'Admin only' },
          404: { description: 'User not found' },
        },
      },
    },
    '/api/users/{id}/status': {
      patch: {
        tags: ['Users'],
        summary: 'Update user status (admin only)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['active', 'inactive'], example: 'inactive' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Status updated successfully' },
          400: { description: 'Invalid request' },
          401: { description: 'Not authenticated' },
          403: { description: 'Admin only' },
          404: { description: 'User not found' },
        },
      },
    },
    '/api/transactions': {
      get: {
        tags: ['Transactions'],
        summary: 'List transactions with filters and pagination',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', example: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', example: 20 } },
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['income', 'expense'] } },
          { name: 'category', in: 'query', schema: { type: 'string', example: 'food' } },
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date', example: '2026-01-01' } },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date', example: '2026-03-31' } },
          { name: 'minAmount', in: 'query', schema: { type: 'number', example: 100 } },
          { name: 'maxAmount', in: 'query', schema: { type: 'number', example: 1000 } },
          { name: 'search', in: 'query', schema: { type: 'string', example: 'salary' } },
          { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['date', 'amount', 'createdAt'], example: 'date' } },
          { name: 'order', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], example: 'desc' } },
        ],
        responses: {
          200: {
            description: 'Transactions returned successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TransactionListResponse' },
              },
            },
          },
          401: { description: 'Not authenticated' },
          403: { description: 'Analyst/Admin only' },
        },
      },
      post: {
        tags: ['Transactions'],
        summary: 'Create a transaction (admin only)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['amount', 'type', 'category'],
                properties: {
                  amount: { type: 'number', example: 1500 },
                  type: { type: 'string', enum: ['income', 'expense'], example: 'income' },
                  category: { type: 'string', example: 'salary' },
                  date: { type: 'string', format: 'date', example: '2026-04-05' },
                  notes: { type: 'string', example: 'March salary payment' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Transaction created successfully' },
          401: { description: 'Not authenticated' },
          403: { description: 'Admin only' },
          422: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/transactions/{id}': {
      get: {
        tags: ['Transactions'],
        summary: 'Get a transaction by ID',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'Transaction returned successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'success' },
                    data: { type: 'object', properties: { transaction: { $ref: '#/components/schemas/Transaction' } } },
                  },
                },
              },
            },
          },
          401: { description: 'Not authenticated' },
          403: { description: 'Analyst/Admin only' },
          404: { description: 'Transaction not found' },
        },
      },
      patch: {
        tags: ['Transactions'],
        summary: 'Update a transaction (admin only)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  amount: { type: 'number', example: 1200 },
                  type: { type: 'string', enum: ['income', 'expense'], example: 'expense' },
                  category: { type: 'string', example: 'food' },
                  date: { type: 'string', format: 'date', example: '2026-04-05' },
                  notes: { type: 'string', example: 'Updated note' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Transaction updated successfully' },
          401: { description: 'Not authenticated' },
          403: { description: 'Admin only' },
          404: { description: 'Transaction not found' },
          422: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      delete: {
        tags: ['Transactions'],
        summary: 'Soft delete a transaction (admin only)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Transaction soft-deleted successfully' },
          401: { description: 'Not authenticated' },
          403: { description: 'Admin only' },
          404: { description: 'Transaction not found' },
        },
      },
    },
    '/api/dashboard/summary': {
      get: {
        tags: ['Dashboard'],
        summary: 'Get summary metrics with month-over-month comparison',
        responses: {
          200: {
            description: 'Summary returned successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SummaryResponse' },
              },
            },
          },
          401: { description: 'Not authenticated' },
          403: { description: 'Forbidden' },
        },
      },
    },
    '/api/dashboard/categories': {
      get: {
        tags: ['Dashboard'],
        summary: 'Get category-wise totals',
        responses: {
          200: {
            description: 'Category breakdown returned successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CategoryBreakdownResponse' },
              },
            },
          },
        },
      },
    },
    '/api/dashboard/trends': {
      get: {
        tags: ['Dashboard'],
        summary: 'Get monthly trends',
        parameters: [{ name: 'months', in: 'query', schema: { type: 'integer', example: 12 } }],
        responses: {
          200: {
            description: 'Monthly trends returned successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TrendResponse' },
              },
            },
          },
        },
      },
    },
    '/api/dashboard/trends/weekly': {
      get: {
        tags: ['Dashboard'],
        summary: 'Get weekly trends',
        parameters: [{ name: 'weeks', in: 'query', schema: { type: 'integer', example: 12 } }],
        responses: {
          200: {
            description: 'Weekly trends returned successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/WeeklyTrendResponse' },
              },
            },
          },
        },
      },
    },
    '/api/dashboard/recent': {
      get: {
        tags: ['Dashboard'],
        summary: 'Get recent activity',
        parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer', example: 10 } }],
        responses: {
          200: { description: 'Recent activity returned successfully' },
        },
      },
    },
  },
};

module.exports = swaggerJsdoc({ swaggerDefinition, apis: [] });
