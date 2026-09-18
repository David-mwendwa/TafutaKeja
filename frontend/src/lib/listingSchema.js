import { site, canonicalUrl } from '../data/site.js';
import { imageUrl } from './images.js';

/**
 * Structured data for a property page.
 *
 * Listing pages are this site's SEO payload, the way job adverts are
 * Talentifyx's and tours are TaliiKE's — so they carry schema.org markup and
 * are deliberately left indexable.
 *
 * The rule that matters is when NOT to emit it. A property that has been let or
 * sold keeps its page, because the link is already out there and a dead URL is
 * worse than an honest one, but it must stop advertising itself: no structured
 * data, an explicit noindex, and a notice to the reader. Emitting an Offer for
 * something nobody can buy is the property equivalent of advertising a rating
 * nobody gave.
 */

// schema.org has specific types for most of what gets listed here. Falling back
// to the generic Accommodation is better than claiming a maisonette is a
// SingleFamilyResidence when it may be one of four in a block.
const SCHEMA_TYPE = {
  apartment: 'Apartment',
  penthouse: 'Apartment',
  studio: 'Apartment',
  bedsitter: 'Apartment',
  house: 'SingleFamilyResidence',
  bungalow: 'SingleFamilyResidence',
  villa: 'SingleFamilyResidence',
  maisonette: 'House',
  townhouse: 'House',
  land: 'Place',
  commercial: 'Place',
};

export const listingIsIndexable = (listing) => listing?.status === 'published';

export const listingSchema = (listing) => {
  // Not merely omitted from the page — callers use the null to decide the robots
  // tag too, so the two can never disagree.
  if (!listing || !listingIsIndexable(listing)) return null;

  const url = canonicalUrl(`/listing/${listing.slug}`);
  const accommodationType = SCHEMA_TYPE[listing.propertyType] || 'Accommodation';

  const accommodation = {
    '@type': accommodationType,
    name: listing.title,
    description: listing.description?.slice(0, 400),
    ...(listing.images?.length
      ? { photo: listing.images.slice(0, 6).map((i) => imageUrl(i.url)) }
      : {}),
    address: {
      '@type': 'PostalAddress',
      addressLocality: listing.location?.area,
      addressRegion: listing.location?.county,
      addressCountry: 'KE',
    },
    ...(listing.location?.geo?.coordinates?.length === 2
      ? {
          geo: {
            '@type': 'GeoCoordinates',
            longitude: listing.location.geo.coordinates[0],
            latitude: listing.location.geo.coordinates[1],
          },
        }
      : {}),
    // Only stated when the property actually has them. Land and commercial
    // units have neither, and claiming "0 bedrooms" reads as a data error.
    ...(listing.bedrooms != null ? { numberOfBedrooms: listing.bedrooms } : {}),
    ...(listing.bathrooms != null ? { numberOfBathroomsTotal: listing.bathrooms } : {}),
    ...(listing.sizeSqm
      ? {
          floorSize: {
            '@type': 'QuantitativeValue',
            value: listing.sizeSqm,
            unitCode: 'MTK',
          },
        }
      : {}),
    ...(listing.amenities?.length
      ? {
          amenityFeature: listing.amenities.map((name) => ({
            '@type': 'LocationFeatureSpecification',
            name,
            value: true,
          })),
        }
      : {}),
  };

  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    '@id': url,
    url,
    name: listing.title,
    description: listing.description?.slice(0, 400),
    datePosted: listing.publishedAt || listing.createdAt,
    about: accommodation,
    offers: {
      '@type': 'Offer',
      price: listing.price,
      priceCurrency: 'KES',
      availability: 'https://schema.org/InStock',
      url,
      // Rent is a recurring price, and an Offer that says "KES 95,000" without
      // saying "a month" is a materially different claim.
      ...(listing.purpose === 'rent'
        ? {
            priceSpecification: {
              '@type': 'UnitPriceSpecification',
              price: listing.price,
              priceCurrency: 'KES',
              unitCode: 'MON',
              billingDuration: 1,
            },
          }
        : {}),
      ...(listing.agent
        ? {
            seller: {
              '@type': listing.agent.agencyName ? 'RealEstateAgent' : 'Person',
              name: listing.agent.agencyName || listing.agent.name,
            },
          }
        : {}),
    },
  };
};

export const organisationSchema = () => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: site.name,
  url: `${site.url}/`,
  description: site.description,
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${site.url}/listings?search={query}` },
    'query-input': 'required name=query',
  },
});
