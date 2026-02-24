# BUILD Gym – Mobile App

> **Physique · Discipline · Lifestyle**

A React Native / Expo mobile application for **Build Gym** members. Built by [Techspirit Labs](https://techspirit.in) for Rushil Johnson Fitness.

---

## Overview

The Build Gym app is the all-in-one companion for registered gym members. It provides digital membership management, a café ordering system (Build Coins), BLE-based gate/locker access, trainer discovery, activity tracking, and more — all wrapped in a premium dark + orange UI.

> **Current Status:** Phase 1 — UI / Frontend Only. All data is from `src/constants/dummyData.js`. Backend integration is planned for Phase 2.

---

## Features

| Module | Description |
|---|---|
| **Auth** | Phone OTP login (members only), 4-step onboarding form |
| **Home** | Membership card, Build Coins balance, announcements, trainer carousel, weekly stats |
| **Build Café** | 3-column menu grid (Shakes, Meals, Snacks, Supplements), cart with coin balance check |
| **Access Center** | BLE gate & locker simulation, pulse animation, access log |
| **Profile** | Build Coins overview, membership details, activity dashboard |
| **Notifications** | In-app notification centre with unread badges |
| **Complaints** | Category-based complaint registration |
| **Trainer Detail** | Individual trainer profile with stats, bio, expertise tags |

---

## Tech Stack

| | |
|---|---|
| **Framework** | React Native + Expo SDK ~54 |
| **Navigation** | `@react-navigation/native` · `native-stack` · `bottom-tabs` |
| **UI / Animation** | `expo-linear-gradient` · `react-native-reanimated` · `react-native-gesture-handler` |
| **Icons** | `@expo/vector-icons` (Ionicons + MaterialCommunityIcons) |
| **Language** | JavaScript (ES2020) |

---

## Project Structure

```
BuildGym/
├── App.js                        # Entry point
├── app.json                      # Expo config
├── babel.config.js               # Babel with reanimated plugin
├── assets/
│   ├── images/
│   │   └── build-logo.png        # Official BUILD logo
│   └── icon.png / splash-icon.png
└── src/
    ├── constants/
    │   ├── colors.js             # Full color palette (black + orange)
    │   ├── dummyData.js          # All mock data (replace with API later)
    │   └── images.js             # Centralized image references
    ├── navigation/
    │   └── AppNavigator.js       # Full navigation tree
    ├── components/
    │   └── CustomTabBar.js       # Bottom tab bar with floating Access button
    └── screens/
        ├── auth/
        │   ├── SplashScreen.js
        │   ├── LoginScreen.js
        │   ├── OTPScreen.js
        │   └── OnboardingScreen.js
        ├── main/
        │   ├── HomeScreen.js
        │   ├── CafeScreen.js
        │   └── AccessScreen.js
        ├── cafe/
        │   ├── ItemDetailScreen.js
        │   └── CartScreen.js
        ├── profile/
        │   ├── ProfileScreen.js
        │   ├── MembershipScreen.js
        │   ├── ActivityDashboardScreen.js
        │   ├── ComplaintScreen.js
        │   └── NotificationsScreen.js
        └── detail/
            └── TrainerDetailScreen.js
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your phone ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) / [iOS](https://apps.apple.com/app/expo-go/id982107779))

### Installation

```bash
# Clone the repo
git clone <repo-url>
cd BuildGym

# Install dependencies
npm install

# Start the dev server
npx expo start --clear
```

Scan the QR code in your terminal with **Expo Go** to run on your device.

---

## Color Palette

| Token | Hex | Usage |
|---|---|---|
| `background` | `#0D0D0D` | App background |
| `surface` | `#1A1A1A` | Cards, inputs |
| `secondary` | `#DE4D00` | Primary orange accent |
| `secondaryLight` | `#FF5722` | Hover / light orange |
| `textPrimary` | `#FFFFFF` | Main text |
| `textMuted` | `#666666` | Placeholder / secondary |

---

## Data Layer

All data lives in [`src/constants/dummyData.js`](src/constants/dummyData.js). Each export maps directly to a future API endpoint:

| Export | Future API |
|---|---|
| `currentUser` | `GET /api/user/me` |
| `membership` | `GET /api/membership` |
| `buildCoins` | `GET /api/coins/balance` |
| `cafeItems` | `GET /api/cafe/items` |
| `trainers` | `GET /api/trainers` |
| `announcements` | `GET /api/announcements` |
| `notifications` | `GET /api/notifications` |

Café item images currently use **Unsplash CDN** URLs. Replace with your own CDN or `require()` local assets in Phase 2.

---

## Roadmap

- [x] Phase 1 — UI screens with dummy data
- [ ] Phase 2 — Backend API integration (Supabase / Node.js)
- [ ] Phase 3 — Real BLE gate integration
- [ ] Phase 4 — Push notifications (Expo Notifications)
- [ ] Phase 5 — App Store / Play Store deployment

---

## Contributing

1. Branch from `main` — `git checkout -b feature/your-feature`
2. Follow the existing file structure and code style
3. Replace `dummyData.js` references with API calls when integrating backend
4. Submit a PR with a clear description

---

## License

Private — Rushil Johnson Fitness / Tach Developers. All rights reserved.
