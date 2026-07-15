# iOS: post-Apple-Developer-Account checklist

Context: the `ci/eas-ios-build` branch has a green **unsigned iOS Simulator**
build (`eas build --platform ios --profile ios-simulator --local` on a GitHub
Actions macOS runner — see `.github/workflows/eas-build-ios.yml`). That proves
the app compiles (CocoaPods, static frameworks, Firebase, Razorpay). Everything
below is what's still needed once an Apple Developer Program membership
($99/yr) exists, to get from "compiles" to "runs on a real device" to
"TestFlight" to "App Store".

## 1. Apple Developer Program setup

- [ ] Enroll at developer.apple.com, accept the Program License Agreement.
- [ ] In App Store Connect, agree to the current **Apple Developer Program
      License Agreement** and any pending **Paid Apps Agreement** (needed even
      for free apps if you'll ever sell/use IAP).
- [ ] Add any teammates who need access (Admin/App Manager roles) under
      Users and Access.

## 2. App ID registration

- [ ] In developer.apple.com → Certificates, Identifiers & Profiles →
      Identifiers, register an App ID for `com.buildgym.app` (must match
      `expo.ios.bundleIdentifier` in `app.json` exactly).
- [ ] Enable these capabilities on the App ID (match what's already declared
      in `app.json` / `ios/BuildGym/Info.plist`):
  - **Push Notifications** — required for `@react-native-firebase/messaging`
    (`UIBackgroundModes: remote-notification` is already set).
  - Anything else the app actually uses at runtime — re-check
    `ios/BuildGym/*.entitlements` and `app.json` `ios.entitlements`/plugins
    before assuming this list is exhaustive; it reflects the state audited
    on 2026-07-09.

## 3. Push notifications: APNs key → Firebase

react-native-firebase messaging needs an APNs Authentication Key wired into
the Firebase project (separate from the App ID's Push Notifications
capability above):

- [ ] developer.apple.com → Certificates, Identifiers & Profiles → Keys →
      create a new key with **Apple Push Notifications service (APNs)**
      enabled. Download the `.p8` **once** (Apple won't let you re-download
      it) and note the **Key ID** and your **Team ID**.
- [ ] Firebase Console → Project Settings → Cloud Messaging → Apple app
      configuration → upload the `.p8`, Key ID, and Team ID for the
      `com.buildgym.app` iOS app (create the iOS app entry in Firebase if it
      doesn't already exist — it should, since `GoogleService-Info.plist` is
      already committed and building).
- [ ] Sanity check: `GoogleService-Info.plist`'s `BUNDLE_ID` must equal
      `com.buildgym.app`, and its `PROJECT_ID`/`GCM_SENDER_ID` must match the
      same Firebase project used for the Android app, since both platforms
      share one backend notification pipeline.

## 4. App Store Connect app record

- [ ] App Store Connect → Apps → New App: platform iOS, name "Build Gym" (or
      whatever's decided — check for name collisions early, App Store names
      must be unique), primary language, bundle ID `com.buildgym.app` (pick
      from the dropdown — it's populated from the App ID registered in step 2),
      SKU (any internal identifier, e.g. `buildgym-ios`).
- [ ] This unlocks TestFlight and eventually App Store submission for this
      bundle ID.

## 5. EAS credentials

EAS can manage signing for you — no manual certificate/provisioning-profile
wrangling needed in the common case:

- [ ] `eas credentials` (interactive) → iOS → select `com.buildgym.app` →
      let EAS generate/assign a Distribution Certificate. It will prompt for
      your Apple ID and may ask you to authorize via App Store Connect API
      key (recommended over Apple ID+password for CI-friendliness — EAS can
      generate that key for you through the same flow).
- [ ] For the `preview` profile (`eas.json`) — currently
      `{ "distribution": "internal" }` with no iOS-specific settings — decide:
  - **Internal (ad-hoc) distribution**: needs registered device UDIDs
    (`eas device:create` to register a tester's device, or a QR-code flow) and
    an ad-hoc provisioning profile. Fastest way to get a build onto a specific
    iPhone without TestFlight review.
  - **TestFlight internal testing**: build with a real App Store distribution
    profile and `eas submit -p ios --profile production` (or a dedicated
    `preview`-flavored submit) — no device registration needed, testers just
    need to be added as internal testers in App Store Connect (up to 100,
    no Apple review required for internal groups).
- [ ] Once credentials exist, a **real device** simulator-equivalent build is:
  `eas build --platform ios --profile preview` (cloud) or add `--local` on a
  macOS runner analogous to the current `ios-simulator` CI job.

## 6. First real build + TestFlight

- [ ] `eas build --platform ios --profile production` (or `preview`, per your
      distribution choice above).
- [ ] `eas submit --platform ios --profile production` (or add a `submit`
      entry to `eas.json` for `preview` if using TestFlight-via-ad-hoc isn't
      the path) to upload the `.ipa` to App Store Connect.
- [ ] In App Store Connect → TestFlight, the build appears after Apple's
      automated processing (~15–60 min); add internal testers.
- [ ] Only when targeting the public App Store: full metadata (screenshots,
      description, privacy nutrition labels, age rating, support URL,
      App Privacy details for Firebase/Razorpay/etc. data collection) and a
      submission for App Review.

## 7. Known things to re-check once you have a real device build

These are static-frameworks/Firebase workarounds (`app.json`
`expo-build-properties.ios.forceStaticLinking`, see git history on
`ci/eas-ios-build`) proven only against a **simulator** build. Simulator and
device builds share most of the compile graph, but re-verify on the first
real device build:
- [ ] Push notifications actually arrive on a physical device (simulator
      can't receive real APNs pushes at all, this is untestable pre-device).
- [ ] Razorpay checkout flow (some payment SDKs behave differently or refuse
      to run at all in Simulator; confirm on-device once a build exists).
- [ ] Crashlytics/Perf actually report events to the Firebase console (these
      are often no-ops or degraded in Simulator).

---

# Testing the current Simulator build on appetize.io (free tier)

You already have a working, unsigned iOS Simulator build without an Apple
account — good enough for appetize.io, which runs iOS builds in a real
simulator in the browser and doesn't need code signing at all.

## Get the build

1. Either grab the artifact from a finished GitHub Actions run:
   `gh run download <run-id> --repo T-pritam/Build_GYM -n ios-simulator-build`
   (or the "Artifacts" section of the run page in the browser), **or**
   trigger a fresh one: `gh workflow run eas-build-ios.yml --repo T-pritam/Build_GYM --ref ci/eas-ios-build`.
2. `eas build --local` outputs `build.tar.gz`, which un-tars to a `.app`
   bundle for the simulator (e.g. `BuildGym.app`):
   ```
   tar -xzf build.tar.gz
   ```
3. Appetize wants a `.zip` of that `.app` (not a `.tar.gz`, not the raw
   folder):
   ```
   zip -r BuildGym.zip BuildGym.app
   ```

## Upload to appetize.io

1. Sign up free at appetize.io (free tier: 100 device-minutes/month, and —
   important — **apps on the free plan are public**, anyone with the link can
   run them; there's no private-app option below the paid tiers). Don't
   upload a build if you're not OK with that being effectively public, given
   it talks to the real `build.tach21.com` backend.
2. Simplest path: appetize.io dashboard → "Upload App" → drag in
   `BuildGym.zip`. It auto-detects platform from the `.app` bundle.
3. API path (for scripting/CI), once you have an API token from
   account settings → API keys:
   ```
   curl https://api.appetize.io/v1/apps \
     -H "X-API-KEY: <your-token>" \
     -F "file=@BuildGym.zip" \
     -F "platform=ios"
   ```
   Check appetize.io's current API docs before relying on this exactly —
   confirm the endpoint/field names haven't changed since this was written
   (2026-07-09).
4. Either path returns a public share URL (and a `publicKey`) — open it in a
   browser to interact with the app in a real iOS Simulator instance,
   no device or Apple account required.

## Caveats specific to this build

- It's a **Simulator** build, so anything gated on `Constants.isDevice`
  (see the push-token code in `src/services` — a known pattern in this repo)
  will behave as if there's no real device: push token registration will be
  skipped/no-op, matching the simulator's real inability to receive APNs.
- It talks to the real production-configured backend
  (`BASE_API_URL` baked in at build time) unless a different `.env` was used
  for that specific CI run — treat test actions (payments, bookings) as
  happening against real data.
