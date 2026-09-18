import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import validator from 'validator';
import { ROLES } from '../constants/index.js';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please enter your name'],
      trim: true,
      minlength: [3, 'Your name must be at least 3 characters'],
      maxlength: [60, 'Your name cannot exceed 60 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please enter your email'],
      unique: true,
      lowercase: true,
      trim: true,
      validate: [validator.isEmail, 'Please enter a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Please enter a password'],
      minlength: [8, 'Your password must be at least 8 characters'],
      select: false,
    },
    phone: {
      type: String,
      trim: true,
      validate: {
        validator: (v) => !v || /^(?:\+254|0)[17]\d{8}$/.test(v),
        message: 'Please enter a valid Kenyan phone number',
      },
    },
    whatsapp: {
      type: String,
      trim: true,
      validate: {
        validator: (v) => !v || /^(?:\+254|0)[17]\d{8}$/.test(v),
        message: 'Please enter a valid Kenyan phone number',
      },
    },
    avatarUrl: { type: String, trim: true },
    role: { type: String, enum: ROLES, default: 'user' },

    // Agent profile. Only meaningful when role is 'agent', but kept flat rather
    // than in a nested object: a `default` on any field inside an optional
    // subdocument makes Mongoose instantiate the parent for every user.
    agencyName: { type: String, trim: true, maxlength: 80 },
    bio: { type: String, trim: true, maxlength: 600 },
    // Set by an admin only — it is a claim about the real world, so an agent
    // cannot award it to themselves.
    verified: { type: Boolean, default: false },
    // When the agent asked to be checked. Absent means they have not asked;
    // it is cleared once a moderator decides either way, so the admin list
    // shows outstanding requests rather than a permanent record of old ones.
    verificationRequestedAt: { type: Date },

    passwordResetToken: { type: String, select: false },
    passwordResetExpiresAt: { type: Date, select: false },
    passwordChangedAt: { type: Date, select: false },
    active: { type: Boolean, default: true, select: false },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        delete ret.password;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpiresAt;
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

userSchema.virtual('initials').get(function () {
  return this.name
    ?.split(' ')
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
});

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.pre('save', function () {
  if (!this.isModified('password') || this.isNew) return;
  // Backdated a second so a token issued moments later is not treated as stale.
  this.passwordChangedAt = Date.now() - 1000;
});

/*
 * A deactivated account is hidden, not deleted.
 *
 * The hook below applies that to anything built as a Query, which is most of
 * the app — but `countDocuments` and `aggregate` do not run it, so they have to
 * say so themselves. That gap is how the admin user list came to report more
 * people in its pagination than it could actually list.
 */
export const ACTIVE_ONLY = { active: { $ne: false } };

userSchema.pre(/^find/, function (next) {
  this.where(ACTIVE_ONLY);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.passwordChangedAfter = function (jwtIssuedAt) {
  if (!this.passwordChangedAt) return false;
  return jwtIssuedAt < Math.floor(this.passwordChangedAt.getTime() / 1000);
};

userSchema.methods.signJWT = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

userSchema.methods.generatePasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.passwordResetExpiresAt = Date.now() + 30 * 60 * 1000;
  return resetToken;
};

userSchema.statics.hashResetToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

export default mongoose.model('User', userSchema);
