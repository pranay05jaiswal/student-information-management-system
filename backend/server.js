import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { connectDatabase } from './config/database.js';
import { seedDefaultDepartments } from './controllers/departmentController.js';
import studentRoutes from './routes/studentRoutes.js';
import departmentRoutes from './routes/departmentRoutes.js';
import dns from 'node:dns';
dns.setServers(['1.1.1.1', '8.8.8.8']);

const app = express();
const port = Number(process.env.PORT) || 5000;
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return callback(null, true);
    // Allow vercel preview domains or wildcards
    const isAllowed = allowedOrigins.some((allowed) => {
      if (allowed === origin) return true;
      if (allowed.startsWith('*.')) {
        const domain = allowed.slice(2);
        return origin.endsWith(`.${domain}`) || origin === `https://${domain}` || origin === `http://${domain}`;
      }
      if (origin.endsWith('.vercel.app')) return true;
      return false;
    });
    if (isAllowed) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS.'));
  }
}));
app.use(express.json({ limit: '20kb' }));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false }));

app.get('/health', (_request, response) => {
  response.json({ success: true, status: 'ok' });
});
app.use('/api/students', studentRoutes);
app.use('/api/departments', departmentRoutes);
app.use((_request, response) => {
  response.status(404).json({ success: false, message: 'The requested resource was not found.' });
});
app.use((error, _request, response, _next) => {
  if (error.message === 'Origin is not allowed by CORS.') {
    return response.status(403).json({ success: false, message: 'This website is not allowed to access the API.' });
  }
  if (error instanceof SyntaxError && 'body' in error) {
    return response.status(400).json({ success: false, message: 'Request body must be valid JSON.' });
  }
  if (error.type === 'entity.too.large') {
    return response.status(413).json({ success: false, message: 'Request body is too large.' });
  }
  console.error('Unhandled API error:', error);
  return response.status(500).json({ success: false, message: 'An unexpected server error occurred.' });
});

async function start() {
  app.listen(port, () => console.log(`Student API listening on port ${port}`));
  connectDatabase()
    .then(() => seedDefaultDepartments())
    .catch((error) => {
      console.error('MongoDB Atlas connection warning:', error.message);
    });
}

let dbPromise = null;
async function ensureDb() {
  if (!dbPromise) {
    dbPromise = connectDatabase().then(() => seedDefaultDepartments());
  }
  return dbPromise;
}

if (process.env.VERCEL) {
  app.use(async (_req, _res, next) => {
    try {
      await ensureDb();
      next();
    } catch (err) {
      next(err);
    }
  });
} else {
  start().catch((error) => {
    console.error('Unable to start the student API:', error.message);
    process.exitCode = 1;
  });
}

export default app;
