# BuildGym

> The all-in-one companion for Build Gym members — digital membership, Build Coins cafe ordering, workout tracking, and a premium dark-orange UI.

![Expo](https://img.shields.io/badge/Expo-54-000020?style=flat-square&logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-0.81-61DAFB?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Realtime-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-4.8-010101?style=flat-square&logo=socket.io&logoColor=white)
![Razorpay](https://img.shields.io/badge/Payments-Razorpay-0C4887?style=flat-square)
![License](https://img.shields.io/badge/License-Proprietary-red?style=flat-square)

---

## Demo

<!-- TODO: Add screenshots — membership card, cafe menu, access center, workout tracking -->
> Screenshots coming soon. Contact the author for a live demo.

---

## Features

- **Digital membership card** — member profile with tier, validity, and QR for gym check-in
- **Build Coins wallet** — earn and spend coins at the in-gym cafe; balance visible on home screen
- **In-gym cafe ordering** — full cafe menu with a coin-aware cart, live item availability, and real-time order status (placed → preparing → ready)
- **BLE access control** — gate and locker entry via a native Rosslare BLE reader module, with pulse animation and timestamped access log
- **Workout tracking** — workout plans, exercise library, logged sessions, and performance history
- **Community feed** — social posts, activity sharing, and member interactions
- **Trainer discovery** — trainer profiles with stats, bio, expertise tags, and availability
- **Activity booking** — browse and register for gym classes and events
- **OTP authentication** — phone-number login with 4-step onboarding for new members
- **Push notifications** — Firebase FCM for class reminders, announcements, and order updates
- **Real-time updates** — Socket.io for gym events and Supabase Realtime channels for cafe order/menu updates
- **Payments** — Razorpay checkout for membership renewals and Build Coin top-ups

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native 0.81.5 via Expo SDK 54 |
| Language | JavaScript (React 19) with TypeScript types in `src/types/` |
| Navigation | React Navigation (native-stack, bottom-tabs, drawer) |
| State Management | Zustand 5.0 |
| Data Fetching | TanStack Query (React Query) v5 + Axios |
| Real-time | Socket.io-client 4.8 (gym backend) + Supabase Realtime (cafe) |
| Native module | Kotlin BLE bridge for Rosslare reader (`android/app/src/main/java/com/buildgym/app`) |
| Payments | react-native-razorpay |
| Push Notifications | Expo Notifications + Firebase Messaging (`@react-native-firebase`) |
| Forms | react-hook-form + Zod |
| Animations | react-native-reanimated |
| QR Codes | react-native-qrcode-svg |
| Secure Storage | expo-secure-store |
| Build | EAS Build (see [eas.json](./eas.json)) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- Android Studio (for Android builds) and/or Xcode (for iOS builds) — the BLE reader integration requires a native dev client, so Expo Go is not sufficient for the access-control screen
- A running instance of the BuildGym backend (private — contact the author)
- A Firebase project for FCM push notifications

### Installation

```bash
git clone https://github.com/T-pritam/BuildGym.git
cd BuildGym
npm install
```

### Environment Setup

The project uses [`react-native-dotenv`](https://github.com/goatandsheep/react-native-dotenv) (configured in [babel.config.js](./babel.config.js)) — variables are imported as `import { … } from '@env'`. Note the names are bare (no `EXPO_PUBLIC_` prefix).

Create a `.env` file in the project root:

```env
# Gym backend
BASE_API_URL=https://your-gym-backend.example.com/api

# Cafe backend (separate service)
CAFE_API_URL=https://your-cafe-backend.example.com/api
CAFE_SUPABASE_URL=https://your-cafe-project.supabase.co
CAFE_SUPABASE_ANON_KEY=your-cafe-supabase-anon-key

# Shared HMAC secret used to bridge a gym session into the cafe backend
GYM_BRIDGE_SECRET=your-shared-bridge-secret
```

> The Razorpay key id is **not** stored in the client — the backend returns it with each `/payments/razorpay/create-order` response.

### Firebase Setup

Firebase config files are gitignored — drop your own into the project before building:

- `google-services.json` → project root **and** `android/app/`
- `GoogleService-Info.plist` → `ios/BuildGym/`

The bundle identifier must be `com.buildgym.app` (see [app.json](./app.json)). After publishing, restrict the Firebase API keys in Google Cloud Console by package name and SHA-1 fingerprint.

---

## Usage

**Run on a connected device / emulator (creates the native dev client):**

```bash
npm run android   # or: npx expo run:android
npm run ios       # or: npx expo run:ios
```

**Start the Metro bundler only (when the dev client is already installed):**

```bash
npm start         # expo start
```

**Build a release APK / IPA via EAS:**

```bash
eas build --platform android --profile production
eas build --platform ios --profile production
```

Build profiles are defined in [eas.json](./eas.json).

---

## Project Structure

```
BuildGym/
├── src/
│   ├── screens/
│   │   ├── auth/           # Login, OTP, onboarding
│   │   ├── main/           # Home, access center, dashboards
│   │   ├── cafe/           # Cafe menu, cart, order status
│   │   ├── workout/        # Plans, exercises, logs
│   │   ├── community/      # Social feed, posts
│   │   ├── profile/        # Profile, membership, coins, complaints
│   │   └── detail/         # Trainer detail, activity detail
│   ├── components/         # Reusable UI components
│   ├── navigation/         # Navigators (stack, tabs, drawer)
│   ├── store/              # Zustand state stores
│   ├── services/           # Axios + Supabase + Socket.io clients per domain
│   ├── types/              # Shared type definitions
│   ├── utils/              # Helpers and formatters
│   └── constants/
│       ├── colors.js       # Dark + orange color palette
│       └── images.js       # Centralized image references
├── android/                # Android native project (incl. Rosslare BLE module)
├── ios/                    # iOS native project
├── assets/                 # App icons and splash screen
├── docs/                   # Backend/DB design notes
└── package.json
```

---

## Color Palette

| Token | Hex | Usage |
|---|---|---|
| `background` | `#0D0D0D` | App background |
| `surface` | `#1A1A1A` | Cards and inputs |
| `secondary` | `#DE4D00` | Primary orange accent |
| `secondaryLight` | `#FF5722` | Hover / lighter orange |
| `textPrimary` | `#FFFFFF` | Main text |
| `textMuted` | `#666666` | Placeholders and secondary text |

---

## Contributing

This is a proprietary project. Contributions are not open to the public. If you are a team member, open an internal pull request with a clear description of your changes and the problem being solved.

---

## License

© 2024 T Pritam. All rights reserved.  
This software is proprietary. No license is granted to use, copy, modify, or distribute without explicit written permission from the author.

---

## Author

**T Pritam**  
[GitHub](https://github.com/T-pritam) · [LinkedIn](https://www.linkedin.com/in/t-pritam)
