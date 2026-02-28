import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { getDb } from './db/schema';
import signupRoutes from './routes/signup';
import authRoutes from './routes/auth';
import apiRoutes from './routes/api';
import adminRoutes from './routes/admin';

const app = express();
const PORT = parseInt(process.env.PORT || '3001');

// Middleware
app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text({ type: 'text/csv' }));

// API Routes
app.use(signupRoutes);
app.use(authRoutes);
app.use(apiRoutes);
app.use(adminRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend in production
const frontendDist = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));
app.get('*', (req, res, next) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith('/ta/') || req.path.startsWith('/api/')) {
    return next();
  }
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// Initialize DB on startup
getDb();

app.listen(PORT, () => {
  console.log(`🚀 HCMNotify Sandbox running on port ${PORT}`);
});

export default app;
