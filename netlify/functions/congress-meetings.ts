import type { Handler } from '@netlify/functions';
import { loadEnvFile } from './utils/env-loader';
import { sanitizeEvent } from './utils/security';
import { rateLimit } from './utils/rate-limit';

interface CommitteeMeeting {
  eventId: string;
  congress: number;
  chamber: string;
  date: string;
  meetingStatus: string;
  type: string;
  title: string;
  committees?: Array<{
    systemCode: string;
    name: string;
  }>;
  location?: {
    room?: string;
    building?: string;
  };
  updateDate: string;
}

interface CommitteeMeetingsResponse {
  committeeMeetings: CommitteeMeeting[];
}

export const handler: Handler = rateLimit(
  {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30 // 30 requests per minute per IP
  },
  async (event) => {
  loadEnvFile();
  const apiKey = process.env.CONGRESS_API_KEY || process.env.VITE_CONGRESS_API_KEY;
  
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({ 
        error: 'Congress.gov API key not configured',
        message: 'Please add VITE_CONGRESS_API_KEY to your environment variables'
      })
    };
  }

  try {
    // Note: Congress.gov API doesn't reliably provide upcoming meeting data
    // The API primarily contains historical records
    // For a production app, consider supplementing with other data sources
    
    console.log('Congress API: Returning empty array - API typically has historical data only');
    
    const upcomingMeetings: any[] = [];
    
    // Keeping this commented code for future reference if the API improves
    /* 
    const congress = 119;
    const listResponse = await fetch(
      `https://api.congress.gov/v3/committee-meeting?api_key=${apiKey}&format=json&limit=50`,
      { headers: { 'User-Agent': 'Civitron/1.0' } }
    );
    
    if (!listResponse.ok) {
      throw new Error(`Congress.gov API error: ${listResponse.status}`);
    }
    
    const listData = await listResponse.json();
    // Would need to fetch individual meeting details, which takes too long
    */
    
    const upcomingMeetingsFormatted = upcomingMeetings.map((meeting) => sanitizeEvent({
        id: `congress-${meeting.eventId}`,
        name: meeting.title || 'Committee Meeting',
        date: meeting.date,
        time: new Date(meeting.date).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }),
        location: meeting.location 
          ? `${meeting.location.building || ''} ${meeting.location.room || ''}`.trim()
          : 'Washington, DC',
        committee: meeting.committees?.[0]?.name || 'Committee',
        type: meeting.type || 'Meeting',
        level: 'federal',
        lat: 38.8899,
        lng: -77.0091,
        zipCode: '20515'
      }));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600'
      },
      body: JSON.stringify(upcomingMeetings)
    };

  } catch (error) {
    console.error('Congress.gov API error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({ 
        error: 'Failed to fetch federal events',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
});
