import mongoose from 'mongoose';
import { ENQUIRY_STATUSES } from '../constants/index.js';

const replySchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
  },
  { timestamps: true, _id: true }
);

const enquirySchema = new mongoose.Schema(
  {
    listing: { type: mongoose.Schema.ObjectId, ref: 'Listing', required: true, index: true },
    // Who asked. Enquiring requires an account: the thread has to be readable
    // from both sides afterwards, and a phone number typed into a box by an
    // anonymous visitor gives the agent nowhere to reply to.
    sender: { type: mongoose.Schema.ObjectId, ref: 'User', required: true, index: true },
    // Denormalised from the listing so an agent's inbox is one indexed query
    // rather than a lookup over every listing they own. Pinned at creation:
    // if a listing later changes hands, the existing conversation stays with
    // the agent who was actually part of it.
    agent: { type: mongoose.Schema.ObjectId, ref: 'User', required: true, index: true },

    message: {
      type: String,
      required: [true, 'Please write a message'],
      trim: true,
      minlength: [10, 'Your message must be at least 10 characters'],
      maxlength: [2000, 'Your message cannot exceed 2000 characters'],
    },
    phone: { type: String, trim: true },
    // An enquiry may propose a viewing. Storing the requested date does not
    // book anything — there is no calendar here, and pretending otherwise
    // would promise the reader a slot nobody has confirmed.
    viewingRequestedFor: Date,

    status: { type: String, enum: ENQUIRY_STATUSES, default: 'new', index: true },
    replies: { type: [replySchema], default: [] },
    readByAgent: { type: Boolean, default: false },
    readBySender: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform(doc, ret) { delete ret.__v; return ret; } },
    toObject: { virtuals: true },
  }
);

// One person pestering one listing is not a new conversation each time. The
// controller upserts onto the existing thread instead.
enquirySchema.index({ listing: 1, sender: 1 }, { unique: true });
enquirySchema.index({ agent: 1, status: 1, updatedAt: -1 });

enquirySchema.virtual('lastMessageAt').get(function () {
  const last = this.replies?.[this.replies.length - 1];
  return last?.createdAt || this.createdAt;
});

export default mongoose.model('Enquiry', enquirySchema);
