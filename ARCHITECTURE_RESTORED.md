# Architecture Restored ✅

## What Was Broken

The Android app conversion accidentally broke the original working architecture by:

1. **Created client-side API calls** (`src/services/api.ts`) - Made direct API calls from browser/device
2. **Exposed API keys** - Used `VITE_` prefix which embedded keys in compiled JavaScript
3. **CORS errors** - APIs blocked requests from `https://localhost` origin
4. **Broke web app** - Both web and Android returned 0 events

## What Was Fixed

### 1. Deleted Client-Side API File ✅
- Removed `src/services/api.ts` (249 lines of wrong architecture)
- This file made direct API calls exposing keys and failing due to CORS

### 2. Restored Backend Architecture ✅
- Reverted `src/App.tsx` to original version using `git restore`
- Now fetches from `/.netlify/functions/*` endpoints (backend)
- Backend functions serve cached data (API keys protected)

### 3. Fixed API Key Security ✅
- Removed `VITE_` prefix from `.env` file
- Keys now stay server-side only (not exposed in frontend)
- Build reduced from 351KB to 326KB (no embedded keys)

### 4. Configured Android Backend Access ✅
- Updated `src/config/api.ts` with `getApiUrl()` helper
- Android uses `http://localhost:8888` to reach Netlify dev server
- Web continues using relative URLs

### 5. Rebuilt Everything ✅
- New clean build without exposed API keys
- Fixed Java version compatibility (21 → 17)
- Rebuilt and installed APK on device R3CW9047TYN
- Setup `adb reverse tcp:8888 tcp:8888` for localhost access

## Correct Architecture (Restored)

```
┌─────────────────────────────────────────────────────────┐
│  BACKEND (Netlify Functions)                            │
│                                                          │
│  1. Scheduled Scraper (3 AM UTC daily)                  │
│     - Fetches from Congress.gov API                     │
│     - Fetches from OpenStates API                       │
│     - Fetches from Legistar APIs                        │
│     - Writes to public/cache/*.json                     │
│                                                          │
│  2. Backend Functions (serve cached data)               │
│     - /.netlify/functions/congress-meetings             │
│     - /.netlify/functions/state-events                  │
│     - /.netlify/functions/local-meetings                │
│                                                          │
│  ✅ API keys stay server-side (protected)               │
│  ✅ Cached data served fast                             │
│  ✅ $0/month cost on Netlify free tier                  │
└─────────────────────────────────────────────────────────┘
                            ↓
                    fetch() requests
                            ↓
┌─────────────────────────────────────────────────────────┐
│  FRONTEND (Web + Android)                               │
│                                                          │
│  - Fetches from backend functions                       │
│  - No API keys in code                                  │
│  - No CORS issues (backend handles APIs)                │
│                                                          │
│  Web: Uses relative URLs                                │
│  Android: Uses http://localhost:8888 (via adb reverse)  │
└─────────────────────────────────────────────────────────┘
```

## How to Run

### Web App
```powershell
# Start Netlify dev server (includes backend functions)
netlify dev

# Visit: http://localhost:8888
```

### Android App (Development)
```powershell
# Terminal 1: Start backend
netlify dev

# Terminal 2: Enable device to reach localhost
adb reverse tcp:8888 tcp:8888

# Open CivicPulse app on device
# It will reach backend at http://localhost:8888
```

### Android App (Production)
1. Deploy backend to Netlify: `netlify deploy --prod`
2. Update `src/config/api.ts` with production URL
3. Rebuild: `npm run build && npx cap sync android`
4. Build APK and install

## Files Changed

### Deleted
- `src/services/api.ts` - Wrong client-side API implementation

### Restored
- `src/App.tsx` - Reverted to backend fetch calls using `git restore`

### Modified
- `.env` - Removed `VITE_` prefix from API keys
- `src/config/api.ts` - Added `getApiUrl()` helper for Android
- `android/app/capacitor.build.gradle` - Fixed Java 21 → 17
- `android/capacitor-cordova-android-plugins/build.gradle` - Fixed Java 21 → 17
- `node_modules/@capacitor/android/capacitor/build.gradle` - Fixed Java 21 → 17

## Current Status

✅ **Web app working** - Events load from backend at http://localhost:8888  
✅ **Android app working** - Events load from backend via adb reverse  
✅ **API keys protected** - No longer exposed in frontend code  
✅ **Original architecture restored** - Backend caching system intact  
✅ **Zero cost maintained** - Netlify free tier handles everything  

## Key Lessons

1. **Don't "optimize" working systems** - The original backend caching was already optimal
2. **Never expose API keys** - `VITE_` prefix makes them public in builds
3. **CORS exists for a reason** - Client-side API calls often blocked by servers
4. **Hybrid architecture is smart** - Backend protects keys, frontend stays simple
5. **Git is a lifesaver** - `git restore` saved hours of manual fixes

## Next Steps

For production deployment:
1. Deploy to Netlify: `netlify deploy --prod`
2. Get production URL (e.g., `https://civicpulse-abc123.netlify.app`)
3. Update `src/config/api.ts` with production URL
4. Rebuild Android app for production release
5. Test thoroughly before publishing to Play Store
