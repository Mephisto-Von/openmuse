# Releasing OpenMuse

`.github/workflows/release.yml` builds the Android APK/AAB, Linux AppImage/deb, Windows
installer/portable, and signed macOS DMG/zip on a tag, then publishes them with
`SHA256SUMS.txt`. Nothing else needs to run locally.

```sh
# match the versions in package.json, apps/mobile/package.json, apps/desktop/package.json
git tag v0.2.0
git push origin v0.2.0        # or: gh workflow run Release -f tag=v0.2.0
```

The workflow fails early if the tag does not match both packaged versions. It also creates
the release at the dispatched commit when the tag is missing.

## Secrets

Add these under **Settings → Secrets and variables → Actions**. Every one is optional; the
workflow warns and ships unsigned artifacts when a platform's secrets are absent.

| Secret | Platform | Purpose |
| --- | --- | --- |
| `ANDROID_KEYSTORE_BASE64` | Android | Base64 of the release/upload keystore |
| `ANDROID_KEYSTORE_PASSWORD` | Android | Keystore password |
| `ANDROID_KEY_ALIAS` | Android | Key alias (defaults to `openmuse`) |
| `ANDROID_KEY_PASSWORD` | Android | Key password (defaults to the keystore password) |
| `MAC_CERTIFICATE_P12` | macOS | Base64 of a Developer ID Application `.p12` |
| `MAC_CERTIFICATE_PASSWORD` | macOS | Password for that `.p12` |
| `APPLE_ID` | macOS | Apple ID used for notarization |
| `APPLE_APP_SPECIFIC_PASSWORD` | macOS | App-specific password for that Apple ID |
| `APPLE_TEAM_ID` | macOS | 10-character team identifier |
| `WINDOWS_CERTIFICATE_P12` | Windows | Base64 of an OV/EV code-signing `.pfx` |
| `WINDOWS_CERTIFICATE_PASSWORD` | Windows | Password for that `.pfx` |

```sh
base64 -w0 artifacts/android/signing/openmuse-release.keystore   # ANDROID_KEYSTORE_BASE64
base64 -w0 developer-id-application.p12                          # MAC_CERTIFICATE_P12
base64 -w0 code-signing.pfx                                      # WINDOWS_CERTIFICATE_P12
```

Instead of a `.p12`, macOS can notarize with an App Store Connect API key
(`APPLE_API_KEY`, `APPLE_API_KEY_ID`, `APPLE_API_ISSUER`), or with a stored notarytool
keychain profile (`APPLE_KEYCHAIN`, `APPLE_KEYCHAIN_PROFILE`). The API key is the option
Apple recommends for CI.

## Signing behavior

**macOS.** `apps/desktop/package.json` enables the hardened runtime and points at
`resources/entitlements.mac.plist` and `resources/entitlements.mac.inherit.plist`. Those
grant JIT and unsigned executable memory (Chromium needs both), disable library validation
for Electron's separately signed frameworks, and allow outbound network access. With
`CSC_LINK`/`CSC_KEY_PASSWORD` set, electron-builder signs with the Developer ID certificate;
with the Apple credentials present it also notarizes automatically (`mac.notarize: true`).
`CSC_IDENTITY_AUTO_DISCOVERY=false` in CI stops the runner from picking an unrelated
keychain identity.

**Windows.** electron-builder signs `openmuse.exe`, the NSIS installer, and the portable
executable with the certificate in `CSC_LINK`, timestamping through DigiCert. The publisher
name is taken from the certificate, so no name is hard-coded. An OV certificate removes the
"unknown publisher" dialog immediately; SmartScreen reputation builds over downloads. EV
certificates get reputation immediately. Azure Trusted Signing can replace the `.pfx` later
by setting `win.azureSignOptions` instead of `CSC_LINK`.

**Android.** `bundleRelease`/`assembleRelease` receive the keystore through Gradle's
injected-signing properties, so no signing block is committed and `apps/mobile/android/` can
stay generated and ignored. If Play App Signing is enabled, this keystore becomes the upload
key and Google re-signs the distributed build.

## Verifying a release locally

```sh
sha256sum -c SHA256SUMS.txt
apksigner verify --print-certs OpenMuse-*-android-arm64.apk
codesign --verify --deep --strict --verbose=2 openmuse.app   # macOS
spctl --assess --type execute --verbose=4 openmuse.app
signtool verify /pa /v OpenMuse-*-windows-x64-setup.exe      # Windows
```

`docs/PLAY-STORE.md` covers the Play Console-specific steps, and
`docs/DOWNLOAD.md` is the public-facing install page.
