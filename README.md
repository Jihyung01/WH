# 📍 WhereHere

> 여기, 지금, 탐험을 시작하세요

Location-based exploration and check-in app for discovering hidden gems in Seoul.

## ✨ Features

### 🔐 Authentication & Onboarding
- Beautiful animated login with Kakao OAuth
- 3-step character creation wizard
- 4 unique starter companions (도담, 나래, 하람, 별찌)
- Smooth animations and haptic feedback

### 🗺️ Exploration
- Interactive map with nearby events
- Real-time location tracking
- District-based discovery
- Check-in verification with GPS

### 🎯 Missions & Rewards
- Location-based challenges
- Photo missions and quizzes
- XP and coin rewards
- Badge collection system

### 👤 Character System
- Customizable appearance
- Level progression
- Stat system (exploration, charm, stamina, luck)
- Equipment and cosmetics

### 🏪 Shop & Inventory
- In-app purchases
- Premium subscription
- Item management
- Coupon system

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Expo CLI
- iOS Simulator or Android Emulator
- Supabase account
- Kakao Developers account

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/wherehere-app.git
cd wherehere-app

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your credentials
# - EXPO_PUBLIC_SUPABASE_URL
# - EXPO_PUBLIC_SUPABASE_ANON_KEY
# - EXPO_PUBLIC_API_URL

# Start development server
npm start
```

### Running the App

```bash
# iOS
npm run ios

# Android
npm run android

# Web (limited functionality)
npm run web
```

## 📱 App Structure

```
wherehere-app/
├── app/                    # Expo Router screens
│   ├── (auth)/            # Authentication flow
│   │   ├── welcome.tsx    # Welcome screen
│   │   ├── login.tsx      # Kakao login
│   │   └── onboarding.tsx # Character creation
│   ├── (tabs)/            # Main app tabs
│   │   ├── map.tsx        # Map view
│   │   ├── explore.tsx    # Event discovery
│   │   ├── missions.tsx   # Mission list
│   │   ├── inventory.tsx  # Items & badges
│   │   └── profile.tsx    # User profile
│   ├── event/             # Event screens
│   ├── mission/           # Mission screens
│   ├── character/         # Character screens
│   ├── shop/              # Shop screens
│   └── settings/          # Settings screens
├── src/
│   ├── components/        # Reusable components
│   ├── config/            # Configuration
│   ├── hooks/             # Custom hooks
│   ├── services/          # API services
│   ├── stores/            # Zustand stores
│   ├── types/             # TypeScript types
│   └── utils/             # Utility functions
├── docs/                  # Documentation
└── assets/                # Images, fonts, etc.
```

## 📚 Documentation

Comprehensive documentation is available in the [`docs/`](./docs) folder:

- **[Authentication Flow](./docs/AUTH_FLOW.md)** - Complete auth system documentation
- **[Setup Guide](./docs/AUTH_SETUP.md)** - Environment setup and configuration
- **[Testing Guide](./docs/AUTH_TESTING.md)** - Testing procedures and checklists
- **[Quick Reference](./docs/AUTH_QUICK_REFERENCE.md)** - Code snippets and patterns

## 🛠️ Tech Stack

### Frontend
- **Framework**: React Native 0.81
- **Runtime**: Expo SDK 54
- **Router**: Expo Router 6
- **State Management**: Zustand 5
- **Animations**: react-native-reanimated 4
- **Maps**: react-native-maps
- **UI**: Custom design system

### Backend
- **Auth**: Supabase Auth
- **Database**: PostgreSQL (via Supabase)
- **API**: FastAPI (Python)
- **Storage**: Supabase Storage
- **Hosting**: Railway

### Services
- **OAuth**: Kakao Login
- **Maps**: Google Maps (Android) / Apple Maps (iOS)
- **Push Notifications**: Expo Notifications
- **Analytics**: TBD

## 🎨 Design System

### Colors
```typescript
primary: '#6C5CE7'        // Purple
background: '#0A0E1A'     // Dark blue
kakaoYellow: '#FEE500'    // Kakao brand
success: '#00D68F'        // Green
error: '#FF6B6B'          // Red
```

### Typography
- **Headings**: Bold, 24-32px
- **Body**: Regular, 15-17px
- **Captions**: Medium, 13px

### Spacing
- xs: 4px, sm: 8px, md: 12px, lg: 16px, xl: 24px

## 🧪 Testing

```bash
# Type check
npx tsc --noEmit

# Lint
npx eslint .

# Run tests (when implemented)
npm test

# E2E tests (when implemented)
npm run test:e2e
```

See [Testing Guide](./docs/AUTH_TESTING.md) for detailed test cases.

## 🚢 Deployment

### Development Build

```bash
# iOS
npx expo prebuild
npx expo run:ios

# Android
npx expo prebuild
npx expo run:android
```

### Production Build

```bash
# Using EAS Build
eas build --platform ios --profile production
eas build --platform android --profile production

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

See [Setup Guide](./docs/AUTH_SETUP.md#production-deployment) for deployment details.

## 🔒 Security

- OAuth 2.0 with Kakao
- JWT tokens via Supabase
- Secure storage with AsyncStorage
- HTTPS for all API calls
- Rate limiting on backend
- Input validation and sanitization

## 📊 Performance

- 60fps animations with Reanimated
- Optimized map rendering
- Lazy loading for images
- Efficient state management
- Bundle size optimization

## ♿ Accessibility

- Screen reader support
- Keyboard navigation
- High contrast mode
- Touch target sizes (44x44 minimum)
- WCAG AA compliance

## 🌍 Localization

Currently supporting:
- 🇰🇷 Korean (primary)

Planned:
- 🇺🇸 English
- 🇯🇵 Japanese

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Coding Standards
- Use TypeScript for all new code
- Follow existing code style
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed

## 📝 License

Copyright © 2026 WhereHere. All rights reserved.

## 👥 Team

- **Product**: [Your Name]
- **Design**: [Designer Name]
- **Backend**: [Backend Team]
- **Frontend**: [Frontend Team]

## 📧 Contact

- **Email**: support@wherehere.com
- **Website**: https://wherehere.com
- **Instagram**: @wherehere_official

## 🙏 Acknowledgments

- [Expo](https://expo.dev) - React Native framework
- [Supabase](https://supabase.com) - Backend infrastructure
- [Kakao](https://developers.kakao.com) - OAuth provider
- [React Native Community](https://reactnative.dev) - Amazing ecosystem

## 📅 Roadmap

### v1.0 (Current)
- ✅ Authentication & Onboarding
- ✅ Map & Location
- ✅ Events & Check-ins
- ✅ Missions & Rewards
- ✅ Character System
- ✅ Shop & Inventory

### v1.1 (Planned)
- [ ] Social features (friends, chat)
- [ ] Leaderboards
- [ ] Event creation by users
- [ ] AR features
- [ ] Apple Sign In
- [ ] Google Sign In

### v2.0 (Future)
- [ ] Multi-city support
- [ ] International expansion
- [ ] Advanced analytics
- [ ] AI-powered recommendations
- [ ] NFT integration

## 🐛 Known Issues

See [GitHub Issues](https://github.com/your-org/wherehere-app/issues) for current bugs and feature requests.

## 📈 Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history.

---

Made with ❤️ in Seoul, Korea

**Version**: 1.0.0  
**Last Updated**: March 26, 2026
