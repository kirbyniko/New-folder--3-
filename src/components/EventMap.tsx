import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import type { LegislativeEvent } from '../types/event';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon in Leaflet with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface EventMapProps {
  events: LegislativeEvent[];
  centerLat: number;
  centerLng: number;
  radius: number;
}

export default function EventMap({ events, centerLat, centerLng, radius }: EventMapProps) {
  // Custom marker colors based on level
  const getMarkerIcon = (level: string) => {
    const colors: Record<string, string> = {
      federal: '#3b82f6',
      state: '#10b981',
      local: '#f59e0b'
    };
    
    return L.divIcon({
      className: 'custom-marker',
      html: `<div style="background-color: ${colors[level] || '#666'}; width: 25px; height: 25px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
      iconSize: [25, 25],
      iconAnchor: [12, 12]
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div style={{ height: '400px', width: '100%', borderRadius: '8px', overflow: 'hidden' }}>
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={9}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Search radius circle */}
        <Circle
          center={[centerLat, centerLng]}
          radius={radius * 1609.34} // Convert miles to meters
          pathOptions={{
            color: '#667eea',
            fillColor: '#667eea',
            fillOpacity: 0.1,
            weight: 2
          }}
        />
        
        {/* Center marker */}
        <Marker position={[centerLat, centerLng]}>
          <Popup>
            <strong>Your Location</strong><br />
            Search Radius: {radius} miles
          </Popup>
        </Marker>
        
        {/* Event markers */}
        {events.map(event => (
          <Marker
            key={`${event.level}-${event.id}`}
            position={[event.lat, event.lng]}
            icon={getMarkerIcon(event.level)}
          >
            <Popup>
              <div style={{ minWidth: '200px' }}>
                <strong>{event.name}</strong><br />
                <small style={{ color: '#666' }}>{event.level.toUpperCase()}</small><br />
                📅 {formatDate(event.date)}<br />
                🕐 {event.time}<br />
                📍 {event.location}<br />
                {event.distance && <span>📏 {event.distance.toFixed(1)} mi</span>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
