import mongoose from 'mongoose';
import slugify from 'slugify';
import {
  PURPOSES,
  PROPERTY_TYPES,
  ROOMLESS_TYPES,
  AMENITIES,
  FURNISHING,
  RENT_PERIODS,
  LISTING_STATUSES,
  LISTING_TRANSITIONS,
  OFF_MARKET_STATUSES,
  LISTING_STALE_DAYS,
} from '../constants/index.js';

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    alt: { type: String, trim: true, maxlength: 160 },
    width: Number,
    height: Number,
  },
  { _id: false }
);

const listingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please give the property a title'],
      trim: true,
      minlength: [10, 'The title must be at least 10 characters'],
      maxlength: [120, 'The title cannot exceed 120 characters'],
    },
    slug: { type: String, unique: true, index: true },
    description: {
      type: String,
      required: [true, 'Please describe the property'],
      trim: true,
      minlength: [40, 'The description must be at least 40 characters'],
      maxlength: [4000, 'The description cannot exceed 4000 characters'],
    },

    purpose: {
      type: String,
      enum: { values: PURPOSES, message: 'A listing is either to rent or for sale' },
      required: true,
      index: true,
    },
    propertyType: {
      type: String,
      enum: { values: PROPERTY_TYPES, message: '{VALUE} is not a property type we list' },
      required: true,
      index: true,
    },

    price: {
      type: Number,
      required: [true, 'Please set a price'],
      min: [1, 'The price must be greater than zero'],
    },
    // Only meaningful when purpose is 'rent'. Left unset on sales rather than
    // defaulted, so a stray "per month" can never appear on a sale price.
    rentPeriod: { type: String, enum: RENT_PERIODS },
    serviceCharge: { type: Number, min: 0 },
    depositMonths: { type: Number, min: 0, max: 12 },
    negotiable: { type: Boolean, default: false },

    bedrooms: { type: Number, min: 0, max: 20 },
    bathrooms: { type: Number, min: 0, max: 20 },
    parkingSpaces: { type: Number, min: 0, max: 20, default: 0 },
    // Square metres. Kenyan listings quote acres for land and square feet for
    // built space; both are converted to m2 on the way in so that a size filter
    // compares like with like.
    sizeSqm: { type: Number, min: 1 },

    furnishing: { type: String, enum: FURNISHING, default: 'unfurnished' },
    amenities: {
      type: [String],
      validate: {
        validator: (list) => list.every((a) => AMENITIES.includes(a)),
        message: 'One or more amenities are not on the supported list',
      },
      default: [],
    },

    location: {
      county: { type: String, required: [true, 'Please choose a county'], trim: true, index: true },
      // The estate or neighbourhood — "Kilimani", "Nyali", "Milimani". This is
      // what people actually search by, far more than the county.
      area: { type: String, required: [true, 'Please name the area'], trim: true, index: true },
      address: { type: String, trim: true, maxlength: 200 },
      geo: {
        // No `default: 'Point'` here, deliberately. A default on any field
        // inside an optional subdocument makes Mongoose instantiate the parent
        // for every document, which would hand the 2dsphere index a `geo` with
        // a type and no coordinates — invalid, and it rejects the whole save.
        type: { type: String, enum: ['Point'] },
        coordinates: {
          type: [Number],
          validate: {
            validator: (c) =>
              !c ||
              c.length === 0 ||
              (c.length === 2 &&
                c[0] >= -180 && c[0] <= 180 &&
                c[1] >= -90 && c[1] <= 90),
            message: 'Coordinates must be [longitude, latitude]',
          },
        },
      },
    },

    images: {
      type: [imageSchema],
      validate: {
        validator: (list) => list.length <= 12,
        message: 'A listing can carry at most 12 photographs',
      },
      default: [],
    },

    agent: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: LISTING_STATUSES,
      default: 'draft',
      index: true,
    },
    featured: { type: Boolean, default: false },
    availableFrom: Date,

    // Set every time the listing enters 'published'. Used for ordering and for
    // the staleness notice — distinct from createdAt, which never moves.
    publishedAt: Date,
    moderation: {
      reviewedBy: { type: mongoose.Schema.ObjectId, ref: 'User' },
      reviewedAt: Date,
      reason: { type: String, trim: true, maxlength: 300 },
    },

    views: { type: Number, default: 0 },
    enquiryCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, transform(doc, ret) { delete ret.__v; return ret; } },
    toObject: { virtuals: true },
  }
);

/* Indexes -------------------------------------------------------------------
 * The browse page filters on purpose + status and sorts by publishedAt, which
 * is one compound index rather than three single-field ones. The text index
 * backs the search box; the 2dsphere backs "properties near here".            */
listingSchema.index({ status: 1, purpose: 1, publishedAt: -1 });
listingSchema.index({ status: 1, 'location.area': 1, price: 1 });
listingSchema.index({ title: 'text', description: 'text', 'location.area': 'text' });
listingSchema.index({ 'location.geo': '2dsphere' });

listingSchema.virtual('isOffMarket').get(function () {
  return OFF_MARKET_STATUSES.includes(this.status);
});

// A published listing nobody has touched in six months. Not hidden — shown with
// a "last confirmed" note, because quietly implying it is current is the worse
// failure in a market where listings routinely outlive the property.
listingSchema.virtual('isStale').get(function () {
  const since = this.publishedAt || this.createdAt;
  if (this.status !== 'published' || !since) return false;
  return Date.now() - since.getTime() > LISTING_STALE_DAYS * 24 * 60 * 60 * 1000;
});

// Only a live listing should ever reach a search engine's index.
listingSchema.virtual('indexable').get(function () {
  return this.status === 'published';
});

listingSchema.methods.canTransitionTo = function (next) {
  return (LISTING_TRANSITIONS[this.status] || []).includes(next);
};

// Land and commercial space have no bedrooms; everything else must declare
// them, or the filters silently drop the listing out of every bedroom search.
listingSchema.pre('validate', function () {
  if (!ROOMLESS_TYPES.includes(this.propertyType)) {
    if (this.bedrooms == null)
      this.invalidate('bedrooms', 'Please say how many bedrooms the property has');
    if (this.bathrooms == null)
      this.invalidate('bathrooms', 'Please say how many bathrooms the property has');
  }
  if (this.purpose === 'rent' && !this.rentPeriod) this.rentPeriod = 'month';
  if (this.purpose === 'sale') {
    this.rentPeriod = undefined;
    this.depositMonths = undefined;
  }

  // Drop a half-formed geo rather than letting the 2dsphere index reject the
  // whole save. A listing without coordinates is fine; it just will not appear
  // in a map search until someone places it.
  const coords = this.location?.geo?.coordinates;
  if (!coords || coords.length !== 2) {
    if (this.location?.geo) this.location.geo = undefined;
  } else if (!this.location.geo.type) {
    this.location.geo.type = 'Point';
  }
});

listingSchema.pre('save', function () {
  if (this.isModified('title') || !this.slug) {
    // The area is appended only when the title does not already name it.
    // Almost every title does ("3 bedroom apartment to let in Kilimani"), and
    // appending regardless produced slugs like
    // `...-to-let-in-kamakwa-nyeri-kamakwa-nyeri-dbaf13`.
    const titleSlug = slugify(this.title, { lower: true, strict: true });
    const areaSlug = slugify(this.location?.area || '', { lower: true, strict: true });
    const base = (
      areaSlug && !titleSlug.includes(areaSlug) ? `${titleSlug}-${areaSlug}` : titleSlug
    ).slice(0, 80);
    // A six-character suffix rather than a uniqueness loop: two agents listing
    // "3 bedroom apartment in Kilimani" is the normal case here, not an edge one.
    const suffix = this._id.toString().slice(-6);
    this.slug = `${base}-${suffix}`;
  }

  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
});

export default mongoose.model('Listing', listingSchema);
