import crypto from 'crypto';
import { StatusCodes } from 'http-status-codes';
import User from '../models/userModel.js';
import { sendToken, clearToken } from '../utils/jwt.js';
import {
  BadRequestError,
  ConflictError,
  UnauthenticatedError,
} from '../errors/customErrors.js';

export const register = async (req, res) => {
  const { name, email, password, phone, role } = req.body;

  if (!name || !email || !password)
    throw new BadRequestError('Please provide your name, email and password');

  if (await User.findOne({ email: String(email).toLowerCase() }))
    throw new ConflictError('An account with that email already exists');

  // Signing up as an agent is allowed — it is how the marketplace fills up —
  // but `admin` is never self-assignable, and `verified` stays false until a
  // moderator says otherwise.
  const safeRole = role === 'agent' ? 'agent' : 'user';

  const user = await User.create({ name, email, password, phone, role: safeRole });
  sendToken(user, StatusCodes.CREATED, res);
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    throw new BadRequestError('Please provide your email and password');

  const user = await User.findOne({ email: String(email).toLowerCase() }).select(
    '+password'
  );

  // The same message for both branches, so the response cannot be used to
  // discover which email addresses have accounts.
  if (!user || !(await user.comparePassword(password)))
    throw new UnauthenticatedError('Incorrect email or password');

  sendToken(user, StatusCodes.OK, res);
};

export const logout = (req, res) => {
  clearToken(res);
  res.status(StatusCodes.OK).json({ success: true, message: 'Logged out' });
};

export const getMe = (req, res) =>
  res.status(StatusCodes.OK).json({ success: true, user: req.user });

export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) throw new BadRequestError('Please provide your email');

  const user = await User.findOne({ email: String(email).toLowerCase() });

  let resetToken;
  if (user) {
    resetToken = user.generatePasswordResetToken();
    await user.save({ validateBeforeSave: false });
  }

  // Always reports success, so the endpoint cannot be used to enumerate
  // accounts. There is no mail transport wired up on this project, so in
  // development the token is returned to make the flow demonstrable; in
  // production it is withheld and the reader is told to check their inbox.
  res.status(StatusCodes.OK).json({
    success: true,
    message: 'If that email has an account, a reset link is on its way',
    ...(process.env.NODE_ENV !== 'production' && resetToken ? { resetToken } : {}),
  });
};

export const resetPassword = async (req, res) => {
  const { password } = req.body;
  if (!password) throw new BadRequestError('Please choose a new password');

  const hashed = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashed,
    passwordResetExpiresAt: { $gt: Date.now() },
  }).select('+passwordResetToken +passwordResetExpiresAt');

  if (!user) throw new BadRequestError('That reset link is invalid or has expired');

  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpiresAt = undefined;
  await user.save();

  sendToken(user, StatusCodes.OK, res);
};

export const updatePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword)
    throw new BadRequestError('Please provide your current and new password');

  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword)))
    throw new UnauthenticatedError('Your current password is incorrect');

  user.password = newPassword;
  await user.save();

  // A new token: the old one was issued before passwordChangedAt moved, so
  // leaving it in place would log this session straight back out.
  sendToken(user, StatusCodes.OK, res);
};
