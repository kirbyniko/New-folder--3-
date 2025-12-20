# Legislative Meeting Agenda PDF Parser Guide

## Overview
This guide shows how to extract bills, tags, virtual meeting links, and public participation info from legislative meeting agendas. Based on proven patterns from OK, NH, TX, and NV scrapers.

## Core Capabilities

### 1. PDF Text Extraction (Oklahoma Pattern)
**What it does:** Extracts raw text from PDF agenda files for bill/keyword analysis

```typescript
// Oklahoma: netlify/functions/utils/scrapers/states/oklahoma.ts:113-150
private async extractBillsFromPDF(pdfUrl: string): Promise<string[]> {
  // Lazy load pdfjs-dist (avoids Node.js compatibility issues)
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  
  const response = await fetch(pdfUrl);
  const arrayBuffer = await response.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);
  
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;
  
  let fullText = '';
  
  // Extract text from ALL pages
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += pageText + '\n';
  }
  
  // Extract bill numbers (HB #### or SB ####)
  const billMatches = fullText.match(/[HS]B\s*\d{1,5}/gi);
  if (billMatches) {
    return [...new Set(billMatches.map(b => b.replace(/\s+/g, ' ').toUpperCase()))];
  }
  
  return [];
}
```

**Key Points:**
- Use `pdfjs-dist/legacy/build/pdf.mjs` for Node.js compatibility
- Process ALL pages (don't stop at page 1)
- Extract text using `getTextContent()` → `items.map(item => item.str)`
- Use regex to find bill patterns specific to state format

### 2. Tag Generation from Text (Texas Pattern)
**What it does:** Categorizes bills/meetings by topic using keyword matching

```typescript
// Texas: netlify/functions/utils/scrapers/states/texas.ts:232-270
private generateTags(text: string): string[] {
  if (!text) return [];
  
  const tags: Set<string> = new Set();
  const lowerText = text.toLowerCase();
  
  const topicKeywords: Record<string, string[]> = {
    'Healthcare': ['health', 'medical', 'hospital', 'medicaid', 'patient'],
    'Education': ['education', 'school', 'student', 'teacher', 'university'],
    'Environment': ['environment', 'climate', 'pollution', 'conservation'],
    'Transportation': ['highway', 'road', 'vehicle', 'traffic'],
    'Public Safety': ['police', 'fire', 'emergency', 'safety', 'crime'],
    'Tax': [' tax ', 'taxation', 'property tax', 'sales tax'],
    'Veterans': ['veteran', 'military', 'armed forces'],
    'Technology': ['technology', 'digital', 'internet', 'cyber'],
    'Housing': ['housing', 'residential', 'zoning', 'real estate'],
    'Labor': ['labor', 'employment', 'worker', 'wage'],
    'Agriculture': ['agriculture', 'farm', 'livestock', 'crop'],
    'Criminal Justice': ['criminal', 'prison', 'parole', 'sentencing'],
    'Commerce': ['business', 'commerce', 'trade', 'economic'],
    'Government Operations': ['government', 'administrative', 'agency'],
    'Consumer Protection': ['consumer', 'protection', 'fraud'],
    'Civil Rights': ['civil rights', 'discrimination', 'equal']
  };
  
  // Match keywords
  for (const [tag, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      tags.add(tag);
    }
  }
  
  // Special patterns
  if (lowerText.includes('amending')) tags.add('Amendment');
  if (lowerText.includes('appropriation')) tags.add('Funding');
  if (lowerText.includes('penalty')) tags.add('Enforcement');
  
  return Array.from(tags).slice(0, 5); // Limit to top 5
}
```

### 3. Virtual Meeting Link Extraction (New Hampshire Pattern)
**What it does:** Finds Zoom/Teams/Webex links from event pages

```typescript
// New Hampshire: netlify/functions/utils/scrapers/states/new-hampshire.ts:415-425
private extractVirtualMeetingUrl(html: string): string | undefined {
  // Try Zoom
  const zoomMatch = html.match(/https:\/\/[^\s<>"]+zoom\.us[^\s<>"]*/i);
  if (zoomMatch) return zoomMatch[0];
  
  // Try Teams
  const teamsMatch = html.match(/https:\/\/[^\s<>"]+teams\.microsoft\.com[^\s<>"]*/i);
  if (teamsMatch) return teamsMatch[0];
  
  // Try Webex
  const webexMatch = html.match(/https:\/\/[^\s<>"]+webex\.com[^\s<>"]*/i);
  if (webexMatch) return webexMatch[0];
  
  return undefined;
}
```

### 4. Public Participation Detection (Nevada Pattern)
**What it does:** Identifies if meetings allow public comment/testimony

```typescript
// Nevada: netlify/functions/utils/scrapers/states/nevada.ts:119-120
const nameLower = meetingName.toLowerCase();
const characteristics: string[] = [];

if (nameLower.includes('public comment') || nameLower.includes('public hearing')) {
  characteristics.push('public comment period');
}
if (nameLower.includes('testimony') || nameLower.includes('written testimony')) {
  characteristics.push('testimony accepted');
}
if (nameLower.includes('oral argument') || nameLower.includes('citizen input')) {
  characteristics.push('public participation allowed');
}

// Add to event description
event.description += characteristics.length > 0 
  ? ` | ${characteristics.join(', ')}` 
  : '';
```

## Complete Arkansas Integration Example

```typescript
// Arkansas scraper with full PDF agenda parsing
async scrapeCalendar(): Promise<RawEvent[]> {
  const baseUrl = 'https://www.arkleg.state.ar.us';
  const calendarUrl = `${baseUrl}/Calendars/Meetings?listview=month`;
  
  const response = await fetch(calendarUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0...' }
  });
  const html = await response.text();
  const $ = cheerio.load(html);
  
  const events: RawEvent[] = [];
  
  $('.row[data-fixed="true"]').each((_, row) => {
    const $row = $(row);
    
    // Extract basic meeting info
    const committeeName = $row.find('.col-md-5 a').text().trim();
    const time = $row.find('.timeRow b').text().trim();
    
    // Extract agenda PDF link
    const agendaLink = $row.find('a[aria-label="Agenda"]').attr('href');
    const agendaPdfUrl = agendaLink 
      ? `${baseUrl}${agendaLink}` 
      : undefined;
    
    // Parse date/time
    const parsedDate = this.parseDateTime(currentDate, time);
    
    const event: RawEvent = {
      name: committeeName,
      date: parsedDate.toISOString(),
      time,
      location: 'State Capitol, Little Rock, AR',
      committee: committeeName,
      type: 'committee-meeting',
      sourceUrl: calendarUrl, // Calendar page, not committee detail
      docketUrl: agendaPdfUrl, // PDF agenda URL
      bills: [],
      tags: []
    };
    
    events.push(event);
  });
  
  // Enrich events with PDF data
  for (const event of events) {
    if (event.docketUrl) {
      await this.enrichEventFromPDF(event);
    }
  }
  
  return events;
}

private async enrichEventFromPDF(event: RawEvent): Promise<void> {
  try {
    // Step 1: Extract text from PDF
    const pdfText = await this.extractPDFText(event.docketUrl!);
    
    // Step 2: Find bills
    const billMatches = pdfText.match(/[HS]B\s*\d{1,5}/gi);
    if (billMatches) {
      const uniqueBills = [...new Set(billMatches)];
      event.bills = uniqueBills.map(billId => ({
        id: billId.toUpperCase().replace(/\s+/g, ' '),
        title: 'Pending bill analysis',
        url: `${baseUrl}/Bills/${billId.replace(/\s+/g, '')}`,
        status: 'On Agenda'
      }));
    }
    
    // Step 3: Generate tags from agenda text
    event.tags = this.generateTags(pdfText);
    
    // Step 4: Check for virtual meeting info
    if (pdfText.toLowerCase().includes('zoom') || pdfText.includes('zoom.us')) {
      const zoomMatch = pdfText.match(/https:\/\/[^\s]+zoom\.us[^\s]*/i);
      if (zoomMatch) event.virtualMeetingUrl = zoomMatch[0];
    }
    
    // Step 5: Check for public participation
    const lowerText = pdfText.toLowerCase();
    if (lowerText.includes('public comment') || 
        lowerText.includes('public testimony') ||
        lowerText.includes('oral argument')) {
      event.description = `${event.committee} meeting - Public participation allowed`;
    }
    
  } catch (error) {
    console.error(`Failed to enrich event ${event.name}:`, error);
  }
}

private async extractPDFText(pdfUrl: string): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  
  const response = await fetch(pdfUrl);
  const arrayBuffer = await response.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);
  
  const pdf = await (pdfjsLib.getDocument({ data }).promise);
  let fullText = '';
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    fullText += content.items.map((item: any) => item.str).join(' ') + '\n';
  }
  
  return fullText;
}
```

## Key Data Flow

```
1. Scrape calendar page → Get meeting list + agenda PDF URLs
2. For each meeting with PDF:
   a. Download PDF
   b. Extract all text using pdfjs-dist
   c. Find bill numbers with regex
   d. Generate tags from keywords
   e. Search for virtual meeting URLs
   f. Detect public participation keywords
3. Populate RawEvent fields:
   - sourceUrl: Calendar page
   - docketUrl: PDF agenda URL
   - bills: Array of BillInfo
   - tags: Topic tags
   - virtualMeetingUrl: Zoom/Teams link
   - description: Include participation info
```

## RawEvent Interface (All Available Fields)

```typescript
export interface RawEvent {
  name: string;                    // Meeting name
  date: string | Date;             // ISO date
  time?: string;                   // Display time
  location?: string;               // Physical location
  committee?: string;              // Committee name
  type?: string;                   // 'committee-meeting'
  description?: string;            // Rich description with tags
  detailsUrl?: string;            // Meeting detail page
  
  // Enhanced fields:
  docketUrl?: string;             // PDF agenda URL
  virtualMeetingUrl?: string;     // Zoom/Teams/Webex
  bills?: BillInfo[];             // Bills on agenda
  tags?: string[];                // Topic tags
  sourceUrl?: string;             // Calendar page URL
}

export interface BillInfo {
  id: string;                     // 'HB 123'
  title: string;                  // Bill title
  url: string;                    // Bill detail page
  status?: string;                // 'On Agenda'
  sponsors?: string[];            // Sponsors (if available)
  tags?: string[];                // Bill-specific tags
}
```

## Arkansas-Specific Adaptations

1. **Agenda PDF Format:** HTML entities in URLs (`&#x2B;` = `+`)
   - Decode: `/Home/FTPDocument?path=%2FAssembly%2FMeeting+Attachments...`

2. **Bill Pattern:** Arkansas uses `HB ####`, `SB ####`, no prefix variations

3. **Committee Structure:** ALC (Arkansas Legislative Council) + subcommittees

4. **Virtual Meetings:** Rare - most in-person at State Capitol

5. **Public Comment:** Check agenda text for "public comment period" section

## Testing Checklist

- [ ] PDF downloads successfully
- [ ] Text extracted from all pages
- [ ] Bills detected and deduplicated
- [ ] Tags generated (limit 5)
- [ ] Virtual links detected (if present)
- [ ] Public participation noted
- [ ] sourceUrl = calendar page (not committee page)
- [ ] docketUrl = PDF agenda URL

## Dependencies

```json
{
  "pdfjs-dist": "^4.0.0"  // Use legacy build for Node.js
}
```

Import: `import('pdfjs-dist/legacy/build/pdf.mjs')`
