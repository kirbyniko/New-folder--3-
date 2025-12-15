/**
 * Automatic Event Tagging System
 * Analyzes event content to assign relevant tags for filtering and discovery
 */

export interface EventTag {
  id: string;
  label: string;
  color: string;
  icon: string;
}

export const TAG_DEFINITIONS: Record<string, EventTag> = {
  // Policy Areas
  healthcare: { id: 'healthcare', label: 'Healthcare', color: '#ef4444', icon: '🏥' },
  education: { id: 'education', label: 'Education', color: '#3b82f6', icon: '🎓' },
  environment: { id: 'environment', label: 'Environment', color: '#10b981', icon: '🌱' },
  economy: { id: 'economy', label: 'Economy', color: '#f59e0b', icon: '💰' },
  transportation: { id: 'transportation', label: 'Transportation', color: '#8b5cf6', icon: '🚗' },
  housing: { id: 'housing', label: 'Housing', color: '#ec4899', icon: '🏠' },
  justice: { id: 'justice', label: 'Justice', color: '#6366f1', icon: '⚖️' },
  technology: { id: 'technology', label: 'Technology', color: '#06b6d4', icon: '💻' },
  agriculture: { id: 'agriculture', label: 'Agriculture', color: '#84cc16', icon: '🌾' },
  energy: { id: 'energy', label: 'Energy', color: '#eab308', icon: '⚡' },
  defense: { id: 'defense', label: 'Defense', color: '#dc2626', icon: '🛡️' },
  immigration: { id: 'immigration', label: 'Immigration', color: '#7c3aed', icon: '🌍' },
  tax: { id: 'tax', label: 'Tax & Finance', color: '#059669', icon: '📊' },
  labor: { id: 'labor', label: 'Labor & Employment', color: '#0891b2', icon: '👷' },
  veterans: { id: 'veterans', label: 'Veterans', color: '#b91c1c', icon: '🎖️' },
  
  // Event Types
  budget: { id: 'budget', label: 'Budget', color: '#65a30d', icon: '💵' },
  hearing: { id: 'hearing', label: 'Public Hearing', color: '#2563eb', icon: '👂' },
  vote: { id: 'vote', label: 'Vote/Decision', color: '#dc2626', icon: '🗳️' },
  oversight: { id: 'oversight', label: 'Oversight', color: '#7c3aed', icon: '🔍' },
  amendment: { id: 'amendment', label: 'Amendment', color: '#9333ea', icon: '📝' },
  
  // Urgency/Status
  urgent: { id: 'urgent', label: 'Urgent', color: '#dc2626', icon: '⚡' },
  public: { id: 'public', label: 'Public Input', color: '#10b981', icon: '💬' },
  livestream: { id: 'livestream', label: 'Livestreamed', color: '#ef4444', icon: '📹' }
};

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
  
  // Event Types
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
  
  // Urgency
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
 * Automatically tag an event based on its content
 * Note: Excludes location/address to avoid false positives (e.g., "Airport Road" → Technology)
 */
export function autoTagEvent(event: {
  name: string;
  description?: string;
  committee?: string;
  location?: string;
}): string[] {
  const tags = new Set<string>();
  
  // Only analyze name, description, and committee (exclude location to avoid street address false positives)
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

/**
 * Get tag objects from tag IDs
 */
export function getTagObjects(tagIds: string[]): EventTag[] {
  return tagIds
    .map(id => TAG_DEFINITIONS[id])
    .filter(Boolean); // Remove undefined tags
}

/**
 * Get all available tags (for filter UI)
 */
export function getAllTags(): EventTag[] {
  return Object.values(TAG_DEFINITIONS);
}

/**
 * Group tags by category
 */
export function getTagsByCategory() {
  return {
    'Policy Areas': [
      TAG_DEFINITIONS.healthcare,
      TAG_DEFINITIONS.education,
      TAG_DEFINITIONS.environment,
      TAG_DEFINITIONS.economy,
      TAG_DEFINITIONS.transportation,
      TAG_DEFINITIONS.housing,
      TAG_DEFINITIONS.justice,
      TAG_DEFINITIONS.technology,
      TAG_DEFINITIONS.agriculture,
      TAG_DEFINITIONS.energy,
      TAG_DEFINITIONS.defense,
      TAG_DEFINITIONS.immigration,
      TAG_DEFINITIONS.tax,
      TAG_DEFINITIONS.labor,
      TAG_DEFINITIONS.veterans
    ],
    'Event Type': [
      TAG_DEFINITIONS.budget,
      TAG_DEFINITIONS.hearing,
      TAG_DEFINITIONS.vote,
      TAG_DEFINITIONS.oversight,
      TAG_DEFINITIONS.amendment
    ],
    'Attributes': [
      TAG_DEFINITIONS.urgent,
      TAG_DEFINITIONS.public,
      TAG_DEFINITIONS.livestream
    ]
  };
}
