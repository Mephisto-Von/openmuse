# Publishing OpenMuse on Google Play

The Android build is an Expo SDK 54 React Native app with package `app.openmuse.mobile`.
This page covers what the console asks for, what to answer, and what is still missing before
a production review.

## Build state

| Check | Value |
| --- | --- |
| Package name | `app.openmuse.mobile` (permanent after the first upload) |
| Version name / code | `0.1.0` / `1` (`expo.version`, `expo.android.versionCode`) |
| Minimum SDK | 24 (Android 7.0) |
| Target SDK | 36 — meets the current Play requirement for new apps |
| Formats | App Bundle for Play, APK for sideloading |
| Signing | Project release key; enroll in Play App Signing so Google holds the app signing key |
| Ads | None |
| Analytics / crash SDKs | None |
| Account required | No account; a self-hosted server address is required |

Declared permissions after the manifest merge: `INTERNET`, `ACCESS_NETWORK_STATE`,
`ACCESS_WIFI_STATE`, `WAKE_LOCK`, `VIBRATE`, `DOWNLOAD_WITHOUT_NOTIFICATION`. The broad
storage permissions and `SYSTEM_ALERT_WINDOW` are blocked in `apps/mobile/app.json` because
the app only reads and writes its own app-private files.

`usesCleartextTraffic` stays enabled so a server on the same LAN can be reached over HTTP;
the app warns before connecting to an unencrypted remote address. Reviewers see this as a
network-security choice, not a data-collection one.

## Build and upload

```sh
pnpm install
cd apps/mobile
npx expo prebuild --platform android --no-install
cd android
./gradlew bundleRelease \
  -Pandroid.injected.signing.store.file="$PWD/../../../artifacts/android/signing/openmuse-release.keystore" \
  -Pandroid.injected.signing.store.password="$(cat ../../../artifacts/android/signing/.keystore-password)" \
  -Pandroid.injected.signing.key.alias=openmuse \
  -Pandroid.injected.signing.key.password="$(cat ../../../artifacts/android/signing/.keystore-password)"
```

The bundle is written to `app/build/outputs/bundle/release/app-release.aab`. The
[release workflow](../.github/workflows/release.yml) builds the same file with
`assembleRelease bundleRelease` and attaches it to every tagged release; use a **separate
upload key** for Play if you do not want your sideload key to be the upload key, and keep both
out of git (`artifacts/` is ignored).

Increment `expo.android.versionCode` for every upload; Play rejects a repeated code.

## Store listing

- **App name (≤30):** `OpenMuse`
- **Short description (≤80):** `Your personal agent: browse, run tasks, and come back to results.`
- **Full description:** reuse the product summary in the [README](../README.md#what-it-is),
  keeping the warning that the app needs an OpenMuse server you run.
- **Category:** Productivity. **Tags:** productivity, assistant.
- **Contact email:** the maintainer address you use for the developer account.
- **Privacy policy URL:** publish [PRIVACY.md](PRIVACY.md) at a stable public URL, for example
  GitHub Pages, and paste that URL. A raw GitHub link works for review but is not a
  substitute for a page you control.
- **Graphics:** `store/play/icon-512.png` (512×512) and
  `store/play/feature-graphic-1024x500.png` (1024×500).
- **Phone screenshots:** four at 1080×1920 (9:16) in `store/play/screenshots/`, which is
  inside Play's 2–8 images, 16:9–9:16, 320–3840 px rules:

  | File | Screen |
  | --- | --- |
  | `01-mail.png` | Mail list with the sample inbox |
  | `02-activity.png` | Activity, reviews and the workspace timeline |
  | `03-goals.png` | Goals with tracking and the goal categories |
  | `04-apps.png` | Apps, connections and on-device capabilities |

  These are the product's real UI at a phone viewport with the sample workspace, not
  marketing mockups. They were rendered from the app's Expo web build against a local
  sample-mode server (`WORKSPACE_MODE=sample`), because the published APK contains only
  `arm64-v8a` libraries and cannot run on an x86_64 emulator. The chat screen is absent: the
  CopilotKit runtime needs a real Intelligence key, which this environment does not have.
  Re-shoot on a device if the listing should show the Android status bar.

## App access (required for review)

A reviewer cannot reach a server on the developer's laptop. In **App access → All
functionality is not restricted**, provide:

- a reachable HTTPS server URL that stays up during review,
- a workspace access key for it,
- the steps: install → enter the URL and key → **Open workspace** → ask for a result.

Without this, Play rejects the release as non-functional. The sample workspace is
loopback-only by design, so the review server must run with `WORKSPACE_MODE=live`,
`AGENT_BACKEND=model`, a model key, and demo data. Do not point reviewers at real personal
mail or calendars.

## Data safety answers

For the self-hosted build this repository produces, all data stays between the app and the
server the person configures. The publisher operates no backend and receives nothing.

| Question | Answer | Why |
| --- | --- | --- |
| Does your app collect or share any required user data types? | **No** (self-hosted build) | No analytics, ads, or crash SDK; nothing reaches the publisher |
| Is all collected data encrypted in transit? | **Yes** | HTTPS is required for remote servers; cleartext is limited to signed-in LAN setup |
| Do you provide a way for users to request data deletion? | **Yes** | Uninstalling clears device data; the server operator deletes workspace data |
| Data shared with third parties | **None** | Only the server address the person enters is contacted |
| Is data used for advertising or tracking? | **No** | No ad or attribution SDKs |

If you publish a build that points at a server **you** operate, you are the controller and
must declare the categories that server receives instead: personal info (name, email
address), messages (email content and attachments when Gmail is connected), files and docs,
app activity (prompts and results), and calendar events. Mark each as collected, not shared,
encrypted in transit, and deletable on request.

Google user data: the optional Gmail/Calendar connection is governed by
[PRIVACY.md](PRIVACY.md#what-the-app-sends-and-where) and its Limited Use statement. If you
publish a build with Google OAuth, you also need a verified OAuth consent screen and the
`gmail.readonly`/`calendar` scopes approved for production.

## Content rating and declarations

- **Ads:** no.
- **In-app purchases:** no.
- **Target audience:** 18+; the agent can act on real mail, files, and purchases, so do not
  opt into the Families program.
- **News app:** no. **Health:** no. **Government:** no.
- **Content rating questionnaire:** answer "no" to violence, sexuality, profanity, drugs,
  gambling, and user-generated content sharing; note that the app displays web pages the
  person asks for, which is why the target audience is adults.
- **Data safety:** as above. **Advertising ID:** not used.

## Submission sequence

1. Create the app, set the default language, and upload the AAB to **Internal testing**.
2. Complete App content: privacy policy, app access, ads, content rating, target audience,
   data safety.
3. Add the listing text and graphics, then create a production release and roll out to
   internal testers first.
4. Test the Play-signed build on a real device: the Play App Signing key differs from the
   upload key, so verify the signature and an in-place update from the previous build.
5. Promote to closed testing, then production.

## Still blocking a public Play release

- A reachable review server with demo data (see **App access**).
- A publicly hosted privacy policy URL.
- Store listing review of the "requires your own server" positioning: Play accepts
  self-hosted tools, but the listing must say so in the first paragraph.
