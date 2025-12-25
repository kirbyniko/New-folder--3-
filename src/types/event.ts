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
  description?: string;
  tags?: string[]; // Auto-generated tags for filtering
  
  // 🆕 Docket & Virtual Meeting Information
  docketUrl?: string;           // Link to official docket page
  agendaUrl?: string;           // Link to committee agenda page
  virtualMeetingUrl?: string;   // Zoom/Teams/WebEx link for remote attendance
  bills?: Bill[];               // Bills being discussed (when available)
  sourceUrl?: string;           // URL of the page where data was scraped from
  detailsUrl?: string;          // Link to event details page
  agendaSummary?: string;       // AI-generated summary of the agenda PDF
  
  // 🆕 Public Participation
  allowsPublicParticipation?: boolean;  // Whether public comment/testimony is allowed
}

// 🆕 Bill information structure
export interface Bill {
  id?: string;                  // Bill ID
  number?: string;              // Bill number (HB 1234, SB 567)
  title?: string;               // Bill title
  url?: string;                 // Link to full bill text
  status?: string;              // Current status
  sponsors?: string[];          // Bill sponsors
  tags?: string[];              // Policy area tags
  summary?: string;             // AI-generated summary of the bill
}
