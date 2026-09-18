import mongoose from 'mongoose';

/**
 * Saved properties, as their own collection rather than an array on the user.
 *
 * An array would be simpler to read but wrong in two ways that matter here: it
 * grows without bound on a document loaded on every authenticated request, and
 * it has no natural place to record *when* something was saved — which is the
 * order the saved list is read in.
 */
const savedListingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.ObjectId, ref: 'User', required: true },
    listing: { type: mongoose.Schema.ObjectId, ref: 'Listing', required: true },
    // A private note the saver writes to themselves — "ask about the DSQ",
    // "viewing on Saturday". Never shown to the agent.
    note: { type: String, trim: true, maxlength: 300 },
  },
  { timestamps: true }
);

// Saving twice is a no-op, not a duplicate row; the unique index is what makes
// the toggle endpoint safe against a double-tap.
savedListingSchema.index({ user: 1, listing: 1 }, { unique: true });
savedListingSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model('SavedListing', savedListingSchema);
