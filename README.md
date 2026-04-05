# Finance Dashboard Backend API

A production-quality REST API for a finance dashboard system with **role-based access control**, **financial records management**, and **analytics endpoints** built with **Node.js**, **Express.js**, and **MongoDB**.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB (via Mongoose) |
| Auth | JWT (jsonwebtoken) |
| Password Hashing | bcryptjs |
| Validation | express-validator |
| Security | helmet, cors |
| Logging | morgan |

---

## Project Structure

```
Expense-Tracker-Bakend/
├── src/
│   ├── config/
│   │   └── db.js                    # MongoDB connection
│   ├── models/
│   │   ├── User.js                  # User schema (role, status, bcrypt)
│   │   └── Transaction.js           # Financial record schema (soft delete)
│   ├── middleware/
│   │   ├── auth.js                  # JWT verification
│   │   ├── rbac.js                  # Role-based access control
│   │   ├── validate.js              # express-validator error handler
│   │   └── errorHandler.js         # Global error handler
│   ├── controllers/
│   │   ├── authController.js        # register, login
│   │   ├── userController.js        # user management
│   │   ├── transactionController.js # CRUD + filters
│   │   └── dashboardController.js   # analytics
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── transactionRoutes.js
│   │   └── dashboardRoutes.js
│   ├── utils/
│   │   ├── AppError.js              # Custom error class
│   │   └── catchAsync.js            # Async wrapper
│   └── app.js                       # Express app
├── server.js                        # Entry point
├── .env.example                     # Environment template
└── README.md
```

---

## Setup

### Prerequisites
- Node.js ≥ 18
- MongoDB running locally or a MongoDB Atlas URI

### 1. Clone and install
```bash
git clone <repo-url>
cd Expense-Tracker-Bakend
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```
Edit `.env`:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/finance-dashboard
JWT_SECRET=replace_with_a_strong_random_secret
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

### 3. Start the server
```bash
# Development (auto-restart)
npm run dev

# Production
npm start
```

Server will be available at `http://localhost:5000`.

---

## Roles & Permissions

| Action | Viewer | Analyst | Admin |
|---|:---:|:---:|:---:|
| View own profile | ✅ | ✅ | ✅ |
| View transactions | ❌ | ✅ | ✅ |
| View recent activity | ✅ | ✅ | ✅ |
| Create / update transactions | ❌ | ❌ | ✅ |
| Delete transactions (soft) | ❌ | ❌ | ✅ |
| View dashboard summary / trends | ✅ | ✅ | ✅ |
| Manage users (list/role/status) | ❌ | ❌ | ✅ |

---

## Special Features Added

1. API rate limiting with endpoint-specific throttling:
  - Global `/api` limiter to protect against burst traffic
  - Stricter limiter on `/api/auth/*` to reduce brute-force login attempts

2. Advanced transactions query capabilities:
  - Amount-range filtering via `minAmount` and `maxAmount`
  - Text search in notes via `search`
  - Dynamic sorting via `sortBy` (`date`, `amount`, `createdAt`) and `order` (`asc`, `desc`)

3. Swagger UI API docs:
  - Local: `http://localhost:5000/api-docs`
  - Deployed: set `API_BASE_URL` to your Render URL, then open `/api-docs`
  - OpenAPI JSON: `/api-docs.json`

---

## API Reference

All authenticated endpoints require:
```
Authorization: Bearer <your_jwt_token>
```

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register a new user |
| POST | `/api/auth/login` | Public | Login, returns JWT |

**Register body:**
```json
{
  "name": "Alice",
  "email": "alice@example.com",
  "password": "secret123",
  "role": "viewer"
}
```
> Note: Self-assigning `admin` role at registration is blocked; defaults to `viewer`.

**Login body:**
```json
{ "email": "alice@example.com", "password": "secret123" }
```

**Success response:**
```json
{
  "status": "success",
  "token": "<jwt>",
  "data": { "user": { ... } }
}
```

---

### Users

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/users/me` | Any role | Get own profile |
| GET | `/api/users` | Admin | List all users (paged) |
| GET | `/api/users/:id` | Admin | Get user by ID |
| PATCH | `/api/users/:id/role` | Admin | Change user role |
| PATCH | `/api/users/:id/status` | Admin | Activate / deactivate user |

**List users query params:** `?role=viewer&status=active&page=1&limit=20`

**Update role body:** `{ "role": "analyst" }`

**Update status body:** `{ "status": "inactive" }`

---

### Transactions

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/transactions` | Admin | Create a record |
| GET | `/api/transactions` | Analyst, Admin | List with filters & pagination |
| GET | `/api/transactions/:id` | Analyst, Admin | Get single record |
| PATCH | `/api/transactions/:id` | Admin | Update a record |
| DELETE | `/api/transactions/:id` | Admin | Soft-delete a record |

**Create / Update body:**
```json
{
  "amount": 1500.00,
  "type": "income",
  "category": "salary",
  "date": "2025-03-01",
  "notes": "March salary payment"
}
```

Amount values must be positive. Negative amounts are rejected by validation.

**Filter query params:**
```
?type=expense
?category=food
?startDate=2025-01-01&endDate=2025-03-31
?minAmount=100&maxAmount=1000
?search=salary
?sortBy=amount&order=asc
?page=2&limit=10
```

**Valid categories:**
`salary`, `freelance`, `investment`, `business`, `food`, `utilities`, `rent`, `transport`, `healthcare`, `education`, `entertainment`, `shopping`, `travel`, `insurance`, `savings`, `other`

---

### Dashboard

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/dashboard/summary` | Any role | Total income, expense, net balance + month-over-month comparison |
| GET | `/api/dashboard/categories` | Any role | Category-wise breakdown |
| GET | `/api/dashboard/trends` | Any role | Monthly income vs expense |
| GET | `/api/dashboard/trends/weekly` | Any role | Weekly income vs expense |
| GET | `/api/dashboard/recent` | Any role | Recent 10 transactions |

**Trends query param:** `?months=6` (1–24, default 12)

**Weekly trends query param:** `?weeks=8` (1–52, default 12)

**Recent query param:** `?limit=20` (max 50)

**Summary response example:**
```json
{
  "status": "success",
  "data": {
    "summary": {
      "totalIncome": 5000.00,
      "totalExpense": 2300.50,
      "netBalance": 2699.50,
      "incomeCount": 4,
      "expenseCount": 12
    },
    "comparison": {
      "currentMonth": { "income": 1200, "expense": 700, "netBalance": 500 },
      "previousMonth": { "income": 1000, "expense": 650, "netBalance": 350 },
      "percentageChange": {
        "income": 20,
        "expense": 7.69,
        "netBalance": 42.86
      }
    }
  }
}
```

---

## Error Handling

All errors follow a consistent shape:

```json
{
  "status": "fail",
  "message": "Human-readable error description",
  "errors": [
    { "field": "email", "message": "Please provide a valid email" }
  ]
}
```

| Status Code | Meaning |
|---|---|
| 400 | Bad request / invalid input |
| 401 | Unauthenticated (no or invalid token) |
| 403 | Forbidden (insufficient role or inactive account) |
| 404 | Resource not found |
| 409 | Conflict (e.g. duplicate email) |
| 422 | Validation failed |
| 500 | Internal server error |

---

## Key Design Decisions & Assumptions

1. **JWT Auth**: Stateless — token passed in `Authorization: Bearer` header. No refresh token for simplicity.
2. **Password security**: bcrypt with cost factor 12. Password is never returned in any response (`select: false`).
3. **Soft Delete**: Transactions are never hard-deleted. A Mongoose query middleware automatically excludes `isDeleted: true` records from all `find` operations.
4. **Role self-assignment**: Users cannot register as `admin`. Admin role must be assigned by an existing admin.
5. **Admin safety guards**: Admins cannot remove their own admin role or deactivate their own account.
6. **Inactive user blocking**: If an admin deactivates a user's account, subsequent API calls with that user's still-valid JWT will be rejected at the auth middleware level.
7. **MongoDB Aggregation**: Dashboard analytics use native MongoDB aggregation pipelines for efficient server-side computation.
8. **Indexes**: The Transaction model has compound indexes on `(user, date)`, `type`, `category`, and `date` for fast queries.
9. **Request size limit**: JSON body limited to 10kb to prevent abuse.
10. **Pagination**: All list endpoints support `page` and `limit` query params (max 100 per page).
