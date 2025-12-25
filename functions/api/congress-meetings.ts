/**
 * Cloudflare Pages Function: Congress Meetings API
 * Endpoint: /api/congress-meetings
 */

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

export async function onRequest(context: any) {
  const { request, env } = context;
  
  // Rate limiting (simplified - Cloudflare has built-in DDoS protection)
  // For advanced rate limiting, use Cloudflare Workers KV
  
  const apiKey = env.CONGRESS_API_KEY || env.VITE_CONGRESS_API_KEY;
  
  if (!apiKey) {
    return new Response(
      JSON.stringify({ 
        error: 'Congress.gov API key not configured',
        message: 'Please add VITE_CONGRESS_API_KEY to your environment variables'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }

  try {
    // Note: Congress.gov API doesn't reliably provide upcoming meeting data
    // The API primarily contains historical records
    console.log('Congress API: Returning empty array - API typically has historical data only');
    
    const upcomingMeetings: any[] = [];
    
    return new Response(
      JSON.stringify(upcomingMeetings),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300, s-maxage=300',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  } catch (error) {
    console.error('Congress API error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch congressional meetings',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
}
