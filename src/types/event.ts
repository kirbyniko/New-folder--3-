export interface LegislativeEvent {
  id: string;
  name: string;
  date: string;
  time: string;
  location: string;
  committee: string;
  type: string;
  level: 'federal' | 'state' | 'local';
  lat: number;
  lng: number;
  zipCode: string | null;
  distance?: number;
  city?: string;
  state?: string;
  url?: string | null;
}
