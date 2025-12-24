import { Handler } from '@netlify/functions';
import { getPool } from './utils/db/connection.js';

/**
 * Auto-tag all events in the database
 * Analyzes event content and assigns relevant tags
 */

// Tag definitions and keyword patterns (copied from frontend)
const KEYWORD_PATTERNS: Record<string, string[]> = {
  healthcare: [
    'health', 'medical', 'hospital', 'medicare', 'medicaid', 'insurance',
    'patient', 'doctor', 'nurse', 'pharmacy', 'prescription', 'disease',
    'mental health', 'opioid', 'drug', 'vaccine', 'pandemic', 'covid'
  ],
  education: [
    'education', 'school', 'teacher', 'student', 'university', 'college',
    'curriculum', 'learning', 'literacy', 'graduation', 'tuition', 'scholarship',
    'k-12', 'early childhood', 'special education', 'charter school'
  ],
  environment: [
    'environment', 'climate', 'pollution', 'conservation', 'wildlife',
    'water quality', 'air quality', 'renewable', 'sustainability', 'green',
    'carbon', 'emissions', 'recycling', 'clean energy', 'toxic', 'hazardous'
  ],
  economy: [
    'economy', 'economic', 'business', 'commerce', 'trade', 'jobs',
    'employment', 'unemployment', 'wage', 'salary', 'minimum wage',
    'small business', 'entrepreneurship', 'development', 'growth', 'recession'
  ],
  transportation: [
    'transportation', 'highway', 'road', 'bridge', 'transit', 'public transit',
    'rail', 'railroad', 'airport', 'aviation', 'vehicle', 'traffic',
    'infrastructure', 'commute', 'metro', 'bus', 'bike', 'pedestrian'
  ],
  housing: [
    'housing', 'affordable housing', 'rent', 'landlord', 'tenant', 'eviction',
    'homelessness', 'shelter', 'mortgage', 'real estate', 'zoning',
    'development', 'construction', 'building', 'home'
  ],
  justice: [
    'justice', 'court', 'judge', 'criminal', 'civil', 'law enforcement',
    'police', 'prison', 'jail', 'sentencing', 'reform', 'rights',
    'legal', 'attorney', 'prosecution', 'defendant', 'victim', 'crime'
  ],
  technology: [
    'technology', 'tech', 'internet', 'broadband', 'digital', 'cyber',
    'data', 'privacy', 'security', 'artificial intelligence', 'ai',
    'software', 'hardware', 'innovation', 'telecommunications', '5g'
  ],
  agriculture: [
    'agriculture', 'farm', 'farmer', 'crop', 'livestock', 'rural',
    'agricultural', 'food', 'nutrition', 'usda', 'harvest', 'irrigation',
    'pesticide', 'organic', 'dairy', 'cattle', 'produce'
  ],
  energy: [
    'energy', 'power', 'electricity', 'gas', 'oil', 'coal', 'nuclear',
    'solar', 'wind', 'hydroelectric', 'renewable energy', 'fossil fuel',
    'utility', 'grid', 'battery', 'electric'
  ],
  defense: [
    'defense', 'military', 'armed forces', 'army', 'navy', 'air force',
    'marines', 'national security', 'pentagon', 'veteran', 'troop',
    'deployment', 'base', 'weapon', 'combat', 'homeland security'
  ],
  immigration: [
    'immigration', 'immigrant', 'refugee', 'asylum', 'border',
    'citizenship', 'visa', 'deportation', 'daca', 'dreamer',
    'naturalization', 'alien', 'migrant', 'customs', 'ice'
  ],
  tax: [
    'tax', 'taxation', 'revenue', 'irs', 'budget', 'fiscal', 'finance',
    'appropriation', 'spending', 'deficit', 'debt', 'treasury',
    'credit', 'deduction', 'income tax', 'corporate tax', 'sales tax'
  ],
  labor: [
    'labor', 'worker', 'union', 'workplace', 'osha', 'benefits',
    'retirement', 'pension', 'unemployment', 'workforce', 'job training',
    'apprenticeship', 'collective bargaining', 'strike', 'safety'
  ],
  veterans: [
    'veteran', 'va', 'veterans affairs', 'gi bill', 'service member',
    'disabled veteran', 'military family', 'veterans benefits'
  ],
  budget: [
    'budget', 'appropriations', 'fiscal year', 'funding', 'allocation',
    'expenditure', 'financial', 'revenue', 'spending bill'
  ],
  hearing: [
    'hearing', 'testimony', 'witness', 'public comment', 'input',
    'forum', 'town hall', 'listening session'
  ],
  vote: [
    'vote', 'voting', 'ballot', 'decision', 'approval', 'passage',
    'ratification', 'adoption', 'consideration'
  ],
  oversight: [
    'oversight', 'investigation', 'inquiry', 'audit', 'review',
    'examination', 'monitoring', 'compliance', 'accountability'
  ],
  amendment: [
    'amendment', 'amend', 'revision', 'modification', 'change',
    'update', 'alter', 'proposed change'
  ],
  urgent: [
    'urgent', 'emergency', 'immediate', 'crisis', 'critical',
    'time-sensitive', 'expedited', 'priority'
  ],
  public: [
    'public comment', 'public input', 'public testimony', 'citizen',
    'community input', 'open to public', 'public participation'
  ],
  livestream: [
    'livestream', 'live stream', 'webcast', 'broadcast', 'streaming',
    'watch live', 'video', 'remote', 'virtual'
  ]
};

function autoTagEvent(event: {
  name: string;
  description?: string | null;
  committee_name?: string | null;
}): string[] {
  const tags = new Set<string>();
  
  const searchText = [
    event.name,
    event.description || '',
    event.committee_name || ''
  ].join(' ').toLowerCase();
  
  for (const [tagId, keywords] of Object.entries(KEYWORD_PATTERNS)) {
    for (const keyword of keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        tags.add(tagId);
        break;
      }
    }
  }
  
  return Array.from(tags);
}

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST' && event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const pool = getPool();
    
    console.log('🏷️ Starting tag update process...');
    
    // Get all events
    const eventsResult = await pool.query(`
      SELECT id, name, description, committee_name
      FROM events
      ORDER BY id
    `);
    
    console.log(`📊 Found ${eventsResult.rows.length} events to tag`);
    
    let totalTagsAdded = 0;
    let eventsTagged = 0;
    
    // Process each event
    for (const dbEvent of eventsResult.rows) {
      // Generate tags
      const tags = autoTagEvent(dbEvent);
      
      if (tags.length > 0) {
        // Delete existing tags for this event
        await pool.query('DELETE FROM event_tags WHERE event_id = $1', [dbEvent.id]);
        
        // Insert new tags
        for (const tag of tags) {
          await pool.query(
            'INSERT INTO event_tags (event_id, tag) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [dbEvent.id, tag]
          );
          totalTagsAdded++;
        }
        
        eventsTagged++;
        
        if (eventsTagged % 100 === 0) {
          console.log(`✅ Tagged ${eventsTagged} events so far...`);
        }
      }
    }
    
    console.log(`✨ Tag update complete!`);
    console.log(`   - Events processed: ${eventsResult.rows.length}`);
    console.log(`   - Events tagged: ${eventsTagged}`);
    console.log(`   - Total tags added: ${totalTagsAdded}`);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        eventsProcessed: eventsResult.rows.length,
        eventsTagged: eventsTagged,
        totalTagsAdded: totalTagsAdded,
        message: `Successfully tagged ${eventsTagged} events with ${totalTagsAdded} total tags`
      }),
    };

  } catch (error: any) {
    console.error('❌ Error updating tags:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
    };
  }
};
