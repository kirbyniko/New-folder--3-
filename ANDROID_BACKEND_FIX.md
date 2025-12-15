# 🔧 Android App Backend Configuration Guide

## ❌ Current Problem

The Android app shows this error:
```
Search error: SyntaxError: Unexpected token '<', "<!doctype "... is not valid JSON
```

**Root Cause:** The app is trying to fetch from `/.netlify/functions/*` but:
- ✅ **Web version**: Relative paths work (Netlify handles routing)
- ❌ **Android app**: Capacitor serves from local files, can't reach backend
- Result: Gets HTML instead of JSON → parsing error

## ✅ Solution Implemented

Created `src/config/api.ts` that automatically:
- 📱 **Native (Android)**: Uses deployed Netlify URL
- 🌐 **Web**: Uses relative paths (current behavior)

## 📋 Next Steps: Choose Your Option

### Option 1: Deploy to Netlify (Recommended)

#### Step 1: Login to Netlify
```powershell
npx netlify-cli login
```
This opens your browser to authorize.

#### Step 2: Check if site already exists
```powershell
npx netlify-cli status
```

#### Step 3a: If site EXISTS, get the URL
```powershell
npx netlify-cli status
# Look for "Site url: https://your-site-name.netlify.app"
```

#### Step 3b: If NO site, create one
```powershell
# Link to existing site (if you have one)
npx netlify-cli link

# OR create new site
npx netlify-cli init
```

#### Step 4: Deploy!
```powershell
# Deploy to production
npx netlify-cli deploy --prod

# You'll get output like:
# ✔ Finished hashing 12 files
# ✔ Deploy is live!
# Website URL: https://your-site-name.netlify.app
```

#### Step 5: Update API config with your URL
Edit `src/config/api.ts` and replace:
```typescript
const NETLIFY_SITE_URL = 'https://YOUR_SITE.netlify.app'; // ← Change this
```
With your actual URL:
```typescript
const NETLIFY_SITE_URL = 'https://civic-pulse-abc123.netlify.app'; // ← Your actual URL
```

#### Step 6: Rebuild and redeploy app
```powershell
# Rebuild web assets
npm run build

# Sync to Android
npx cap sync android

# Build new APK
$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
cd android
./gradlew assembleDebug
cd ..

# Install to device
&"$env:ANDROID_HOME\platform-tools\adb.exe" install -r "android\app\build\outputs\apk\debug\app-debug.apk"
```

---

### Option 2: Use Localhost (Development Only)

If you want to test with local backend:

#### Step 1: Enable ADB reverse proxy
This makes your device's `localhost:8888` point to your computer:
```powershell
&"$env:ANDROID_HOME\platform-tools\adb.exe" reverse tcp:8888 tcp:8888
```

#### Step 2: Update API config for localhost
Edit `src/config/api.ts`:
```typescript
const NETLIFY_SITE_URL = 'http://localhost:8888'; // ← Use localhost
```

#### Step 3: Start local dev server
```powershell
# Terminal 1: Start Netlify dev server
npm run netlify:dev
# Wait for "Server now ready on http://localhost:8888"
```

#### Step 4: Rebuild and reinstall app
```powershell
# Rebuild web assets
npm run build

# Sync to Android
npx cap sync android

# Reinstall (no need to rebuild APK, just sync is enough)
npx cap run android
```

#### Step 5: Keep dev server running
While testing, keep `npm run netlify:dev` running in a terminal.

**⚠️ Limitations:**
- Device must stay connected via USB
- Dev server must keep running
- Only works on YOUR device (can't share APK)

---

## 🎯 Current Status

### Files Modified:
1. ✅ **src/config/api.ts** (NEW) - API base URL configuration
2. ✅ **src/App.tsx** - Updated all fetch calls to use `getApiUrl()`

### Next Action Required:
1. Choose Option 1 (Netlify) or Option 2 (localhost)
2. Update `NETLIFY_SITE_URL` in `src/config/api.ts`
3. Rebuild → Sync → Install

### Testing After Fix:
Open app and search for events. You should see:
- ✅ Federal events from Congress API
- ✅ State events from your state
- ✅ Local meetings from nearby cities
- ❌ No more JSON parsing errors!

---

## 🐛 Troubleshooting

### Still getting HTML instead of JSON?
```powershell
# Check what URL the app is using
&"$env:ANDROID_HOME\platform-tools\adb.exe" logcat -s "Capacitor/Console" | Select-String "Fetching"
```

### Can't reach Netlify URL?
```powershell
# Test from device browser
&"$env:ANDROID_HOME\platform-tools\adb.exe" shell am start -a android.intent.action.VIEW -d "https://your-site.netlify.app"
```

### Localhost not working?
```powershell
# Verify reverse proxy
&"$env:ANDROID_HOME\platform-tools\adb.exe" reverse --list
# Should show: tcp:8888 -> tcp:8888

# Test from device
&"$env:ANDROID_HOME\platform-tools\adb.exe" shell curl http://localhost:8888
```

---

## 📚 Reference Commands

### Netlify Deployment
```powershell
npx netlify-cli login        # Login once
npx netlify-cli status       # Check current site
npx netlify-cli deploy       # Deploy to draft
npx netlify-cli deploy --prod # Deploy to production
```

### Android Build
```powershell
npm run build                # Build web assets
npx cap sync android         # Sync to Android
npx cap run android          # Build + Install + Launch
```

### ADB Device Management
```powershell
&"$env:ANDROID_HOME\platform-tools\adb.exe" devices           # List devices
&"$env:ANDROID_HOME\platform-tools\adb.exe" reverse tcp:8888 tcp:8888  # Enable localhost
&"$env:ANDROID_HOME\platform-tools\adb.exe" reverse --remove-all       # Clear reverse
&"$env:ANDROID_HOME\platform-tools\adb.exe" logcat -c                  # Clear logs
```

### Logs
```powershell
# View app console logs
&"$env:ANDROID_HOME\platform-tools\adb.exe" logcat -s "Capacitor/Console"

# View all app logs
&"$env:ANDROID_HOME\platform-tools\adb.exe" logcat | Select-String "civicpulse"
```
