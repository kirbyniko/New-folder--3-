/**
 * Server-side Automatic Event Tagging System
 * Analyzes event content to assign relevant tags for filtering and discovery
 */

const KEYWORD_PATTERNS: Record<string, string[]> = {
  healthcare: [
    'health', 'medical', 'hospital', 'medicare', 'medicaid', 'insurance',
    'patient', 'doctor', 'nurse', 'pharmacy', 'prescription', 'disease',
    'mental health', 'opioid', 'drug', 'vaccine', 'pandemic', 'covid'
  ],
  education: [
    'education', 'school', 'student', 'teacher', 'university', 'college',
    'curriculum', 'learning', 'classroom', 'scholarship', 'tuition'
  ],
  environment: [
    'environment', 'climate', 'pollution', 'conservation', 'wildlife',
    'water', 'air quality', 'recycling', 'green', 'sustainable', 'emissions',
    'carbon', 'renewable', 'solar', 'wind'
  ],
  economy: [
    'economy', 'economic', 'business', 'commerce', 'trade', 'market',
    'jobs', 'employment', 'unemployment', 'growth', 'gdp'
  ],
  transportation: [
    'transportation', 'transit', 'highway', 'road', 'bridge', 'rail',
    'train', 'bus', 'metro', 'traffic', 'infrastructure', 'dmv', 'vehicle'
  ],
  housing: [
    'housing', 'affordable housing', 'homeless', 'rent', 'landlord',
    'tenant', 'eviction', 'mortgage', 'real estate', 'zoning', 'development'
  ],
  justice: [
    'justice', 'criminal', 'crime', 'police', 'law enforcement', 'court',
    'prison', 'jail', 'sentencing', 'reform', 'public safety'
  ],
  technology: [
    'technology', 'tech', 'digital', 'internet', 'cyber', 'data',
    'privacy', 'broadband', 'telecommunications', 'ai', 'artificial intelligence'
  ],
  agriculture: [
    'agriculture', 'farm', 'crop', 'livestock', 'rural', 'food',
    'agricultural', 'fishing', 'forestry', 'ranch'
  ],
  energy: [
    'energy', 'power', 'electricity', 'utility', 'oil', 'gas',
    'nuclear', 'coal', 'grid'
  ],
  defense: [
    'defense', 'military', 'armed forces', 'national security', 'veterans',
    'homeland security', 'terrorism', 'armed services'
  ],
  immigration: [
    'immigration', 'immigrant', 'border', 'citizenship', 'visa',
    'refugee', 'asylum', 'deportation', 'naturalization'
  ],
  tax: [
    'tax', 'revenue', 'budget', 'fiscal', 'finance', 'appropriations',
    'spending', 'deficit', 'bonds', 'treasury', 'irs'
  ],
  labor: [
    'labor', 'worker', 'union', 'wage', 'minimum wage', 'overtime',
    'workplace', 'employment', 'unemployment', 'job'
  ],
  veterans: [
    'veteran', 'va ', 'veterans affairs', 'military service', 'gi bill'
  ],
  
  // Event Types
  budget: [
    'budget', 'appropriations', 'fiscal', 'spending', 'funding', 'finance'
  ],
  hearing: [
    'hearing', 'testimony', 'public comment', 'public hearing', 'witness'
  ],
  vote: [
    'vote', 'voting', 'ballot', 'election', 'referendum', 'markup'
  ],
  oversight: [
    'oversight', 'investigation', 'audit', 'review', 'inquiry', 'examination'
  ],
  amendment: [
    'amendment', 'amend', 'modify', 'revision', 'change'
  ],
  
  // Urgency/Status
  urgent: [
    'urgent', 'emergency', 'crisis', 'immediate', 'critical'
  ],
  public: [
    'public input', 'public comment', 'public participation', 'citizen input',
    'town hall', 'community input'
  ],
  livestream: [
    'livestream', 'webcast', 'video', 'broadcast', 'streaming'
  ]
};

/**
 * Automatically tag an event based on its content
 */
export function autoTagEvent(event: {
  name: string;
  description?: string | null;
  committee?: string | null;
  location?: string | null;
}): string[] {
  const tags = new Set<string>();
  
  // Only analyze name, description, and committee (exclude location to avoid street address false positives)
  const searchText = [
    event.name || '',
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
