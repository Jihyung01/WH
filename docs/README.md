# WhereHere Documentation

Welcome to the WhereHere documentation! This folder contains comprehensive guides for the authentication and onboarding system.

## 📚 Documentation Index

### 🔐 Authentication & Onboarding

1. **[AUTH_FLOW.md](./AUTH_FLOW.md)** - Complete Authentication Flow Documentation
   - Architecture overview
   - Screen-by-screen breakdown
   - State management details
   - API integration
   - Navigation flow
   - Error handling
   - Performance considerations
   - Future enhancements

2. **[AUTH_SETUP.md](./AUTH_SETUP.md)** - Setup Guide
   - Prerequisites
   - Supabase configuration
   - Kakao OAuth setup
   - Environment variables
   - Development workflow
   - Production deployment
   - Troubleshooting

3. **[AUTH_TESTING.md](./AUTH_TESTING.md)** - Testing Guide
   - Manual test cases
   - Automated testing
   - Performance testing
   - Accessibility testing
   - Security testing
   - Bug report template

4. **[AUTH_QUICK_REFERENCE.md](./AUTH_QUICK_REFERENCE.md)** - Quick Reference
   - File structure
   - Key components
   - Common patterns
   - Code snippets
   - Debugging tips

## 🚀 Quick Start

### For New Developers

1. Read [AUTH_SETUP.md](./AUTH_SETUP.md) to configure your environment
2. Skim [AUTH_FLOW.md](./AUTH_FLOW.md) to understand the architecture
3. Keep [AUTH_QUICK_REFERENCE.md](./AUTH_QUICK_REFERENCE.md) open while coding
4. Use [AUTH_TESTING.md](./AUTH_TESTING.md) before submitting PRs

### For Designers

- Check the "Design Features" sections in [AUTH_FLOW.md](./AUTH_FLOW.md)
- Review animation specifications
- See color and spacing tokens in Quick Reference

### For QA/Testers

- Follow test cases in [AUTH_TESTING.md](./AUTH_TESTING.md)
- Use the bug report template
- Check accessibility guidelines

## 🎯 Key Features

### Login Screen
- ✨ Stunning animated entrance
- 🎨 Gradient background with breathing effect
- 💬 Kakao OAuth integration
- 👀 Guest preview option

### Onboarding Flow
- 📝 **Step 1**: Username input with real-time validation
- 🎭 **Step 2**: Character selection with 4 unique companions
- 🎉 **Step 3**: Celebration and completion

### Technical Highlights
- 🔄 Smooth step transitions with react-native-reanimated
- 📳 Haptic feedback on interactions
- 💾 Session persistence with AsyncStorage
- 🔐 Secure token management with Supabase
- 🎨 Beautiful gradient cards for characters
- ⚡ 60fps animations throughout

## 📱 Screens Overview

```
┌─────────────────┐
│  Welcome Screen │
│   📍 WhereHere  │
│   시작하기 →    │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Login Screen   │
│  💬 카카오 로그인 │
│  둘러보기        │
└────────┬────────┘
         │
         ↓ (OAuth)
         │
         ↓
┌─────────────────┐
│  Onboarding     │
│  Step 1: Name   │
│  Step 2: Char   │
│  Step 3: Done   │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   Map Screen    │
│  (Main App)     │
└─────────────────┘
```

## 🛠️ Tech Stack

- **Framework**: React Native + Expo
- **Router**: Expo Router (file-based)
- **Auth**: Supabase Auth + Kakao OAuth
- **State**: Zustand
- **Animations**: react-native-reanimated
- **Haptics**: expo-haptics
- **Gradients**: expo-linear-gradient
- **Storage**: AsyncStorage

## 📦 Key Files

```
app/
├── (auth)/
│   ├── login.tsx           # Kakao login with animations
│   └── onboarding.tsx      # 3-step character creation
└── index.tsx               # Root redirect logic

src/
├── stores/authStore.ts     # Auth state management
├── services/
│   ├── authService.ts      # Auth API calls
│   └── characterService.ts # Character API calls
└── components/auth/
    ├── AuthButton.tsx      # Reusable button
    └── AuthInput.tsx       # Reusable input
```

## 🎨 Design System

### Colors
- Primary: `#6C5CE7` (Purple)
- Background: `#0A0E1A` (Dark blue)
- Kakao: `#FEE500` (Yellow)
- Success: `#00D68F` (Green)
- Error: `#FF6B6B` (Red)

### Character Themes
- 🌿 **도담 (Dodam)**: Green - Forest Explorer
- 💨 **나래 (Narae)**: Blue - Wind Traveler
- ☀️ **하람 (Haram)**: Orange - Sun Guardian
- ⭐ **별찌 (Byeolzzi)**: Purple - Star Collector

## 🔧 Development Commands

```bash
# Start development
npm start

# Run on device
npm run ios
npm run android

# Type check
npx tsc --noEmit

# Lint
npx eslint .

# Clear cache
npx expo start --clear
```

## 🐛 Troubleshooting

Common issues and solutions:

1. **OAuth not working**
   - Use development build, not Expo Go
   - Check redirect URI configuration

2. **Animations stuttering**
   - Enable Hermes engine
   - Use development build

3. **Session not persisting**
   - Check AsyncStorage permissions
   - Clear app data and retry

See [AUTH_SETUP.md](./AUTH_SETUP.md#troubleshooting) for more details.

## 📝 Contributing

When working on auth features:

1. Read relevant documentation first
2. Follow existing patterns and conventions
3. Test on both iOS and Android
4. Update documentation if needed
5. Run full test suite before PR

## 🔒 Security

- Never commit `.env` files
- Use HTTPS for all API calls
- Store tokens securely in AsyncStorage
- Implement rate limiting
- Monitor auth events

See [AUTH_FLOW.md](./AUTH_FLOW.md#security) for security best practices.

## 📊 Performance

Target metrics:
- Animation frame rate: **60fps**
- Screen load time: **< 500ms**
- API response time: **< 2s**
- Memory: **No leaks**

See [AUTH_TESTING.md](./AUTH_TESTING.md#performance-testing) for performance testing guide.

## ♿ Accessibility

- All buttons have accessible labels
- Form inputs have labels
- Error messages are announced
- Color contrast meets WCAG AA
- Touch targets are 44x44 points minimum

See [AUTH_TESTING.md](./AUTH_TESTING.md#accessibility-testing) for accessibility checklist.

## 🚢 Deployment

Before deploying:

1. ✅ All tests pass
2. ✅ Performance profiled
3. ✅ Accessibility audited
4. ✅ Security scanned
5. ✅ Environment variables updated
6. ✅ Kakao OAuth configured for production

See [AUTH_SETUP.md](./AUTH_SETUP.md#production-deployment) for deployment guide.

## 📚 Additional Resources

### External Documentation
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Kakao Login](https://developers.kakao.com/docs/latest/en/kakaologin/common)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)
- [Zustand](https://docs.pmnd.rs/zustand/getting-started/introduction)

### Internal Resources
- Backend API documentation
- Design system Figma files
- Product requirements

## 💬 Support

For questions or issues:
- Check documentation first
- Review troubleshooting guides
- Contact the development team
- Create an issue with bug report template

## 📄 License

Copyright © 2026 WhereHere. All rights reserved.

---

**Last Updated**: March 26, 2026

**Documentation Version**: 1.0.0

**App Version**: 1.0.0
