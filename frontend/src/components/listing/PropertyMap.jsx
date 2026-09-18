import { MapContainer, TileLayer, Marker, Circle, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

/*
 * Leaflet's default marker points at image files it expects to find beside its
 * own stylesheet, which a bundler moves — the well-known "markers are invisible
 * in production" bug. A divIcon has no image to lose, and it lets the pin carry
 * the brand colour.
 */
const pin = L.divIcon({
  className: '',
  html: `<span style="display:block;width:20px;height:20px;border-radius:50% 50% 50% 0;
         background:#1f645f;border:2px solid #fff;transform:rotate(-45deg);
         box-shadow:0 2px 6px rgba(0,0,0,.35)"></span>`,
  iconSize: [20, 20],
  iconAnchor: [10, 20],
});

/**
 * Where the property is, at street level but not at doorstep level.
 *
 * The seeded coordinates are scattered within about a kilometre of the area
 * centre, and the circle says so honestly rather than dropping a pin on a
 * specific gate the listing does not actually identify.
 */
export const PropertyMap = ({ coordinates, area, height = 320 }) => {
  if (!coordinates || coordinates.length !== 2) return null;
  // Stored as GeoJSON [lng, lat]; Leaflet wants [lat, lng]. Getting this
  // backwards puts every Kenyan property in the Indian Ocean.
  const position = [coordinates[1], coordinates[0]];

  return (
    <MapContainer
      center={position}
      zoom={14}
      scrollWheelZoom={false}
      style={{ height, width: '100%' }}
      aria-label={`Map showing the approximate location in ${area}`}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Circle
        center={position}
        radius={450}
        pathOptions={{ color: '#227d76', fillColor: '#2d9d92', fillOpacity: 0.15, weight: 1 }}
      />
      <Marker position={position} icon={pin}>
        <Popup>Approximate location in {area}</Popup>
      </Marker>
    </MapContainer>
  );
};

export default PropertyMap;
