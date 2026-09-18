import 'express-async-errors';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import hpp from 'hpp';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';

import sanitizeBody from './middleware/sanitizeBody.js';
import notFound from './middleware/notFound.js';
import errorHandler from './middleware/errorHandler.js';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import listingRoutes from './routes/listingRoutes.js';
import enquiryRoutes from './routes/enquiryRoutes.js';
import savedRoutes from './routes/savedRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';

const app = express();
app.set('trust proxy', 1);

// Ahead of anything that produces a body. A page of listings is mostly repeated
// keys and property prose — close to gzip's best case — and nothing renders
// until it lands.
app.use(compression());
app.use(helmet());

const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.PROD_FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Requests with no Origin header (curl, health checks) are let through.
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
  })
);

if (!isProduction) app.use(morgan('dev'));

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(sanitizeBody);
// Repeated query keys are how the browse filters are expressed, so the ones
// that legitimately repeat are whitelisted rather than collapsed to a string.
app.use(hpp({ whitelist: ['propertyType', 'amenities', 'county', 'area'] }));

/*
 * The ceiling is per IP across the whole API, so a browser session driving the
 * app — every page load costs several calls — gets through it far faster than
 * a person does. Overridable for that reason, the same way the auth limiter is:
 * exhausting it makes every endpoint 429, `/health` included, and a test suite
 * then reports the API as not running when it is merely rate limited.
 * Production keeps the default.
 */
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX) || 600,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please slow down' },
  })
);

/*
 * Helmet's default Cross-Origin-Resource-Policy is same-origin, which would
 * silently stop the frontend — a different port in development, a different
 * host in production — from loading any of these photographs. Widened here
 * only, rather than by turning the protection off for the whole API.
 */
const crossOriginAssets = (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
};

app.use(
  '/images',
  crossOriginAssets,
  express.static(path.join(__dirname, 'public/images'), { maxAge: '30d', immutable: true })
);
app.use(
  '/uploads',
  crossOriginAssets,
  express.static(path.join(__dirname, 'public/uploads'), { maxAge: '7d' })
);

app.get('/api/v1/health', (req, res) =>
  res.json({ success: true, service: 'tafutakeja-api', time: new Date().toISOString() })
);

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/listings', listingRoutes);
app.use('/api/v1/enquiries', enquiryRoutes);
app.use('/api/v1/saved', savedRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/uploads', uploadRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
