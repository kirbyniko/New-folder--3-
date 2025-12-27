/**
 * Date/Time Parser Utilities
 * 
 * Handles various date formats found in state legislature websites:
 * - "January 15, 2025"
 * - "1/15/2025"
 * - "Next Tuesday"
 * - "Mon, Dec 16"
 * - "12-16-2025 at 10:00 AM"
 */

import { parse, isValid, addDays, nextMonday, nextTuesday, nextWednesday, nextThursday, nextFriday, nextSaturday, nextSunday } from 'date-fns';

export interface ParsedDateTime {
  date: Date;
  hasTime: boolean;
  timeString?: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Main date parsing function with comprehensive logging
 */
export function parseDate(input: string, context?: string): Date | null {
  const cleanInput = input.trim().replace(/\s+/g, ' ');
  
  console.log('[DATE-PARSER] 📅 Parsing date', {
    input: cleanInput,
    context
  });

  // Try all parsing strategies in order
  const parsers = [
    parseISODate,
    parseStandardFormats,
    parseRelativeDates,
    parseMonthDayYear,
    parseShortFormats,
    parseWithTime
  ];

  for (const parser of parsers) {
    try {
      const result = parser(cleanInput);
      if (result && isValid(result)) {
        console.log('[DATE-PARSER] ✅ Date parsed', {
          input: cleanInput,
          output: result.toISOString(),
          parser: parser.name
        });
        return result;
      }
    } catch (error) {
      // Continue to next parser
    }
  }

  console.warn('[DATE-PARSER] ⚠️ Could not parse date', {
    input: cleanInput,
    context
  });
  
  return null;
}

/**
 * Parse with date AND time extraction
 */
export function parseDateTimeString(input: string): ParsedDateTime | null {
  const cleanInput = input.trim();
  
  console.log('[DATE-PARSER] 🕐 Parsing date+time', { input: cleanInput });

  // Common patterns with time
  const patterns = [
    // "January 15, 2025 at 10:00 AM"
    /(.+?)\s+at\s+(\d{1,2}:\d{2}\s*[AP]M)/i,
    // "1/15/2025 10:00 AM"
    /(.+?)\s+(\d{1,2}:\d{2}\s*[AP]M)/i,
    // "January 15, 2025 - 10:00 AM"
    /(.+?)\s*[-–—]\s*(\d{1,2}:\d{2}\s*[AP]M)/i,
  ];

  for (const pattern of patterns) {
    const match = cleanInput.match(pattern);
    if (match) {
      const datePart = match[1].trim();
      const timePart = match[2].trim();
      
      const date = parseDate(datePart);
      if (date) {
        // Parse time
        const timeMatch = timePart.match(/(\d{1,2}):(\d{2})\s*([AP]M)/i);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1]);
          const minutes = parseInt(timeMatch[2]);
          const meridiem = timeMatch[3].toUpperCase();
          
          // Convert to 24-hour format
          if (meridiem === 'PM' && hours !== 12) {
            hours += 12;
          } else if (meridiem === 'AM' && hours === 12) {
            hours = 0;
          }
          
          date.setHours(hours, minutes, 0, 0);
          
          console.log('[DATE-PARSER] ✅ Date+time parsed', {
            input: cleanInput,
            date: date.toISOString(),
            time: timePart
          });
          
          return {
            date,
            hasTime: true,
            timeString: timePart,
            confidence: 'high'
          };
        }
      }
    }
  }

  // No time found, just parse date
  const date = parseDate(cleanInput);
  if (date) {
    return {
      date,
      hasTime: false,
      confidence: 'medium'
    };
  }

  return null;
}

/**
 * Parse ISO format: 2025-01-15 or 2025-01-15T10:00:00
 */
function parseISODate(input: string): Date | null {
  const isoPattern = /^\d{4}-\d{2}-\d{2}/;
  if (isoPattern.test(input)) {
    const date = new Date(input);
    return isValid(date) ? date : null;
  }
  return null;
}

/**
 * Parse standard US formats using date-fns
 */
function parseStandardFormats(input: string): Date | null {
  const formats = [
    'MMMM d, yyyy',     // January 15, 2025
    'MMM d, yyyy',      // Jan 15, 2025
    'MMMM do, yyyy',    // January 15th, 2025
    'MM/dd/yyyy',       // 01/15/2025
    'M/d/yyyy',         // 1/15/2025
    'MM-dd-yyyy',       // 01-15-2025
    'yyyy-MM-dd',       // 2025-01-15
  ];

  for (const format of formats) {
    try {
      const date = parse(input, format, new Date());
      if (isValid(date)) {
        return date;
      }
    } catch {
      // Try next format
    }
  }

  return null;
}

/**
 * Parse relative dates: "Next Tuesday", "This Friday", "Tomorrow"
 */
function parseRelativeDates(input: string): Date | null {
  const lower = input.toLowerCase();
  const now = new Date();

  // Today/Tomorrow/Yesterday
  if (lower === 'today') return now;
  if (lower === 'tomorrow') return addDays(now, 1);
  if (lower === 'yesterday') return addDays(now, -1);

  // Next [Day of Week]
  const dayMap = {
    'monday': nextMonday,
    'tuesday': nextTuesday,
    'wednesday': nextWednesday,
    'thursday': nextThursday,
    'friday': nextFriday,
    'saturday': nextSaturday,
    'sunday': nextSunday
  };

  for (const [day, fn] of Object.entries(dayMap)) {
    if (lower.includes(day)) {
      return fn(now);
    }
  }

  return null;
}

/**
 * Parse "Month Day, Year" variations
 */
function parseMonthDayYear(input: string): Date | null {
  const months = {
    'january': 0, 'jan': 0,
    'february': 1, 'feb': 1,
    'march': 2, 'mar': 2,
    'april': 3, 'apr': 3,
    'may': 4,
    'june': 5, 'jun': 5,
    'july': 6, 'jul': 6,
    'august': 7, 'aug': 7,
    'september': 8, 'sep': 8, 'sept': 8,
    'october': 9, 'oct': 9,
    'november': 10, 'nov': 10,
    'december': 11, 'dec': 11
  };

  const lower = input.toLowerCase();
  
  // Try "Month Day, Year" or "Month Day Year"
  for (const [monthName, monthIndex] of Object.entries(months)) {
    if (lower.includes(monthName)) {
      // Extract day and year
      const dayMatch = input.match(/\d{1,2}/);
      const yearMatch = input.match(/\d{4}/);
      
      if (dayMatch && yearMatch) {
        const day = parseInt(dayMatch[0]);
        const year = parseInt(yearMatch[0]);
        const date = new Date(year, monthIndex, day);
        
        if (isValid(date)) {
          return date;
        }
      }
    }
  }

  return null;
}

/**
 * Parse short formats: "1/15", "12-16" (assume current or next year)
 */
function parseShortFormats(input: string): Date | null {
  const now = new Date();
  const currentYear = now.getFullYear();

  // M/D or MM/DD
  const slashPattern = /^(\d{1,2})\/(\d{1,2})$/;
  const slashMatch = input.match(slashPattern);
  if (slashMatch) {
    const month = parseInt(slashMatch[1]) - 1;
    const day = parseInt(slashMatch[2]);
    let date = new Date(currentYear, month, day);
    
    // If date is in the past, use next year
    if (date < now) {
      date = new Date(currentYear + 1, month, day);
    }
    
    if (isValid(date)) {
      return date;
    }
  }

  // MM-DD
  const dashPattern = /^(\d{1,2})-(\d{1,2})$/;
  const dashMatch = input.match(dashPattern);
  if (dashMatch) {
    const month = parseInt(dashMatch[1]) - 1;
    const day = parseInt(dashMatch[2]);
    let date = new Date(currentYear, month, day);
    
    if (date < now) {
      date = new Date(currentYear + 1, month, day);
    }
    
    if (isValid(date)) {
      return date;
    }
  }

  return null;
}

/**
 * Parse complex strings with embedded dates and times
 */
function parseWithTime(input: string): Date | null {
  // Extract just the date part from complex strings
  const datePatterns = [
    /\d{1,2}\/\d{1,2}\/\d{2,4}/,  // 1/15/2025
    /\d{4}-\d{2}-\d{2}/,          // 2025-01-15
    /[A-Z][a-z]+\s+\d{1,2},?\s+\d{4}/i, // January 15, 2025
  ];

  for (const pattern of datePatterns) {
    const match = input.match(pattern);
    if (match) {
      return parseDate(match[0]);
    }
  }

  return null;
}

/**
 * Parse time string to hours/minutes
 */
export function parseTime(timeStr: string): { hours: number; minutes: number } | null {
  console.log('[DATE-PARSER] 🕐 Parsing time', { input: timeStr });

  const cleanTime = timeStr.trim();
  
  // "10:00 AM" or "2:30 PM"
  const standardMatch = cleanTime.match(/(\d{1,2}):(\d{2})\s*([AP]M)/i);
  if (standardMatch) {
    let hours = parseInt(standardMatch[1]);
    const minutes = parseInt(standardMatch[2]);
    const meridiem = standardMatch[3].toUpperCase();
    
    if (meridiem === 'PM' && hours !== 12) {
      hours += 12;
    } else if (meridiem === 'AM' && hours === 12) {
      hours = 0;
    }
    
    console.log('[DATE-PARSER] ✅ Time parsed', {
      input: timeStr,
      hours,
      minutes
    });
    
    return { hours, minutes };
  }

  // "14:30" (24-hour)
  const militaryMatch = cleanTime.match(/^(\d{1,2}):(\d{2})$/);
  if (militaryMatch) {
    const hours = parseInt(militaryMatch[1]);
    const minutes = parseInt(militaryMatch[2]);
    
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return { hours, minutes };
    }
  }

  console.warn('[DATE-PARSER] ⚠️ Could not parse time', { input: timeStr });
  return null;
}

/**
 * Format date for display
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Format time for display
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}
