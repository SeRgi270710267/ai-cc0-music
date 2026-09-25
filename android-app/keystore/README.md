# Release keystore (not in git)

The release signing keystore and passwords are **not** committed.

For the v1.0.0-android release they were generated on the build agent and stored privately.

To rebuild a signed APK locally:

1. Copy your `.jks` to `android/keystore/aicc0music-release.jks`
2. Create `android/keystore.properties` (gitignored):

```
storeFile=keystore/aicc0music-release.jks
storePassword=...
keyAlias=aicc0music
keyPassword=...
```

3. `cd android && ./gradlew assembleRelease`

Package: `com.aicc0music.player` · versionCode `1` · versionName `1.0.0`
