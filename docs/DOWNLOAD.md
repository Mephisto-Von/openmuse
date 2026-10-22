# Download OpenMuse

Prebuilt installers for this release are attached to the GitHub release:

**<https://github.com/Mephisto-Von/openmuse/releases/tag/v0.1.0>**

Every file is accompanied by `SHA256SUMS.txt`. These builds are **unsigned previews** of
the alpha described in the [README](../README.md); read the trust notes below before
installing.

| Platform | File | Notes |
| --- | --- | --- |
| Android | `OpenMuse-0.1.0-android-arm64.apk` | Sideload; arm64 phones and tablets |
| Linux | `OpenMuse-0.1.0-linux-x86_64.AppImage` | Portable, no install |
| Linux | `OpenMuse-0.1.0-linux-amd64.deb` | Debian/Ubuntu package |
| Windows | `OpenMuse-0.1.0-windows-x64-setup.exe` | Per-user NSIS installer |
| Windows | `OpenMuse-0.1.0-windows-x64-portable.exe` | Single executable, no install |
| macOS (Apple silicon) | `OpenMuse-0.1.0-macos-arm64.tar.gz` | Unsigned `.app` bundle |
| macOS (Intel) | `OpenMuse-0.1.0-macos-x64.tar.gz` | Unsigned `.app` bundle |

`OpenMuse-0.1.0-android-arm64.aab` is the Play upload; see
[PLAY-STORE.md](PLAY-STORE.md). The Android APK is built for `arm64-v8a` only. x86/x86_64 emulators need a local build
(`pnpm --dir apps/mobile prebuild` then a Gradle `assembleRelease`).

### SHA-256

```
a87af4a9f176bbdfe1143a95f7c2712c5d7273e968267f7b09388def183e27d7  OpenMuse-0.1.0-android-arm64.apk
11ee4ba18af1cec56679ab503616fd00bfa6b1877a26f6428c8332359bbdd6bb  OpenMuse-0.1.0-android-arm64.aab
02514b921ed45ba644d115e0ba915c5a1f669827638814568ab4b7ff6f905071  OpenMuse-0.1.0-linux-x86_64.AppImage
dc863ed430ef5a91a4889a81b3a1faa3d24a0463a79ae36f74e898833026fa98  OpenMuse-0.1.0-linux-amd64.deb
d1d5c39c24438523723c4506da8052dbd61c04bbb6fdc64f751e4648c14113ff  OpenMuse-0.1.0-windows-x64-setup.exe
55094a81d03b8ac20ed2c4b2fa21a7316890fc7e82a895dad2e2378a9e288114  OpenMuse-0.1.0-windows-x64-portable.exe
e22e12d320717d8377999c985263c474a90e4f8f66f9aa775218db5f2e4c96be  OpenMuse-0.1.0-macos-arm64.tar.gz
ee6550587c7e4bdc4f90ee91b30254323a2d209d38274aa1bc4dfeb227b6261f  OpenMuse-0.1.0-macos-x64.tar.gz
```

## First run

All apps are clients. They need an OpenMuse server: start one with
`pnpm install && pnpm dev` on a machine you control, then enter its address on the welcome
screen (`http://localhost:8787` for a local server). The Android emulator reaches your host
at `http://10.0.2.2:8787`. Use HTTPS for anything reachable from the internet.

## Install and verify

```sh
# Linux
chmod +x OpenMuse-0.1.0-linux-x86_64.AppImage && ./OpenMuse-0.1.0-linux-x86_64.AppImage
sudo apt install ./OpenMuse-0.1.0-linux-amd64.deb   # or the .deb

# Android (with a connected device)
adb install OpenMuse-0.1.0-android-arm64.apk

# Checksums
sha256sum -c SHA256SUMS.txt
```

macOS: `tar -xzf OpenMuse-0.1.0-macos-arm64.tar.gz` (or the `x64` build on Intel) and drag
`openmuse.app` into `/Applications`. Because the build has no
Developer ID signature, Gatekeeper blocks the first launch — right-click the app and choose
**Open**, or allow it under **System Settings → Privacy & Security**.

Windows: the SmartScreen prompt appears because no code-signing certificate is attached;
choose **More info → Run anyway**.

Android: enable installation from your browser or file manager when prompted. Play Protect
may warn because the APK is signed with a self-managed release key rather than distributed
through Play.

## Trust boundary

- The macOS and Windows artifacts are not code-signed or notarized, and the APK is not
  published through Google Play.
- The apps ship the compiled web bundle; no telemetry is sent to the OpenMuse project. The
  app talks only to the server address you enter.
- Build them yourself from the same tag with `pnpm --dir apps/desktop run dist:linux`,
  `dist:win`, `pnpm exec electron-builder --mac zip`, and a signed `assembleRelease`
  (see `artifacts/android/signing/README.md` for the injected-signing command) if you need
  artifacts you trust.

See [VERIFICATION.md](VERIFICATION.md) for what was tested and
[SCALE-READINESS.md](SCALE-READINESS.md) for what public, multi-person hosting still needs.
