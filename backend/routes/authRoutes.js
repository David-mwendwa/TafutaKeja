import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  register, login, logout, getMe,
  forgotPassword, resetPassword, updatePassword,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

/*
 * Credential endpoints only. A shared limiter across the whole API would count
 * a reader browsing listings against someone trying passwords.
 *
 * The ceiling is an env var so the test suite can raise it locally. It signs in
 * as four accounts and deliberately fails two logins, and re-running it inside
 * one window otherwise trips the limiter and reports twelve failures that are
 * all 429s — a suite that can only be run once every fifteen minutes. The
 * default is unchanged, so production is unaffected.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again in a few minutes.' },
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/logout', logout);
router.get('/me', protect, getMe);
router.post('/forgot-password', authLimiter, forgotPassword);
router.patch('/reset-password/:token', authLimiter, resetPassword);
router.patch('/update-password', protect, updatePassword);

export default router;
