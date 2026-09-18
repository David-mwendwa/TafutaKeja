import { Suspense, lazy, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient, { errorMessage } from '../../api/apiClient.js';
import usePageMeta from '../../hooks/usePageMeta.js';
import ImageUploader from '../../components/agent/ImageUploader.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import { titleCase } from '../../lib/format.js';

const LocationPicker = lazy(() => import('../../components/agent/LocationPicker.jsx'));

// Kept in step with ROOMLESS_TYPES in the API's constants. A bedroom count on a
// plot of land is not merely odd — the server rejects the save.
const ROOMLESS = ['land', 'commercial'];

const EMPTY = {
  title: '', description: '', purpose: 'rent', propertyType: 'apartment',
  price: '', rentPeriod: 'month', serviceCharge: '', depositMonths: '',
  negotiable: false, bedrooms: '', bathrooms: '', parkingSpaces: '',
  size: '', sizeUnit: 'sqm', furnishing: 'unfurnished', amenities: [],
  county: 'Nairobi', area: '', address: '', availableFrom: '',
};

const Section = ({ title, children }) => (
  <section className="card space-y-4 p-6">
    <h2 className="font-heading text-lg font-bold">{title}</h2>
    {children}
  </section>
);

export const ListingForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(id);

  const [form, setForm] = useState(EMPTY);
  const [images, setImages] = useState([]);
  const [coordinates, setCoordinates] = useState(null);
  const [meta, setMeta] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(editing);
  const [state, setState] = useState({ busy: false, error: '' });

  usePageMeta({
    title: editing ? 'Edit listing' : 'Add a property',
    robots: 'noindex, follow',
  });

  useEffect(() => {
    apiClient.get('/listings/meta').then((d) => setMeta(d.meta)).catch(() => setMeta(null));
  }, []);

  useEffect(() => {
    if (!editing) return;
    apiClient
      .get(`/listings/${id}`)
      .then(({ listing }) => {
        setForm({
          ...EMPTY,
          ...listing,
          // The API takes `size` + `sizeUnit` and stores `sizeSqm`; the form
          // works in whichever unit was chosen, so it is converted back here.
          size: listing.sizeSqm || '',
          sizeUnit: 'sqm',
          county: listing.location?.county || 'Nairobi',
          area: listing.location?.area || '',
          address: listing.location?.address || '',
          availableFrom: listing.availableFrom?.slice(0, 10) || '',
          price: listing.price ?? '',
          bedrooms: listing.bedrooms ?? '',
          bathrooms: listing.bathrooms ?? '',
          parkingSpaces: listing.parkingSpaces ?? '',
          serviceCharge: listing.serviceCharge ?? '',
          depositMonths: listing.depositMonths ?? '',
        });
        setImages(listing.images || []);
        setCoordinates(listing.location?.geo?.coordinates || null);
        setStatus(listing.status);
      })
      .catch((err) => setState({ busy: false, error: errorMessage(err, 'Could not load that listing') }))
      .finally(() => setLoading(false));
  }, [editing, id]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const roomless = ROOMLESS.includes(form.propertyType);

  const toggleAmenity = (amenity) =>
    set({
      amenities: form.amenities.includes(amenity)
        ? form.amenities.filter((a) => a !== amenity)
        : [...form.amenities, amenity],
    });

  const submit = async (event) => {
    event.preventDefault();
    setState({ busy: true, error: '' });

    const payload = {
      title: form.title,
      description: form.description,
      purpose: form.purpose,
      propertyType: form.propertyType,
      price: Number(form.price),
      negotiable: form.negotiable,
      furnishing: form.furnishing,
      amenities: form.amenities,
      images,
      parkingSpaces: Number(form.parkingSpaces) || 0,
      ...(form.size ? { size: Number(form.size), sizeUnit: form.sizeUnit } : {}),
      ...(roomless
        ? {}
        : { bedrooms: Number(form.bedrooms), bathrooms: Number(form.bathrooms) }),
      ...(form.purpose === 'rent'
        ? {
            rentPeriod: form.rentPeriod,
            ...(form.serviceCharge ? { serviceCharge: Number(form.serviceCharge) } : {}),
            ...(form.depositMonths ? { depositMonths: Number(form.depositMonths) } : {}),
          }
        : {}),
      ...(form.availableFrom ? { availableFrom: form.availableFrom } : {}),
      location: {
        county: form.county,
        area: form.area,
        ...(form.address ? { address: form.address } : {}),
        // Sent only when a pin was actually placed. An empty geo object is what
        // trips the 2dsphere index and rejects the whole save.
        ...(coordinates?.length === 2
          ? { geo: { type: 'Point', coordinates } }
          : {}),
      },
    };

    try {
      if (editing) await apiClient.patch(`/listings/${id}`, payload);
      else await apiClient.post('/listings', payload);
      navigate('/agent');
    } catch (err) {
      setState({ busy: false, error: errorMessage(err, 'Could not save that listing') });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="container max-w-3xl py-10">
      <h1 className="font-heading text-3xl font-extrabold">
        {editing ? 'Edit listing' : 'Add a property'}
      </h1>

      {editing && status === 'published' ? (
        <Alert tone="info" className="mt-4">
          This listing is live. Saving changes sends it back for review. A moderator approved
          the version that is there now, not the one replacing it.
        </Alert>
      ) : null}

      <form onSubmit={submit} className="mt-6 space-y-5">
        <Alert>{state.error}</Alert>

        <Section title="The basics">
          <fieldset>
            <legend className="label">This property is</legend>
            <div className="flex gap-2">
              {[['rent', 'To let'], ['sale', 'For sale']].map(([value, label]) => (
                <button key={value} type="button" onClick={() => set({ purpose: value })}
                  aria-pressed={form.purpose === value}
                  className={`chip flex-1 justify-center py-2 ${form.purpose === value ? 'chip-active' : ''}`}>
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="propertyType" className="label">Property type</label>
            <select id="propertyType" className="field" value={form.propertyType}
              onChange={(e) => set({ propertyType: e.target.value })}>
              {(meta?.propertyTypes || []).map((t) => (
                <option key={t} value={t}>{titleCase(t)}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="title" className="label">Title</label>
            <input id="title" type="text" required minLength={10} maxLength={120}
              value={form.title} onChange={(e) => set({ title: e.target.value })}
              className="field" placeholder="3 bedroom apartment to let in Kilimani" />
          </div>

          <div>
            <label htmlFor="description" className="label">Description</label>
            <textarea id="description" required minLength={40} maxLength={4000} rows={7}
              value={form.description} onChange={(e) => set({ description: e.target.value })}
              className="field"
              placeholder="Describe the property: layout, light, the building, water and security, and what is nearby." />
            <p className="mt-1 text-xs text-dark-500">{form.description.length}/4000</p>
          </div>
        </Section>

        <Section title="Price">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="price" className="label">
                {form.purpose === 'rent' ? 'Rent (KES)' : 'Asking price (KES)'}
              </label>
              <input id="price" type="number" required min={1} value={form.price}
                onChange={(e) => set({ price: e.target.value })} className="field" />
            </div>
            {form.purpose === 'rent' ? (
              <div>
                <label htmlFor="rentPeriod" className="label">Per</label>
                <select id="rentPeriod" className="field" value={form.rentPeriod}
                  onChange={(e) => set({ rentPeriod: e.target.value })}>
                  {(meta?.rentPeriods || ['month']).map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>

          {form.purpose === 'rent' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="serviceCharge" className="label">
                  Service charge (KES/month) <span className="text-dark-400">optional</span>
                </label>
                <input id="serviceCharge" type="number" min={0} value={form.serviceCharge}
                  onChange={(e) => set({ serviceCharge: e.target.value })} className="field" />
              </div>
              <div>
                <label htmlFor="depositMonths" className="label">Deposit (months)</label>
                <input id="depositMonths" type="number" min={0} max={12} value={form.depositMonths}
                  onChange={(e) => set({ depositMonths: e.target.value })} className="field" />
              </div>
            </div>
          ) : null}

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.negotiable}
              onChange={(e) => set({ negotiable: e.target.checked })}
              className="rounded border-dark-300 text-primary-700 focus:ring-primary-500" />
            Price is negotiable
          </label>
        </Section>

        <Section title="Size and layout">
          {!roomless ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="bedrooms" className="label">Bedrooms</label>
                <input id="bedrooms" type="number" required min={0} max={20} value={form.bedrooms}
                  onChange={(e) => set({ bedrooms: e.target.value })} className="field" />
                <p className="mt-1 text-xs text-dark-500">0 for a bedsitter or studio.</p>
              </div>
              <div>
                <label htmlFor="bathrooms" className="label">Bathrooms</label>
                <input id="bathrooms" type="number" required min={0} max={20} value={form.bathrooms}
                  onChange={(e) => set({ bathrooms: e.target.value })} className="field" />
              </div>
              <div>
                <label htmlFor="parkingSpaces" className="label">Parking spaces</label>
                <input id="parkingSpaces" type="number" min={0} max={20} value={form.parkingSpaces}
                  onChange={(e) => set({ parkingSpaces: e.target.value })} className="field" />
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="size" className="label">Size <span className="text-dark-400">optional</span></label>
              <input id="size" type="number" min={1} value={form.size}
                onChange={(e) => set({ size: e.target.value })} className="field" />
            </div>
            <div>
              <label htmlFor="sizeUnit" className="label">Unit</label>
              <select id="sizeUnit" className="field" value={form.sizeUnit}
                onChange={(e) => set({ sizeUnit: e.target.value })}>
                <option value="sqm">Square metres</option>
                <option value="sqft">Square feet</option>
                <option value="acres">Acres</option>
              </select>
            </div>
          </div>

          {!roomless ? (
            <div>
              <label htmlFor="furnishing" className="label">Furnishing</label>
              <select id="furnishing" className="field" value={form.furnishing}
                onChange={(e) => set({ furnishing: e.target.value })}>
                {(meta?.furnishing || []).map((f) => (
                  <option key={f} value={f}>{titleCase(f)}</option>
                ))}
              </select>
            </div>
          ) : null}

          <div>
            <label htmlFor="availableFrom" className="label">
              Available from <span className="text-dark-400">optional</span>
            </label>
            <input id="availableFrom" type="date" value={form.availableFrom}
              onChange={(e) => set({ availableFrom: e.target.value })} className="field" />
          </div>
        </Section>

        <Section title="Where it is">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="county" className="label">County</label>
              <select id="county" className="field" value={form.county}
                onChange={(e) => set({ county: e.target.value })}>
                {(meta?.counties || []).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="area" className="label">Area or estate</label>
              <input id="area" type="text" required value={form.area}
                onChange={(e) => set({ area: e.target.value })} className="field"
                placeholder="Kilimani" />
              <p className="mt-1 text-xs text-dark-500">What people search by.</p>
            </div>
          </div>

          <div>
            <label htmlFor="address" className="label">
              Street or landmark <span className="text-dark-400">optional</span>
            </label>
            <input id="address" type="text" maxLength={200} value={form.address}
              onChange={(e) => set({ address: e.target.value })} className="field" />
          </div>

          <Suspense fallback={<div className="skeleton h-[300px] w-full rounded-xl" />}>
            <LocationPicker coordinates={coordinates} onChange={setCoordinates} />
          </Suspense>
        </Section>

        {!roomless ? (
          <Section title="Amenities">
            <div className="flex flex-wrap gap-2">
              {(meta?.amenities || []).map((amenity) => (
                <button key={amenity} type="button" onClick={() => toggleAmenity(amenity)}
                  aria-pressed={form.amenities.includes(amenity)}
                  className={`chip ${form.amenities.includes(amenity) ? 'chip-active' : ''}`}>
                  {amenity}
                </button>
              ))}
            </div>
          </Section>
        ) : null}

        <Section title="Photographs">
          <ImageUploader images={images} onChange={setImages} />
        </Section>

        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={state.busy} className="btn-primary">
            {state.busy ? <Spinner size="sm" className="border-white" /> : editing ? 'Save changes' : 'Save as draft'}
          </button>
          <button type="button" onClick={() => navigate('/agent')} className="btn-outline">
            Cancel
          </button>
        </div>
        {!editing ? (
          <p className="text-xs text-dark-500">
            Saved as a draft first. Submit it for review from your dashboard when it is ready.
          </p>
        ) : null}
      </form>
    </div>
  );
};

export default ListingForm;
