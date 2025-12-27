/**
 * Unified Tagging and Public Participation Detection
 * Standardizes topic tagging and citizen participation detection across all scrapers
 * Based on the most advanced implementation from Arkansas scraper
 */

/**
 * Topic keywords for automatic event tagging
 * Expanded to cover all policy areas
 */
const TOPIC_KEYWORDS: Record<string, string[]> = {
  'Healthcare': ['health', 'medical', 'hospital', 'insurance', 'medicaid', 'medicare', 'patient', 'doctor', 'nurse', 'clinic', 'prescription'],
  'Education': ['education', 'school', 'student', 'teacher', 'university', 'college', 'learning', 'curriculum', 'k-12', 'early childhood'],
  'Environment': ['environment', 'climate', 'pollution', 'conservation', 'water quality', 'air quality', 'renewable', 'sustainability', 'wildlife'],
  'Transportation': ['transportation', 'highway', 'road', 'vehicle', 'traffic', 'infrastructure', 'transit', 'bridge', 'rail', 'airport'],
  'Public Safety': ['police', 'fire', 'emergency', 'safety', 'crime', 'law enforcement', 'security', 'homeland'],
  'Tax': [' tax ', 'taxation', 'property tax', 'sales tax', 'revenue', 'irs', 'fiscal'],
  'Veterans': ['veteran', 'military', 'armed forces', 'service member', 'va ', 'gi bill'],
  'Technology': ['technology', 'digital', 'internet', 'cyber', 'data', 'broadband', 'privacy', 'ai ', 'artificial intelligence'],
  'Housing': ['housing', 'residential', 'property', 'real estate', 'zoning', 'affordable housing', 'rent', 'landlord', 'tenant', 'homeless'],
  'Labor': ['labor', 'employment', 'worker', 'workplace', 'wage', 'employee', 'union', 'osha', 'benefits', 'retirement'],
  'Agriculture': ['agriculture', 'farm', 'farming', 'livestock', 'rural', 'crop', 'food', 'usda', 'pesticide'],
  'Criminal Justice': ['criminal', 'prison', 'parole', 'sentencing', 'felony', 'court', 'judge', 'prosecution', 'defendant'],
  'Commerce': ['business', 'commerce', 'trade', 'economic', 'industry', 'small business', 'entrepreneur', 'development'],
  'Government Operations': ['government', 'administrative', 'agency', 'department', 'procurement', 'oversight'],
  'Budget': ['budget', 'appropriation', 'funding', 'fiscal', 'expenditure', 'spending', 'allocation'],
  'Civil Rights': ['civil rights', 'discrimination', 'equal', 'accessibility', 'voting rights', 'freedom'],
  'Energy': ['energy', 'power', 'electricity', 'gas', 'oil', 'coal', 'nuclear', 'solar', 'wind', 'utility'],
  'Immigration': ['immigration', 'immigrant', 'refugee', 'asylum', 'border', 'citizenship', 'visa', 'deportation'],
  'Defense': ['defense', 'army', 'navy', 'air force', 'marines', 'national security', 'pentagon'],
  'Justice': ['justice', 'legal', 'attorney', 'litigation', 'lawsuit', 'settlement']
};

/**
 * Special action/characteristic patterns
 */
const SPECIAL_PATTERNS: Record<string, string[]> = {
  'Amendment': ['amending', 'amended', 'amendment', 'revise', 'revision'],
  'Funding': ['appropriation', 'grant', 'funding', 'financial assistance', 'allocation'],
  'Enforcement': ['penalty', 'penalties', 'enforcement', 'violation', 'fine'],
  'Regulation': ['regulation', 'licensing', 'permit', 'compliance', 'standards'],
  'Emergency': ['emergency', 'urgent', 'crisis', 'disaster', 'immediate']
};

/**
 * Public participation keyword patterns
 * Detects opportunities for citizen engagement
 */
const PARTICIPATION_KEYWORDS = [
  'public comment',
  'public testimony',
  'oral argument',
  'citizen input',
  'community input',
  'written testimony',
  'public hearing',
  'public participation',
  'open to public',
  'public speaking',
  'citizen testimony'
];

/**
 * Generate topic tags from text using keyword matching
 * @param text - Event name, description, committee name, or document text
 * @param maxTags - Maximum number of tags to return (default: 5)
 * @returns Array of topic tags
 */
export function generateEventTags(text: string, maxTags: number = 5): string[] {
  if (!text) return [];
  
  const tags: Set<string> = new Set();
  const lowerText = text.toLowerCase();
  
  // Match topic keywords
  for (const [tag, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    if (keywords.some(keyword => lowerText.includes(keyword.toLowerCase()))) {
      tags.add(tag);
    }
  }
  
  // Match special patterns
  for (const [tag, keywords] of Object.entries(SPECIAL_PATTERNS)) {
    if (keywords.some(keyword => lowerText.includes(keyword.toLowerCase()))) {
      tags.add(tag);
    }
  }
  
  // Limit to max tags
  return Array.from(tags).slice(0, maxTags);
}

/**
 * Detect if an event allows public participation
 * @param text - Event name, description, or document text to analyze
 * @returns Object with participation status and detected characteristics
 */
export function detectPublicParticipation(text: string): {
  allowed: boolean;
  characteristics: string[];
} {
  if (!text) return { allowed: false, characteristics: [] };
  
  const lowerText = text.toLowerCase();
  const characteristics: string[] = [];
  
  // Check for public comment period
  if (lowerText.includes('public comment') || lowerText.includes('public testimony')) {
    characteristics.push('Public comment period');
  }
  
  // Check for oral participation
  if (lowerText.includes('oral argument') || 
      lowerText.includes('citizen input') || 
      lowerText.includes('public speaking') ||
      lowerText.includes('public hearing')) {
    characteristics.push('Public participation allowed');
  }
  
  // Check for written testimony
  if (lowerText.includes('written testimony') || 
      lowerText.includes('written comment') ||
      lowerText.includes('submit testimony')) {
    characteristics.push('Written testimony accepted');
  }
  
  // Check for community input opportunities
  if (lowerText.includes('community input') || 
      lowerText.includes('open to public') ||
      lowerText.includes('citizen testimony')) {
    characteristics.push('Community engagement opportunity');
  }
  
  return {
    allowed: characteristics.length > 0,
    characteristics
  };
}

/**
 * Convenience function to apply both tagging and participation detection
 * @param event - Event object with text fields to analyze
 * @returns Updated event with tags and participation flag
 */
export function enrichEventMetadata(event: {
  name: string;
  description?: string;
  committee?: string;
  tags?: string[];
  allowsPublicParticipation?: boolean;
}, analysisText?: string): void {
  // Combine all available text for analysis
  const textToAnalyze = analysisText || [
    event.name,
    event.description || '',
    event.committee || ''
  ].join(' ');
  
  // Generate tags if not already set
  if (!event.tags || event.tags.length === 0) {
    event.tags = generateEventTags(textToAnalyze);
  }
  
  // Detect public participation
  const participation = detectPublicParticipation(textToAnalyze);
  event.allowsPublicParticipation = participation.allowed;
  
  // Optionally append participation info to description
  if (participation.allowed && participation.characteristics.length > 0) {
    const participationNote = participation.characteristics.join(', ');
    if (event.description && !event.description.includes(participationNote)) {
      event.description = `${event.description} | ${participationNote}`;
    } else if (!event.description) {
      event.description = participationNote;
    }
  }
}
