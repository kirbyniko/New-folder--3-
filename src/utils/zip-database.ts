/**
 * Built-in ZIP code database for major US cities
 * Provides instant geocoding without external API calls
 */

import { GeoLocation } from './geocoding';

export const ZIP_DATABASE: Record<string, GeoLocation> = {
  // California
  '90001': { lat: 33.9731, lng: -118.2479, state: 'California', stateAbbr: 'CA', city: 'Los Angeles' },
  '94102': { lat: 37.7799, lng: -122.4192, state: 'California', stateAbbr: 'CA', city: 'San Francisco' },
  '95814': { lat: 38.5826, lng: -121.4944, state: 'California', stateAbbr: 'CA', city: 'Sacramento' },
  '92101': { lat: 32.7157, lng: -117.1611, state: 'California', stateAbbr: 'CA', city: 'San Diego' },
  
  // Texas
  '78701': { lat: 30.2747, lng: -97.7404, state: 'Texas', stateAbbr: 'TX', city: 'Austin' },
  '75201': { lat: 32.7831, lng: -96.8067, state: 'Texas', stateAbbr: 'TX', city: 'Dallas' },
  '77002': { lat: 29.7604, lng: -95.3698, state: 'Texas', stateAbbr: 'TX', city: 'Houston' },
  
  // New York
  '10001': { lat: 40.7506, lng: -73.9971, state: 'New York', stateAbbr: 'NY', city: 'New York' },
  '12207': { lat: 42.6526, lng: -73.7562, state: 'New York', stateAbbr: 'NY', city: 'Albany' },
  '14201': { lat: 42.8864, lng: -78.8784, state: 'New York', stateAbbr: 'NY', city: 'Buffalo' },
  
  // Florida
  '33101': { lat: 25.7743, lng: -80.1937, state: 'Florida', stateAbbr: 'FL', city: 'Miami' },
  '32301': { lat: 30.4383, lng: -84.2807, state: 'Florida', stateAbbr: 'FL', city: 'Tallahassee' },
  '32801': { lat: 28.5383, lng: -81.3792, state: 'Florida', stateAbbr: 'FL', city: 'Orlando' },
  
  // Pennsylvania
  '19019': { lat: 39.9526, lng: -75.1652, state: 'Pennsylvania', stateAbbr: 'PA', city: 'Philadelphia' },
  '17101': { lat: 40.2732, lng: -76.8867, state: 'Pennsylvania', stateAbbr: 'PA', city: 'Harrisburg' },
  '15201': { lat: 40.4406, lng: -79.9959, state: 'Pennsylvania', stateAbbr: 'PA', city: 'Pittsburgh' },
  
  // Illinois
  '60601': { lat: 41.8781, lng: -87.6298, state: 'Illinois', stateAbbr: 'IL', city: 'Chicago' },
  '62701': { lat: 39.7817, lng: -89.6501, state: 'Illinois', stateAbbr: 'IL', city: 'Springfield' },
  
  // Ohio
  '43201': { lat: 39.9612, lng: -82.9988, state: 'Ohio', stateAbbr: 'OH', city: 'Columbus' },
  '44101': { lat: 41.4993, lng: -81.6944, state: 'Ohio', stateAbbr: 'OH', city: 'Cleveland' },
  
  // Georgia
  '30301': { lat: 33.7490, lng: -84.3880, state: 'Georgia', stateAbbr: 'GA', city: 'Atlanta' },
  
  // North Carolina
  '27601': { lat: 35.7796, lng: -78.6382, state: 'North Carolina', stateAbbr: 'NC', city: 'Raleigh' },
  
  // Michigan
  '48201': { lat: 42.3314, lng: -83.0458, state: 'Michigan', stateAbbr: 'MI', city: 'Detroit' },
  '48933': { lat: 42.7325, lng: -84.5555, state: 'Michigan', stateAbbr: 'MI', city: 'Lansing' },
  
  // New Jersey
  '07102': { lat: 40.7357, lng: -74.1724, state: 'New Jersey', stateAbbr: 'NJ', city: 'Newark' },
  '08608': { lat: 40.2206, lng: -74.7597, state: 'New Jersey', stateAbbr: 'NJ', city: 'Trenton' },
  
  // Virginia
  '23219': { lat: 37.5407, lng: -77.4360, state: 'Virginia', stateAbbr: 'VA', city: 'Richmond' },
  
  // Washington
  '98101': { lat: 47.6062, lng: -122.3321, state: 'Washington', stateAbbr: 'WA', city: 'Seattle' },
  '98501': { lat: 47.0379, lng: -122.9007, state: 'Washington', stateAbbr: 'WA', city: 'Olympia' },
  
  // Massachusetts
  '02101': { lat: 42.3601, lng: -71.0589, state: 'Massachusetts', stateAbbr: 'MA', city: 'Boston' },
  
  // Arizona
  '85001': { lat: 33.4484, lng: -112.0740, state: 'Arizona', stateAbbr: 'AZ', city: 'Phoenix' },
  
  // Tennessee
  '37201': { lat: 36.1627, lng: -86.7816, state: 'Tennessee', stateAbbr: 'TN', city: 'Nashville' },
  
  // Indiana
  '46201': { lat: 39.7684, lng: -86.1581, state: 'Indiana', stateAbbr: 'IN', city: 'Indianapolis' },
  
  // Missouri
  '63101': { lat: 38.6270, lng: -90.1994, state: 'Missouri', stateAbbr: 'MO', city: 'St. Louis' },
  '64101': { lat: 39.0997, lng: -94.5786, state: 'Missouri', stateAbbr: 'MO', city: 'Kansas City' },
  '65101': { lat: 38.5767, lng: -92.1735, state: 'Missouri', stateAbbr: 'MO', city: 'Jefferson City' },
  
  // Wisconsin
  '53201': { lat: 43.0389, lng: -87.9065, state: 'Wisconsin', stateAbbr: 'WI', city: 'Milwaukee' },
  '53701': { lat: 43.0731, lng: -89.4012, state: 'Wisconsin', stateAbbr: 'WI', city: 'Madison' },
  
  // Minnesota
  '55401': { lat: 44.9778, lng: -93.2650, state: 'Minnesota', stateAbbr: 'MN', city: 'Minneapolis' },
  '55101': { lat: 44.9537, lng: -93.0900, state: 'Minnesota', stateAbbr: 'MN', city: 'St. Paul' },
  
  // Colorado
  '80201': { lat: 39.7392, lng: -104.9903, state: 'Colorado', stateAbbr: 'CO', city: 'Denver' },
  
  // Alabama
  '36101': { lat: 32.3792, lng: -86.3077, state: 'Alabama', stateAbbr: 'AL', city: 'Montgomery' },
  
  // Louisiana
  '70112': { lat: 29.9511, lng: -90.0715, state: 'Louisiana', stateAbbr: 'LA', city: 'New Orleans' },
  '70801': { lat: 30.4515, lng: -91.1871, state: 'Louisiana', stateAbbr: 'LA', city: 'Baton Rouge' },
  
  // Kentucky
  '40201': { lat: 38.2527, lng: -85.7585, state: 'Kentucky', stateAbbr: 'KY', city: 'Louisville' },
  '40601': { lat: 38.0406, lng: -84.5037, state: 'Kentucky', stateAbbr: 'KY', city: 'Frankfort' },
  
  // Oregon
  '97201': { lat: 45.5152, lng: -122.6784, state: 'Oregon', stateAbbr: 'OR', city: 'Portland' },
  '97301': { lat: 44.9429, lng: -123.0351, state: 'Oregon', stateAbbr: 'OR', city: 'Salem' },
  
  // Oklahoma
  '73101': { lat: 35.4676, lng: -97.5164, state: 'Oklahoma', stateAbbr: 'OK', city: 'Oklahoma City' },
  
  // Connecticut
  '06101': { lat: 41.7658, lng: -72.6734, state: 'Connecticut', stateAbbr: 'CT', city: 'Hartford' },
  
  // Iowa
  '50301': { lat: 41.5868, lng: -93.6250, state: 'Iowa', stateAbbr: 'IA', city: 'Des Moines' },
  
  // Arkansas
  '72201': { lat: 34.7465, lng: -92.2896, state: 'Arkansas', stateAbbr: 'AR', city: 'Little Rock' },
  
  // Mississippi
  '39201': { lat: 32.2988, lng: -90.1848, state: 'Mississippi', stateAbbr: 'MS', city: 'Jackson' },
  
  // Kansas
  '66101': { lat: 39.1141, lng: -94.6275, state: 'Kansas', stateAbbr: 'KS', city: 'Kansas City' },
  '66601': { lat: 39.0473, lng: -95.6815, state: 'Kansas', stateAbbr: 'KS', city: 'Topeka' },
  
  // Utah
  '84101': { lat: 40.7608, lng: -111.8910, state: 'Utah', stateAbbr: 'UT', city: 'Salt Lake City' },
  
  // Nevada
  '89101': { lat: 36.1699, lng: -115.1398, state: 'Nevada', stateAbbr: 'NV', city: 'Las Vegas' },
  '89501': { lat: 39.5296, lng: -119.8138, state: 'Nevada', stateAbbr: 'NV', city: 'Reno' },
  
  // New Mexico
  '87501': { lat: 35.6870, lng: -105.9378, state: 'New Mexico', stateAbbr: 'NM', city: 'Santa Fe' },
  
  // West Virginia
  '25301': { lat: 38.3498, lng: -81.6326, state: 'West Virginia', stateAbbr: 'WV', city: 'Charleston' },
  
  // Nebraska
  '68501': { lat: 40.8136, lng: -96.7026, state: 'Nebraska', stateAbbr: 'NE', city: 'Lincoln' },
  
  // Idaho
  '83701': { lat: 43.6150, lng: -116.2023, state: 'Idaho', stateAbbr: 'ID', city: 'Boise' },
  
  // Hawaii
  '96801': { lat: 21.3099, lng: -157.8581, state: 'Hawaii', stateAbbr: 'HI', city: 'Honolulu' },
  
  // New Hampshire
  '03301': { lat: 43.2081, lng: -71.5376, state: 'New Hampshire', stateAbbr: 'NH', city: 'Concord' },
  
  // Maine
  '04330': { lat: 44.3106, lng: -69.7795, state: 'Maine', stateAbbr: 'ME', city: 'Augusta' },
  
  // Rhode Island
  '02901': { lat: 41.8240, lng: -71.4128, state: 'Rhode Island', stateAbbr: 'RI', city: 'Providence' },
  
  // Montana
  '59601': { lat: 46.5891, lng: -112.0391, state: 'Montana', stateAbbr: 'MT', city: 'Helena' },
  
  // Delaware
  '19901': { lat: 39.1582, lng: -75.5244, state: 'Delaware', stateAbbr: 'DE', city: 'Dover' },
  
  // South Dakota
  '57501': { lat: 44.3683, lng: -100.3537, state: 'South Dakota', stateAbbr: 'SD', city: 'Pierre' },
  
  // North Dakota
  '58501': { lat: 46.8083, lng: -100.7837, state: 'North Dakota', stateAbbr: 'ND', city: 'Bismarck' },
  
  // Alaska
  '99501': { lat: 61.2181, lng: -149.9003, state: 'Alaska', stateAbbr: 'AK', city: 'Anchorage' },
  '99801': { lat: 58.3019, lng: -134.4197, state: 'Alaska', stateAbbr: 'AK', city: 'Juneau' },
  
  // Vermont
  '05601': { lat: 44.2601, lng: -72.5754, state: 'Vermont', stateAbbr: 'VT', city: 'Montpelier' },
  
  // Wyoming
  '82001': { lat: 41.1400, lng: -104.8202, state: 'Wyoming', stateAbbr: 'WY', city: 'Cheyenne' },
};
