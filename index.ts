import dotenv from 'dotenv';
import path from 'path';

// Load environment variables immediately before other imports
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '../fundverse-client/.env.local') });

import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connectDB } from './config/db';
import { requestLogger } from './middleware/logger';

// Import routes
import userRoutes from './routes/user.routes';
import campaignRoutes from './routes/campaign.routes';
import contributionRoutes from './routes/contribution.routes';
import paymentRoutes from './routes/payment.routes';
import withdrawalRoutes from './routes/withdrawal.routes';
import notificationRoutes from './routes/notification.routes';
import reportRoutes from './routes/report.routes';
import statsRoutes from './routes/stats.routes';


const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

// Middlewares
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(requestLogger);



app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health Check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', message: 'FunVerse API is running smoothly.' });
});

// Register Routes
app.use('/api/users', userRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/contributions', contributionRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/withdrawals', withdrawalRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/stats', statsRoutes);

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'An unexpected error occurred.',
    error: process.env.NODE_ENV === 'development' ? err : {},
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
