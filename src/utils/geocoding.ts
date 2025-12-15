export interface GeoLocation {
  lat: number;
  lng: number;
  state?: string;
  stateAbbr?: string;
  city?: string;
}

const STATE_NAME_TO_ABBR: Record<string, string> = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
  'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
  'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
  'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
  'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
  'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
  'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
  'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
  'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY'
};

/**
 * Geocode a US ZIP code using OpenStreetMap Nominatim API
 * Returns latitude, longitude, state, and city information
 */
export async function geocodeZipCode(zipCode: string): Promise<GeoLocation> {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?postalcode=${zipCode}&country=us&format=json&addressdetails=1`,
    {
      headers: {
        'User-Agent': 'Civitron/1.0'
      }
    }
  );
  
  if (!response.ok) {
    throw new Error('Geocoding service unavailable');
  }
  
  const data = await response.json();
  
  if (data.length === 0) {
    throw new Error('ZIP code not found');
  }
  
  const result = data[0];
  const stateName = result.address?.state;
  
  return {
    lat: parseFloat(result.lat),
    lng: parseFloat(result.lon),
    state: stateName,
    stateAbbr: stateName ? STATE_NAME_TO_ABBR[stateName] : undefined,
    city: result.address?.city || result.address?.town || result.address?.village
  };
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in miles
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
