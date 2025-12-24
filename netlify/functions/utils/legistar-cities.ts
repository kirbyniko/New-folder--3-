/**
 * Top 50 US cities using Legistar for meeting management
 * All cities have public API access at: https://webapi.legistar.com/v1/{client}/events
 */

export interface LegistarCity {
  name: string;
  client: string; // Legistar API client name
  state: string;
  lat: number;
  lng: number;
  population: number;
}

export const LEGISTAR_CITIES: LegistarCity[] = [
  { name: 'New York City', client: 'nyccouncil', state: 'NY', lat: 40.7128, lng: -74.0060, population: 8336817 },
  { name: 'Los Angeles', client: 'lacity', state: 'CA', lat: 34.0522, lng: -118.2437, population: 3979576 },
  { name: 'Chicago', client: 'chicago', state: 'IL', lat: 41.8781, lng: -87.6298, population: 2693976 },
  { name: 'Naperville', client: 'naperville', state: 'IL', lat: 41.7508, lng: -88.1535, population: 149013 },
  { name: 'Joliet', client: 'joliet', state: 'IL', lat: 41.5250, lng: -88.0817, population: 150362 },
  { name: 'Newark', client: 'newark', state: 'NJ', lat: 40.7357, lng: -74.1724, population: 311549 },
  { name: 'Houston', client: 'houston', state: 'TX', lat: 29.7604, lng: -95.3698, population: 2304580 },
  { name: 'Phoenix', client: 'phoenix', state: 'AZ', lat: 33.4484, lng: -112.0740, population: 1680992 },
  { name: 'Philadelphia', client: 'philadelphia', state: 'PA', lat: 39.9526, lng: -75.1652, population: 1584064 },
  { name: 'San Antonio', client: 'sanantonio', state: 'TX', lat: 29.4241, lng: -98.4936, population: 1547253 },
  { name: 'San Diego', client: 'sandiego', state: 'CA', lat: 32.7157, lng: -117.1611, population: 1423851 },
  { name: 'Dallas', client: 'dallas', state: 'TX', lat: 32.7767, lng: -96.7970, population: 1304379 },
  { name: 'San Jose', client: 'sanjose', state: 'CA', lat: 37.3382, lng: -121.8863, population: 1013240 },
  { name: 'Austin', client: 'austin', state: 'TX', lat: 30.2672, lng: -97.7431, population: 961855 },
  { name: 'Jacksonville', client: 'jacksonville', state: 'FL', lat: 30.3322, lng: -81.6557, population: 949611 },
  { name: 'Pittsburgh', client: 'pittsburgh', state: 'PA', lat: 40.4406, lng: -79.9959, population: 302971 },
  { name: 'Erie', client: 'erie', state: 'PA', lat: 42.1292, lng: -80.0851, population: 94831 },
  { name: 'Fort Worth', client: 'fortworth', state: 'TX', lat: 32.7555, lng: -97.3308, population: 918915 },
  { name: 'Columbus', client: 'columbus', state: 'OH', lat: 39.9612, lng: -82.9988, population: 905748 },
  { name: 'Charlotte', client: 'charlotte', state: 'NC', lat: 35.2271, lng: -80.8431, population: 874579 },
  { name: 'San Francisco', client: 'sanfrancisco', state: 'CA', lat: 37.7749, lng: -122.4194, population: 873965 },
  { name: 'Indianapolis', client: 'indianapolis', state: 'IN', lat: 39.7684, lng: -86.1581, population: 867125 },
  { name: 'Seattle', client: 'seattle', state: 'WA', lat: 47.6062, lng: -122.3321, population: 749256 },
  { name: 'Denver', client: 'denver', state: 'CO', lat: 39.7392, lng: -104.9903, population: 715522 },
  { name: 'Boston', client: 'boston', state: 'MA', lat: 42.3601, lng: -71.0589, population: 675647 },
  { name: 'Nashville', client: 'nashville', state: 'TN', lat: 36.1627, lng: -86.7816, population: 689447 },
  { name: 'El Paso', client: 'elpaso', state: 'TX', lat: 31.7619, lng: -106.4850, population: 678815 },
  { name: 'Oklahoma City', client: 'oklahomacity', state: 'OK', lat: 35.4676, lng: -97.5164, population: 649821 },
  { name: 'Portland', client: 'portland', state: 'OR', lat: 45.5152, lng: -122.6784, population: 652503 },
  { name: 'Las Vegas', client: 'lasvegas', state: 'NV', lat: 36.1699, lng: -115.1398, population: 641903 },
  { name: 'Detroit', client: 'detroit', state: 'MI', lat: 42.3314, lng: -83.0458, population: 639111 },
  { name: 'Louisville', client: 'louisville', state: 'KY', lat: 38.2527, lng: -85.7585, population: 633045 },
  { name: 'Baltimore', client: 'baltimore', state: 'MD', lat: 39.2904, lng: -76.6122, population: 585708 },
  { name: 'Milwaukee', client: 'milwaukee', state: 'WI', lat: 43.0389, lng: -87.9065, population: 577222 },
  { name: 'Albuquerque', client: 'albuquerque', state: 'NM', lat: 35.0844, lng: -106.6504, population: 564559 },
  { name: 'Tucson', client: 'tucson', state: 'AZ', lat: 32.2226, lng: -110.9747, population: 548073 },
  { name: 'Fresno', client: 'fresno', state: 'CA', lat: 36.7378, lng: -119.7871, population: 542107 },
  { name: 'Sacramento', client: 'sacramento', state: 'CA', lat: 38.5816, lng: -121.4944, population: 524943 },
  { name: 'Mesa', client: 'mesa', state: 'AZ', lat: 33.4152, lng: -111.8315, population: 504258 },
  { name: 'Kansas City', client: 'kansascity', state: 'MO', lat: 39.0997, lng: -94.5786, population: 508090 },
  { name: 'Atlanta', client: 'atlanta', state: 'GA', lat: 33.7490, lng: -84.3880, population: 498715 },
  { name: 'Long Beach', client: 'longbeach', state: 'CA', lat: 33.7701, lng: -118.1937, population: 466742 },
  { name: 'Colorado Springs', client: 'coloradosprings', state: 'CO', lat: 38.8339, lng: -104.8214, population: 478961 },
  { name: 'Raleigh', client: 'raleigh', state: 'NC', lat: 35.7796, lng: -78.6382, population: 474069 },
  { name: 'Miami', client: 'miami', state: 'FL', lat: 25.7617, lng: -80.1918, population: 442241 },
  { name: 'Virginia Beach', client: 'virginiabeach', state: 'VA', lat: 36.8529, lng: -75.9780, population: 459470 },
  { name: 'Omaha', client: 'omaha', state: 'NE', lat: 41.2565, lng: -95.9345, population: 486051 },
  { name: 'Oakland', client: 'oakland', state: 'CA', lat: 37.8044, lng: -122.2712, population: 440646 },
  { name: 'Minneapolis', client: 'minneapolis', state: 'MN', lat: 44.9778, lng: -93.2650, population: 429954 },
  { name: 'Tulsa', client: 'tulsa', state: 'OK', lat: 36.1540, lng: -95.9928, population: 413066 },
  { name: 'Bakersfield', client: 'bakersfield', state: 'CA', lat: 35.3733, lng: -119.0187, population: 403455 },
  { name: 'Arlington', client: 'arlington', state: 'TX', lat: 32.7357, lng: -97.1081, population: 398854 },
  { name: 'Tampa', client: 'tampa', state: 'FL', lat: 27.9506, lng: -82.4572, population: 384959 },
  { name: 'New Orleans', client: 'neworleans', state: 'LA', lat: 29.9511, lng: -90.0715, population: 383997 },
  { name: 'Stockton', client: 'stockton', state: 'CA', lat: 37.9577, lng: -121.2908, population: 320554 },
  { name: 'St. Paul', client: 'stpaul', state: 'MN', lat: 44.9537, lng: -93.1022, population: 311527 },
  { name: 'Greensboro', client: 'greensboro', state: 'NC', lat: 36.0726, lng: -79.7920, population: 299035 },
  { name: 'Plano', client: 'plano', state: 'TX', lat: 33.0198, lng: -96.6989, population: 285494 },
  { name: 'Madison', client: 'madison', state: 'WI', lat: 43.0731, lng: -89.4012, population: 269840 },
  { name: 'Fontana', client: 'fontana', state: 'CA', lat: 34.0922, lng: -117.4350, population: 208393 },
  { name: 'McKinney', client: 'mckinney', state: 'TX', lat: 33.1972, lng: -96.6397, population: 199177 },
  { name: 'Huntington Beach', client: 'huntingtonbeach', state: 'CA', lat: 33.6603, lng: -117.9992, population: 198711 },
  { name: 'Salem', client: 'salem', state: 'OR', lat: 44.9429, lng: -123.0351, population: 175535 },
  { name: 'Alexandria', client: 'alexandria', state: 'VA', lat: 38.8048, lng: -77.0469, population: 159467 },
  { name: 'Killeen', client: 'killeen', state: 'TX', lat: 31.1171, lng: -97.7278, population: 153095 },
  { name: 'Bellevue', client: 'bellevue', state: 'WA', lat: 47.6101, lng: -122.2015, population: 151854 },
  { name: 'Hampton', client: 'hampton', state: 'VA', lat: 37.0299, lng: -76.3452, population: 137148 },
  { name: 'Jonesboro', client: 'jonesboro', state: 'AR', lat: 35.8423, lng: -90.7043, population: 78476 },
  { name: 'Madison', client: 'madison', state: 'MS', lat: 32.4618, lng: -90.1151, population: 27747 },
  { name: 'Columbus', client: 'columbus', state: 'MS', lat: 33.4957, lng: -88.4273, population: 25944 },
  { name: 'Wichita', client: 'wichita', state: 'KS', lat: 37.6872, lng: -97.3301, population: 397532 },
  { name: 'Cleveland', client: 'cleveland', state: 'OH', lat: 41.4993, lng: -81.6944, population: 372624 },
  { name: 'Bakersfield', client: 'bakersfield', state: 'CA', lat: 35.3733, lng: -119.0187, population: 403455 },
  { name: 'Aurora', client: 'aurora', state: 'CO', lat: 39.7294, lng: -104.8319, population: 386261 },
  { name: 'Anaheim', client: 'anaheim', state: 'CA', lat: 33.8366, lng: -117.9143, population: 346824 },
  { name: 'Wilmington', client: 'wilmington', state: 'DE', lat: 39.7447, lng: -75.5484, population: 70898 }
];

/**
 * Find Legistar cities near a location (within radius)
 */
export function findNearbyCities(lat: number, lng: number, radiusMiles: number): LegistarCity[] {
  return LEGISTAR_CITIES.filter(city => {
    const distance = calculateDistance(lat, lng, city.lat, city.lng);
    return distance <= radiusMiles;
  }).sort((a, b) => {
    const distA = calculateDistance(lat, lng, a.lat, a.lng);
    const distB = calculateDistance(lat, lng, b.lat, b.lng);
    return distA - distB;
  });
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
