import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const pin = L.divIcon({
  className: '',
  html: `<span style="display:block;width:20px;height:20px;border-radius:50% 50% 50% 0;
         background:#dc9530;border:2px solid #fff;transform:rotate(-45deg);
         box-shadow:0 2px 6px rgba(0,0,0,.35)"></span>`,
  iconSize: [20, 20],
  iconAnchor: [10, 20],
});

const ClickToPlace = ({ onPlace }) => {
  useMapEvents({
    click(event) {
      // Leaflet reports {lat, lng}; the API stores GeoJSON [lng, lat]. The swap
      // happens here, once, at the boundary.
      onPlace([event.latlng.lng, event.latlng.lat]);
    },
  });
  return null;
};

// Centred on Nairobi when nothing has been placed yet — the majority of
// listings are there, and a map opening on the Atlantic is not a useful start.
const DEFAULT_CENTRE = [-1.2921, 36.8219];

export const LocationPicker = ({ coordinates, onChange }) => {
  const placed = coordinates?.length === 2;
  const position = placed ? [coordinates[1], coordinates[0]] : DEFAULT_CENTRE;

  return (
    <div className="space-y-2">
      <MapContainer
        center={position}
        zoom={placed ? 15 : 11}
        style={{ height: 300, width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickToPlace onPlace={onChange} />
        {placed ? <Marker position={position} icon={pin} /> : null}
      </MapContainer>
      <p className="text-xs text-dark-500">
        {placed
          ? 'Click again to move the pin. Readers see an approximate area, not this exact point.'
          : 'Click the map to place the property. This is optional: without it the listing will not appear in map searches.'}
      </p>
    </div>
  );
};

export default LocationPicker;
