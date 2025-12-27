/**
 * Auto-tagging logic for events
 * Shared between frontend and backend
 */

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

/**
 * Auto-tag an event based on its content
 * Analyzes name, description, and committee to determine relevant tags
 */
export function autoTagEvent(event: {
  name: string;
  description?: string | null;
  committee?: string | null;
}): string[] {
  const tags = new Set<string>();
  
  // Combine searchable text
  const searchText = [
    event.name,
    event.description || '',
    event.committee || ''
  ].join(' ').toLowerCase();
  
  // Check each tag's keywords
  for (const [tagId, keywords] of Object.entries(KEYWORD_PATTERNS)) {
    for (const keyword of keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        tags.add(tagId);
        break; // Found match, move to next tag
      }
    }
  }
  
  return Array.from(tags);
}
