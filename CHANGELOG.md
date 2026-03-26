# Changelog

All notable changes to WhereHere will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-03-26

### Added - Authentication & Onboarding

#### 🔐 Authentication System
- **Kakao OAuth Integration**
  - Supabase Auth with Kakao provider
  - Secure session management with AsyncStorage
  - Automatic token refresh
  - Deep linking support (`wherehere://auth/callback`)

- **Auth Store (Zustand)**
  - `signInWithKakao()` - Initiate Kakao OAuth flow
  - `signOut()` - Clear session and redirect to welcome
  - `initializeAuth()` - Restore session on app launch
  - `checkOnboardingStatus()` - Verify character creation
  - Session state management
  - Onboarding completion tracking

- **Auth Service**
  - `loginWithKakao()` - OAuth flow handler
  - `getSession()` - Retrieve current session
  - `getCurrentUser()` - Fetch user profile
  - `refreshToken()` - Token refresh logic
  - `logout()` - Sign out handler
  - `hasCompletedOnboarding()` - Check character existence

- **API Client Enhancements**
  - Request interceptor for auth token injection
  - Response interceptor for 401 handling
  - Automatic sign out on unauthorized requests

#### 🎨 Login Screen (`app/(auth)/login.tsx`)
- **Visual Design**
  - Full-screen animated gradient background
  - Map illustration with breathing effect
  - WhereHere logo with Korean subtitle
  - Kakao button with brand colors (#FEE500)
  - Guest preview link ("둘러보기")

- **Animations**
  - Logo fade-in from top (800ms, spring animation)
  - Subtitle fade-in (600ms delay)
  - Button slide-up from bottom (1000ms delay)
  - Guest link fade-in (1200ms delay)
  - Background gradient pulse (6s loop)
  - All animations at 60fps using react-native-reanimated

- **Interactions**
  - Kakao login button with loading state
  - Error handling with user-friendly alerts
  - Navigation to onboarding or map based on status
  - Guest preview option

#### 🧙 Onboarding Flow (`app/(auth)/onboarding.tsx`)
- **Multi-Step Wizard**
  - Progress indicator with 3 dots
  - Smooth horizontal transitions between steps
  - Haptic feedback on interactions

- **Step 1: Username Input**
  - Text input with Korean character support
  - 2-10 character validation
  - Real-time duplicate checking (500ms debounce)
  - Bouncing character placeholder animation
  - Success/error feedback messages
  - Loading spinner during validation

- **Step 2: Character Selection**
  - 4 starter characters with unique themes:
    - 🌿 **도담 (Dodam)** - Explorer - Green gradient
    - 💨 **나래 (Narae)** - Foodie - Blue gradient
    - ☀️ **하람 (Haram)** - Artist - Orange gradient
    - ⭐ **별찌 (Byeolzzi)** - Socialite - Purple gradient
  - Character cards with:
    - Gradient backgrounds
    - Character emoji and element icon
    - Korean and English names
    - Description text
    - Selection checkmark badge
  - Scale animation on selection
  - Haptic feedback (heavy impact)
  - ScrollView for character grid

- **Step 3: Completion**
  - Celebration animation (confetti emoji)
  - Summary card with gradient
  - Selected character preview
  - Username display
  - "탐험 시작하기" CTA button
  - Loading state during character creation
  - Success haptic feedback
  - 1.5s delay before navigation

- **Step Transitions**
  - Fade out current step (200ms)
  - Slide left (-50px)
  - Fade in new step (300ms)
  - Slide in from right (50px)
  - Smooth progress dot animation

#### 🧩 Reusable Components
- **AuthButton** (`src/components/auth/AuthButton.tsx`)
  - Variants: primary, secondary, kakao
  - Loading state with spinner
  - Icon support
  - Press animation (scale 0.96)
  - Disabled state
  - Full width option

- **AuthInput** (`src/components/auth/AuthInput.tsx`)
  - Label support
  - Error/success messages
  - Loading indicator
  - Left/right icon slots
  - Animated border color
  - Focus/blur states
  - Placeholder text

#### 🔄 Navigation Flow
- **Root Redirect Logic** (`app/index.tsx`)
  - Check authentication state
  - Check onboarding completion
  - Redirect to appropriate screen:
    - Not authenticated → welcome
    - Authenticated, no character → onboarding
    - Authenticated, has character → map
  - Loading screen during initialization

#### 📝 Character Service
- **API Integration**
  - `create()` - Create new character
  - `getMyCharacter()` - Fetch user's character
  - `updateAppearance()` - Modify character look
  - Type-safe request/response models

#### 🎯 Character Classes
- `EXPLORER` - 도담 (Dodam)
- `FOODIE` - 나래 (Narae)
- `ARTIST` - 하람 (Haram)
- `SOCIALITE` - 별찌 (Byeolzzi)

#### 📚 Documentation
- **AUTH_FLOW.md** - Complete authentication flow documentation
  - Architecture overview
  - Screen-by-screen breakdown
  - State management details
  - API integration guide
  - Navigation flow
  - Error handling
  - Performance considerations
  - Future enhancements

- **AUTH_SETUP.md** - Setup and configuration guide
  - Supabase setup instructions
  - Kakao OAuth configuration
  - Environment variables
  - Development workflow
  - Production deployment
  - Troubleshooting guide

- **AUTH_TESTING.md** - Comprehensive testing guide
  - Manual test cases for all scenarios
  - Automated testing examples
  - Performance testing
  - Accessibility testing
  - Security testing
  - Bug report template

- **AUTH_QUICK_REFERENCE.md** - Developer quick reference
  - File structure
  - Key components
  - Common patterns
  - Code snippets
  - Debugging tips

- **docs/README.md** - Documentation index and overview

#### 🔧 Configuration
- **Environment Variables**
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  - `EXPO_PUBLIC_API_URL`
  - `.env.example` template

- **Supabase Client** (`src/config/supabase.ts`)
  - AsyncStorage integration
  - Auto token refresh
  - Session persistence
  - React Native optimizations

- **Deep Linking**
  - URL scheme: `wherehere://`
  - Auth callback: `wherehere://auth/callback`
  - Configured in `app.json`

#### 🎨 Design System Updates
- **Theme Tokens** (`src/config/theme.ts`)
  - Kakao brand colors added
  - Animation timing constants
  - Shadow styles
  - Border radius values

#### 🔒 Security
- Secure token storage in AsyncStorage
- HTTPS-only API calls
- Auth token in request headers
- Automatic logout on 401 responses
- CSRF protection via Supabase

#### ⚡ Performance
- 60fps animations with Reanimated
- Optimized re-renders with Zustand
- Debounced username validation
- Lazy loading where applicable
- Efficient state updates

#### ♿ Accessibility
- Screen reader labels on all buttons
- Form input labels
- Error message announcements
- Touch targets 44x44 minimum
- High contrast support

### Changed
- Updated `app/index.tsx` with auth state checking
- Enhanced `src/stores/authStore.ts` with Supabase integration
- Improved `src/services/api.ts` with session-based auth
- Refactored `src/hooks/useAuth.ts` for cleaner API

### Technical Details

#### Dependencies Used
- `@supabase/supabase-js` - Auth provider
- `react-native-reanimated` - Animations
- `expo-haptics` - Tactile feedback
- `expo-linear-gradient` - Gradient backgrounds
- `zustand` - State management
- `axios` - HTTP client

#### File Changes
- ✅ `app/(auth)/login.tsx` - Complete rewrite
- ✅ `app/(auth)/onboarding.tsx` - Complete rewrite
- ✅ `app/index.tsx` - Enhanced with auth logic
- ✅ `src/stores/authStore.ts` - Supabase integration
- ✅ `src/services/authService.ts` - Enhanced methods
- ✅ `src/services/api.ts` - Session-based auth
- ✅ `src/hooks/useAuth.ts` - Simplified API
- ✅ `src/components/auth/AuthButton.tsx` - New component
- ✅ `src/components/auth/AuthInput.tsx` - New component
- ✅ `src/components/auth/index.ts` - New barrel export
- ✅ `docs/AUTH_FLOW.md` - New documentation
- ✅ `docs/AUTH_SETUP.md` - New documentation
- ✅ `docs/AUTH_TESTING.md` - New documentation
- ✅ `docs/AUTH_QUICK_REFERENCE.md` - New documentation
- ✅ `docs/README.md` - New documentation
- ✅ `README.md` - Project overview
- ✅ `CHANGELOG.md` - This file

#### Lines of Code
- **Login Screen**: ~200 lines
- **Onboarding Screen**: ~500 lines
- **Auth Store**: ~100 lines
- **Auth Service**: ~80 lines
- **Components**: ~150 lines each
- **Documentation**: ~2000 lines total

### Fixed
- Session persistence across app restarts
- Token refresh on expiry
- Proper navigation after login
- Character creation error handling

### Known Issues
- OAuth flow requires development build (not Expo Go)
- Network errors need retry mechanism
- Username validation is mocked (needs backend integration)

### Next Steps
- Implement actual username duplicate checking
- Add social login options (Google, Apple)
- Add biometric authentication
- Implement character customization
- Add onboarding tutorial overlay
- A/B test character designs

---

## [Unreleased]

### Planned Features
- Social features (friends, chat)
- Leaderboards
- Event creation by users
- AR features
- Multi-city support
- International expansion

---

**Note**: This is the initial release focusing on authentication and onboarding. Future releases will add more features and improvements.
