# State Scrapers - API Setup Guide

This document explains how to set up API access for states that require authentication.

## Overview

Most state scrapers work by scraping public HTML pages and require no setup. However, some states provide official APIs that require (free) registration:

### States with Public Scraping (No Setup Required)
- ✅ **Arizona** - Public HTML/JSON endpoints
- ✅ **Tennessee** - Public HTML schedule pages
- ✅ **Massachusetts** - Public HTML calendar pages
- ✅ **Virginia** - Public HTML event pages
- ✅ All other implemented scrapers

### States Requiring API Keys (Free Registration)
- ⚙️ **Indiana** - Free public API with registration

---

## Indiana General Assembly API Setup

Indiana provides a comprehensive public API for legislative data. **Registration is free** and provides access to:
- Real-time committee schedules
- Bill tracking and status
- Legislator information
- Roll call votes
- Session calendars

### Getting Your API Key

1. **Visit the API Documentation**
   - Go to: https://docs.api.iga.in.gov/
   - Read through the API documentation

2. **Register for API Access**
   - Contact the Indiana General Assembly to request API access
   - Registration is free for public use
   - You'll receive an API token (key)

3. **Set Environment Variable**
   ```bash
   # Add to your .env file:
   INDIANA_API_KEY=your_token_here
   ```

4. **Restart the Application**
   - The Indiana scraper will automatically detect the API key
   - Events will be fetched from the live API

### API Usage

Indiana's API requires two headers with each request:

```bash
# Example API request
curl -i \
  -X GET \
  -H "Accept: application/json" \
  -H "x-api-key: your_token_here" \
  -H "User-Agent: iga-api-client-your_token_here" \
  https://api.iga.in.gov/2026/committees
```

### API Features

The Indiana API provides:
- `/2026/committees?date=YYYY-MM-DD` - Daily committee schedules
- `/2026/committees/{id}/agenda` - Committee agendas with bills
- `/2026/bills/{billname}` - Bill details and status
- `/2026/legislators` - Legislator directory

### Without API Key

If no API key is provided:
- Indiana scraper logs a warning
- Application falls back to OpenStates API data
- No real-time Indiana-specific data available

---

## Why Some States Use APIs vs Web Scraping

### API-Based States (Like Indiana)
**Advantages:**
- ✅ Structured, consistent data format (JSON)
- ✅ Real-time updates
- ✅ Official, maintained by the legislature
- ✅ Better performance (no HTML parsing)
- ✅ Rate limiting and proper usage controls

**Disadvantages:**
- ❌ Requires registration/authentication
- ❌ Subject to API key management
- ❌ May have rate limits

### Web Scraping States (Like Arizona, Tennessee)
**Advantages:**
- ✅ No authentication required
- ✅ Publicly accessible to everyone
- ✅ Works immediately without setup

**Disadvantages:**
- ❌ HTML parsing can break if site changes
- ❌ Slower than APIs
- ❌ May hit rate limits or blocks
- ❌ Requires more complex parsing logic

---

## What People Use These APIs For

Legislative APIs like Indiana's are used by:

1. **Advocacy Groups** - Track legislation affecting their causes
2. **Journalists** - Monitor legislative activity for news stories
3. **Research Organizations** - Analyze legislative patterns and trends
4. **Government Transparency Projects** - Make legislative data accessible to citizens
5. **Educational Tools** - Teach students about legislative processes
6. **Lobbyists** - Track bills and committee schedules for clients
7. **Civic Tech Projects** (like Civitron!) - Help citizens stay informed about their government

### Why Civitron is Unique

Most API users focus on:
- Bill tracking (following specific legislation)
- Legislator databases (finding representatives)
- Vote analysis (understanding voting patterns)

**Civitron focuses on something different:**
- 📅 **Event Discovery** - Finding upcoming committee meetings
- 📍 **Geographic Relevance** - Showing events near you
- 🎯 **Citizen Engagement** - Making it easy to attend or watch
- 🔗 **Direct Access** - Links to live streams and agendas

Civitron makes legislative events **discoverable and accessible** to regular citizens, not just policy professionals.

---

## Adding More API-Based States

If you want to add more states with APIs:

1. Check if the state offers a public API
2. Register for API access (usually free)
3. Create a scraper similar to `indiana.ts`
4. Add API key environment variable support
5. Document the setup process

### States Known to Have APIs
- Indiana ✅ (Implemented)
- New York (NY OpenLegislation API)
- California (Legislative Data API)
- Many others - check state legislature websites

---

## Environment Variables Summary

Add these to your `.env` file as needed:

```bash
# Indiana General Assembly
INDIANA_API_KEY=your_indiana_token_here

# Add more state API keys as implemented:
# NEW_YORK_API_KEY=your_ny_token_here
# CALIFORNIA_API_KEY=your_ca_token_here
```

---

## Troubleshooting

### "Invalid API key" Error
- Double-check your API token is correct
- Ensure no extra spaces in environment variable
- Verify you're using both required headers (x-api-key and User-Agent)

### No Events Showing for Indiana
- Check if API key environment variable is set
- Restart the application after adding the key
- Check console logs for API errors
- Verify the Indiana session is active (legislature in session)

### Rate Limits
- APIs typically have rate limits (requests per hour/day)
- The scraper respects these with built-in delays
- If you hit limits, events will be cached and reused

---

## Questions?

For API-specific questions:
- **Indiana API**: https://docs.api.iga.in.gov/
- **General Scraper Issues**: Check the scraper source code in `netlify/functions/utils/scrapers/states/`
