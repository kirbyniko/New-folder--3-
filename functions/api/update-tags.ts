/**
 * Cloudflare Pages Function: Update Event Tags
 * Endpoint: /api/update-tags
 * 
 * Auto-tag ALL events based on keywords in titles/descriptions/bills
 * Uses D1 database
 */

const TAG_PATTERNS: Record<string, RegExp[]> = {
  'healthcare': [/health/i, /medicaid/i, /medicare/i, /hospital/i, /medical/i, /patient/i, /doctor/i, /nurse/i, /pharmacy/i, /prescription/i, /mental\s?health/i, /opioid/i, /vaccine/i, /pandemic/i, /covid/i],
  'education': [/education/i, /school/i, /university/i, /college/i, /student/i, /teacher/i, /curriculum/i, /literacy/i, /tuition/i, /scholarship/i, /k-12/i, /charter\s?school/i],
  'transportation': [/transportation/i, /transit/i, /highway/i, /road/i, /bridge/i, /railroad/i, /airport/i, /aviation/i, /traffic/i, /metro/i, /bus/i, /bike/i, /pedestrian/i],
  'housing': [/housing/i, /affordable\s?housing/i, /rent/i, /tenant/i, /landlord/i, /eviction/i, /homeless/i, /shelter/i, /mortgage/i, /zoning/i, /construction/i, /building/i],
  'budget': [/budget/i, /appropriation/i, /revenue/i, /tax/i, /fiscal/i, /spending/i, /deficit/i, /debt/i, /treasury/i, /allocation/i, /funding/i],
  'environment': [/environment/i, /climate/i, /pollution/i, /conservation/i, /renewable/i, /wildlife/i, /water\s?quality/i, /air\s?quality/i, /sustainability/i, /green/i, /carbon/i, /emissions/i, /recycling/i, /clean\s?energy/i],
  'justice': [/justice/i, /court/i, /judge/i, /criminal/i, /sentencing/i, /police/i, /prison/i, /jail/i, /reform/i, /legal/i, /attorney/i, /crime/i],
  'economy': [/economy/i, /economic/i, /business/i, /commerce/i, /trade/i, /job/i, /employment/i, /unemployment/i, /wage/i, /salary/i, /minimum\s?wage/i, /small\s?business/i],
  'technology': [/technology/i, /tech/i, /internet/i, /broadband/i, /digital/i, /cyber/i, /privacy/i, /security/i, /artificial\s?intelligence/i, /\bai\b/i, /software/i, /5g/i],
  'agriculture': [/agriculture/i, /farm/i, /crop/i, /livestock/i, /rural/i, /food/i, /nutrition/i, /usda/i, /harvest/i, /pesticide/i, /organic/i, /dairy/i],
  'energy': [/energy/i, /power/i, /electricity/i, /gas\b/i, /oil\b/i, /coal/i, /nuclear/i, /solar/i, /wind/i, /hydroelectric/i, /utility/i, /grid/i, /battery/i],
  'defense': [/defense/i, /military/i, /armed\s?forces/i, /army/i, /navy/i, /air\s?force/i, /marines/i, /national\s?security/i, /veteran/i, /troop/i, /weapon/i],
  'immigration': [/immigration/i, /immigrant/i, /refugee/i, /asylum/i, /border/i, /citizenship/i, /visa/i, /deportation/i, /daca/i, /dreamer/i, /\bice\b/i],
  'labor': [/labor/i, /worker/i, /union/i, /workplace/i, /osha/i, /benefits/i, /retirement/i, /pension/i, /workforce/i, /collective\s?bargaining/i, /strike/i, /safety/i],
  'voting': [/voting/i, /election/i, /ballot/i, /voter/i, /electoral/i],
  'veterans': [/veteran/i, /\bva\b/i, /veterans\s?affairs/i, /gi\s?bill/i, /service\s?member/i, /disabled\s?veteran/i],
  'hearing': [/hearing/i, /testimony/i, /witness/i, /public\s?comment/i, /forum/i, /town\s?hall/i, /listening\s?session/i],
  'oversight': [/oversight/i, /investigation/i, /inquiry/i, /audit/i, /review/i, /examination/i, /monitoring/i, /compliance/i, /accountability/i],
  'public': [/public\s?comment/i, /public\s?input/i, /public\s?testimony/i, /citizen/i, /community\s?input/i, /open\s?to\s?public/i, /public\s?participation/i],
  'livestream': [/livestream/i, /live\s?stream/i, /webcast/i, /broadcast/i, /streaming/i, /watch\s?live/i, /remote/i, /virtual/i, /zoom/i, /teams/i]
};

export async function onRequest(context: any) {
  const { request, env } = context;
  
  // Allow CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }
  
  try {
    // Get all upcoming events
    const { results: events } = await env.DB.prepare(`
      SELECT 
        e.id, 
        e.name, 
        e.description,
        e.committee_name
      FROM events e
      WHERE e.date >= date('now')
      ORDER BY e.date
    `).all();
    
    console.log(`🏷️ Processing ${events.length} events for tagging...`);
    
    let taggedCount = 0;
    let totalTagsAdded = 0;
    
    // Batch operations to avoid hitting API limits
    const batchSize = 50;
    
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      
      // Use D1 batch API for better performance
      const statements = [];
      
      for (const event of batch) {
        // Build searchable text
        let searchableText = `${event.name} ${event.description || ''} ${event.committee_name || ''}`;
        
        const tags: string[] = [];
        
        // Check each tag pattern
        for (const [tag, patterns] of Object.entries(TAG_PATTERNS)) {
          if (patterns.some(pattern => pattern.test(searchableText))) {
            tags.push(tag);
          }
        }
        
        if (tags.length > 0) {
          // Delete existing tags
          statements.push(
            env.DB.prepare(`DELETE FROM event_tags WHERE event_id = ?`).bind(event.id)
          );
          
          // Insert new tags
          for (const tag of tags) {
            statements.push(
              env.DB.prepare(`INSERT INTO event_tags (event_id, tag) VALUES (?, ?)`).bind(event.id, tag)
            );
            totalTagsAdded++;
          }
          
          taggedCount++;
        }
      }
      
      // Execute batch
      if (statements.length > 0) {
        await env.DB.batch(statements);
        console.log(`✅ Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(events.length / batchSize)}`);
      }
    }
    
    console.log(`✨ Tagging complete! Tagged ${taggedCount} events with ${totalTagsAdded} total tags`);
    
    return new Response(
      JSON.stringify({
        success: true,
        processedEvents: events.length,
        taggedEvents: taggedCount,
        totalTags: totalTagsAdded,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
    
  } catch (error) {
    console.error('Update tags error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Tag update failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
}
