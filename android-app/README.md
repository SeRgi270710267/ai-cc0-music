# AI CC0 Music — Capacitor Android wrapper

Native Android shell that loads the **live** GitHub Pages site:

https://sergi270710267.github.io/ai-cc0-music/

The static Pages site remains the source of truth. This project does **not** change `pages.yml` / `sync-catalog.yml` or rewrite SPA files (`index.html`, `boot.js`, etc.).

## Package

| Field | Value |
|-------|-------|
| appId / applicationId | `com.aicc0music.player` |
| appName | AI CC0 Music |
| versionCode | 1 |
| versionName | 1.0.0 |
| minSdk | 24 |
| target/compileSdk | 36 |

## Requirements

- Node.js >= 22
- JDK 17+ (21 OK)
- Android SDK: platform-tools, build-tools 35.0.0, platforms;android-36
- `ANDROID_HOME` / `ANDROID_SDK_ROOT` set

## Rebuild release APK

```bash
cd android-app
npm install
npx cap sync android
# Place keystore + keystore.properties (gitignored) under android/
cd android
./gradlew assembleRelease
# APK: app/build/outputs/apk/release/app-release.apk
```

`android/keystore.properties` format:

```
storeFile=keystore/aicc0music-release.jks
storePassword=...
keyAlias=aicc0music
keyPassword=...
```

Signing keys for the published v1.0.0-android release were generated on the build agent and are **not** in this repo. Keep your own copy of the keystore to ship updates with the same signature.

## Config notes

- `capacitor.config.json` → `server.url` points at the live Pages URL (HTTPS only).
- Navigation allowed to `mureka.ai` / `static-cos.mureka.ai` for audio & covers.
- `INTERNET` permission; WebView media playback without user gesture; `keepScreenOn` on the main activity.

After clone, run `npx cap sync android` to restore generated Android assets/icons if needed.
