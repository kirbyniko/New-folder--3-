# Civitron

> Discover upcoming legislative events near you - Real government data from official APIs

Civitron helps citizens find and participate in upcoming legislative events (committee meetings, hearings, town halls) near any US ZIP code using **official government APIs only**.

## 🎯 Features

- **Federal Events**: Real-time data from Congress.gov API (House & Senate committee meetings)
- **State Events**: Live state legislative events from OpenStates API (all 50 states)
- **Accurate Distance**: Haversine formula calculates exact distances from your location
- **No Mock Data**: Only real government data - clear errors if APIs fail
- **Scalable**: Works for ANY US ZIP code - no hardcoded cities

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- API keys (both free):
  1. **Congress.gov API**: https://api.congress.gov/sign-up/
  2. **OpenStates API**: https://open.pluralpolicy.com/accounts/profile/

### Installation

1. **Clone and install dependencies**:
   ```bash
   npm install
   ```

2. **Create `.env` file** (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```

3. **Add your API keys** to `.env`:
   ```env
   VITE_CONGRESS_API_KEY=your_congress_api_key_here
   VITE_OPENSTATES_API_KEY=your_openstates_api_key_here
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```
   
   Open http://localhost:5173

### Development with Netlify Functions

To test the serverless functions locally:

```bash
npm run netlify:dev
```

This runs both Vite dev server and Netlify Functions locally.

## 📦 Project Structure

```
civicpulse/
├── netlify/
│   └── functions/
│       ├── congress-meetings.ts    # Federal events API
│       └── state-events.ts         # State events API
├── src/
│   ├── types/
│   │   └── event.ts               # TypeScript interfaces
│   ├── utils/
│   │   └── geocoding.ts           # Geocoding & distance calc
│   ├── App.tsx                     # Main React component
│   ├── App.css                     # Styles
│   ├── main.tsx                    # Entry point
│   └── index.css                   # Global styles
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── netlify.toml                    # Netlify configuration
├── .env.example                    # Template for API keys
└── README.md
```

## 🔧 Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Netlify Functions (serverless)
- **APIs**: 
  - Congress.gov API v3 (federal data)
  - OpenStates API v3 (state data)
  - OpenStreetMap Nominatim (geocoding)
- **Styling**: Pure CSS with gradients

## 📡 API Documentation

### Congress.gov API

- **Endpoint**: `GET https://api.congress.gov/v3/committee-meeting/{congress}`
- **Authentication**: API key in query parameter
- **Rate Limit**: ~10 requests/minute recommended
- **Docs**: https://api.congress.gov/

### OpenStates API

- **Endpoint**: `GET https://v3.openstates.org/events`
- **Authentication**: API key in `X-API-KEY` header
- **Rate Limit**: ~10 requests/minute recommended
- **Docs**: https://docs.openstates.org/api-v3/

### Nominatim (Geocoding)

- **Endpoint**: `GET https://nominatim.openstreetmap.org/search`
- **Authentication**: None (requires User-Agent header)
- **Rate Limit**: 1 request/second
- **Docs**: https://nominatim.org/release-docs/latest/api/Search/

## 🚢 Deployment

### Netlify

1. **Connect repository** to Netlify
2. **Add environment variables** in Netlify dashboard:
   - `VITE_CONGRESS_API_KEY`
   - `VITE_OPENSTATES_API_KEY`
3. **Deploy** - Netlify auto-detects configuration from `netlify.toml`

Build command: `npm run build`  
Publish directory: `dist`  
Functions directory: `lib/functions`

## 🧪 Testing

### Test Federal Events
1. Enter any US ZIP code (e.g., `20515` for Washington DC)
2. Should return upcoming Congressional committee meetings
3. Verify dates are in the future

### Test State Events
1. Enter a ZIP code in a specific state (e.g., `95814` for Sacramento, CA)
2. Should return California state legislative events
3. Verify events are from the correct state

### Test Distance Calculation
1. Search with `90210` (Beverly Hills, CA) and radius 100 miles
2. Events should show accurate distances
3. Only events within 100 miles should appear

## 🛠️ Common Issues

### "API key not configured"
- Make sure `.env` file exists in project root
- Verify both API keys are set in `.env`
- Restart dev server after adding keys

### "ZIP code not found"
- Enter valid 5-digit US ZIP codes only
- Try a major city ZIP code (e.g., `10001` for NYC)

### No events found
- Some states/times may have fewer legislative events
- Try increasing search radius
- Federal events are always available (Washington DC)

## 📝 Development Notes

### Why no local events?
Municipal governments don't have unified APIs. Options explored:
- **Legistar API**: Requires paid enterprise access (~200 cities)
- **Individual city APIs**: Too fragmented to scale
- **Future**: May add crowdsourced local events

### Rate Limiting
Both APIs have rate limits. The app includes:
- 1-hour caching (Cache-Control headers)
- Sequential API calls (not parallel)
- Error handling with user-friendly messages

### Data Freshness
- Federal events: Updated when Congress schedules meetings
- State events: Updated by state legislatures
- Cache: 1 hour (events don't change frequently)

## 🤝 Contributing

This is a civic engagement platform. Contributions welcome:
- Additional data sources
- UI/UX improvements
- Accessibility enhancements
- Documentation updates

## 📄 License

MIT License - Free for non-commercial use

## 🔗 Resources

- [Congress.gov API Docs](https://api.congress.gov/)
- [OpenStates API Docs](https://docs.openstates.org/api-v3/)
- [Netlify Functions Docs](https://docs.netlify.com/functions/overview/)
- [Vite Docs](https://vitejs.dev/)

## 🎯 Success Criteria

✅ Search any US ZIP code → Returns real upcoming events  
✅ Federal events → From Congress.gov API  
✅ State events → From OpenStates API (for detected state)  
✅ Accurate distances → Using Haversine formula  
✅ NO fallbacks → Real data only, clear errors if API fails  
✅ Scalable → Works for ANY ZIP code, no hardcoding

---

**Built with real government data. No mock data. No web scraping.**
