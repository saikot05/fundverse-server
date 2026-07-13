# ⚙️ FundVerse — Express API Engine (Backend)

[![Vercel Deployment](https://img.shields.io/badge/Vercel-Deployed-success?style=for-the-badge&logo=vercel)](https://fundverse-server.vercel.app)
[![Node Version](https://img.shields.io/badge/Node.js-20+-green?style=for-the-badge&logo=nodedotjs)](https://nodejs.org)
[![Express Version](https://img.shields.io/badge/Express-v5.0-lightgrey?style=for-the-badge&logo=express)](https://expressjs.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47a248?style=for-the-badge&logo=mongodb)](https://www.mongodb.com)

The backend API engine for FundVerse, a secure crowdfunding platform. This microservice is built using Node.js, Express, and TypeScript, featuring a structured architecture, database validation, role-based authorization, Stripe checkout sessions, and real-time user notification events.

🔗 **Live API Gateway URL**: [https://fundverse-server.vercel.app](https://fundverse-server.vercel.app)  
🔗 **Live Frontend URL**: [https://fundverse-client.vercel.app](https://fundverse-client.vercel.app)

---

## 🔌 API Route Registers & Specifications

### 1. General & public APIs
| Method | Endpoint | Description | Authorization |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Base route welcome message | Public |
| `GET` | `/health` | Server status and database health check | Public |
| `GET` | `/api/campaigns` | Get paginated campaigns with search, sort, and filters | Public |
| `GET` | `/api/campaigns/:id` | Fetch specific campaign details | Public |
| `GET` | `/api/stats` | Aggregated categories and pledge statistics | Public |

### 2. Supporter Services (Pledges & Payments)
| Method | Endpoint | Description | Authorization |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/contributions/my-contributions` | Get contributions made by the active user | Supporter Session |
| `POST` | `/api/payments/create-intent` | Initialize Stripe Payment Intent for credit pledge | Supporter Session |
| `POST` | `/api/payments/confirm` | Confirm payment success and register contributions | Supporter Session |

### 3. Creator Services (Campaign Management)
| Method | Endpoint | Description | Authorization |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/campaigns` | Add a new crowdfunding campaign | Creator Session |
| `PUT` | `/api/campaigns/:id` | Modify an existing campaign | Creator Session |
| `DELETE` | `/api/campaigns/:id` | Remove a campaign (confirmation modal required) | Creator Session |
| `POST` | `/api/withdrawals` | Submit milestone withdrawal request | Creator Session |

### 4. System Services (Notifications & Reports)
| Method | Endpoint | Description | Authorization |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/notifications` | Fetch reactive notification feeds | Active Session |
| `POST` | `/api/reports` | Submit abuse or fraud report against a campaign | Active Session |

---

## 📂 Core Folder Architecture

```text
fundverse-server/
├── api/                   # Vercel Serverless Function entry handler (api/index.ts)
├── config/                # Mongoose connection helpers
├── middleware/            # Security cors, loggers, and authentication gates
│   ├── auth.ts            # jose-cjs JWT token + Better Auth session cookies validator
│   └── logger.ts          # HTTP request logger
├── modules/               # Domain-specific MVC folders
│   ├── campaigns/         # Campaign model, routes, and controllers
│   ├── contributions/     # Contributions model and timeline log controllers
│   ├── payments/          # Payment schemas and Stripe handlers
│   ├── users/             # User profiles model and credit controls
│   └── notifications/     # Event notification schemas
├── routes/                # Unified route registers
├── utils/                 # Seed scripts and mock generators
├── vercel.json            # Vercel serverless function router configuration
└── tsconfig.json          # TypeScript compiler configurations
```

---

## ⚙️ Environment Variables Configuration

Create a `.env` file in the root folder:

| Variable Name | Description | Value Example |
| :--- | :--- | :--- |
| `PORT` | Local port listener | `5000` |
| `CLIENT_URL` | Frontend client origin (for CORS and sessions) | `https://fundverse-client.vercel.app` |
| `MONGO_URI` | The MongoDB Atlas connection string | `mongodb+srv://...` |
| `MONGODB_DB_NAME` | The target database name | `fundverse` |
| `STRIPE_SECRET_KEY` | Secret Key from Stripe API | `sk_test_...` |

---

## 📦 Local Installation & Run

1. Clone the repository:
   ```bash
   git clone https://github.com/saikot05/fundverse-server.git
   cd fundverse-server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the database seed script:
   ```bash
   npm run seed
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. The API will be active locally at [http://localhost:5000](http://localhost:5000).

---

## ☁️ Vercel Serverless Deployment (Production)

This backend runs as a serverless API function on Vercel:

1. Import the repository into Vercel.
2. Select **Other** as the Framework Preset (Vercel automatically reads `vercel.json`).
3. Add `MONGO_URI`, `STRIPE_SECRET_KEY`, and `CLIENT_URL` environment variables in Vercel settings.
4. Deploy the project.
5. Vercel will build `/api/index.ts` using `@vercel/node` and route all API calls to it.
