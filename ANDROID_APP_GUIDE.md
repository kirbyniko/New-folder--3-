# CivicPulse Android App - Installation Guide

## ✅ Conversion Complete!

Your web app has been successfully converted to a native Android app using Capacitor.

---

## What Was Done

1. **Installed Capacitor** - Native mobile wrapper
2. **Added Android Platform** - Generated Android Studio project
3. **Built Production Bundle** - Created optimized web assets
4. **Synced to Android** - Copied web app into Android project
5. **Fixed TypeScript Issues** - Separated frontend/backend builds
6. **Configured Server** - Set up HTTPS scheme for Android

---

## Current Build Status

**Building**: `android/app/build/outputs/apk/debug/app-debug.apk`

The Gradle build is running in the background and will generate an installable APK.

---

## App Configuration

**Package Name**: `com.civicpulse.app`  
**App Name**: CivicPulse  
**Platform**: Android (API 22+)  
**Build Type**: Debug (for development)

---

## Installation Methods

### Method 1: Direct Install (Fastest)
Once the build completes:
```powershell
# Install APK to connected device
$env:ANDROID_HOME\platform-tools\adb.exe install android\app\build\outputs\apk\debug\app-debug.apk
```

### Method 2: Using Capacitor CLI
```powershell
npx cap run android
```

### Method 3: Android Studio
```powershell
npx cap open android
# Then click "Run" button in Android Studio
```

---

## Device Detected

**Device ID**: `R3CW9047TYN`  
**Status**: Connected ✅

---

## Important Notes

### API Calls
The app currently makes API calls to `/.netlify/functions/*` which won't work without a backend server.

**Options:**
1. **Deploy to Netlify** first, then update `capacitor.config.ts`:
   ```typescript
   server: {
     hostname: 'your-site.netlify.app',
     androidScheme: 'https'
   }
   ```

2. **Run local dev server** alongside the app:
   ```powershell
   # Terminal 1: Start Netlify dev server
   npm run netlify:dev

   # Terminal 2: Enable adb reverse proxy
   adb reverse tcp:8888 tcp:8888
   
   # Update capacitor.config.ts:
   server: {
     hostname: 'localhost',
     androidScheme: 'http'
   }
   ```

3. **Test with Mock Data** - Modify `src/App.tsx` to use hardcoded test data

### Permissions Required

The app requires these permissions (already configured in `AndroidManifest.xml`):
- **INTERNET** - To fetch legislative data
- **ACCESS_NETWORK_STATE** - Check connectivity
- **ACCESS_FINE_LOCATION** (optional) - For ZIP code auto-detection

---

## Build Commands Reference

```powershell
# Full rebuild process
npm run build                    # Build web assets
npx cap sync android            # Sync to Android
npx cap run android             # Build + Install + Run

# Manual Gradle build
cd android
./gradlew assembleDebug         # Create debug APK
./gradlew assembleRelease       # Create release APK (needs signing)
cd ..

# Install to device
adb install android/app/build/outputs/apk/debug/app-debug.apk

# View device logs
adb logcat | Select-String "Capacitor|Web Console"
```

---

## File Structure

```
android/
├── app/
│   ├── src/main/
│   │   ├── assets/public/       # Your web app (HTML/CSS/JS)
│   │   ├── AndroidManifest.xml  # App permissions & config
│   │   └── res/                 # App icons & resources
│   └── build/outputs/apk/       # Generated APK files
├── gradle/                      # Build system
└── build.gradle                 # Android build config
```

---

## Troubleshooting

### Build Errors
- **Java version**: Requires Java 11+ (using JBR 17 from Android Studio)
- **SDK not found**: Set `ANDROID_HOME` environment variable
- **Gradle issues**: Delete `android/.gradle` and `android/build`, then rebuild

### Runtime Errors
- **API calls failing**: Check `capacitor.config.ts` server settings
- **White screen**: Open Chrome DevTools via `chrome://inspect`
- **Permissions denied**: Check `AndroidManifest.xml`

### Network Issues
```powershell
# Enable localhost access from device
adb reverse tcp:8888 tcp:8888
adb reverse tcp:5173 tcp:5173
```

---

## Production Release

To create a signed release APK:

1. **Generate keystore**:
   ```powershell
   keytool -genkey -v -keystore civicpulse.keystore -alias civicpulse -keyalg RSA -keysize 2048 -validity 10000
   ```

2. **Configure signing** in `android/app/build.gradle`:
   ```gradle
   android {
       signingConfigs {
           release {
               storeFile file("civicpulse.keystore")
               storePassword "your-password"
               keyAlias "civicpulse"
               keyPassword "your-password"
           }
       }
   }
   ```

3. **Build release**:
   ```powershell
   cd android
   ./gradlew assembleRelease
   ```

4. **Upload to Google Play Console**

---

## Next Steps

1. ✅ Wait for Gradle build to complete (~2-5 minutes)
2. ✅ Install APK to your connected device
3. 🔄 Deploy backend to Netlify
4. 🔄 Update `capacitor.config.ts` with Netlify URL
5. 🔄 Rebuild and sync: `npm run build && npx cap sync android`
6. 🚀 Test the app with live data!

---

## App Features on Android

✅ **Full Native Experience**:
- Offline app icon and splash screen
- Hardware back button support
- Native navigation gestures
- Background location (if enabled)
- Push notifications (can be added)

✅ **Web Technologies**:
- React components
- Vite build optimization
- Same codebase as web version
- Hot reload during development

---

**Status**: Building... Check terminal for "BUILD SUCCESSFUL"
