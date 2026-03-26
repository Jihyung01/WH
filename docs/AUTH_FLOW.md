# WhereHere Authentication & Onboarding Flow

## Overview

This document describes the complete authentication and onboarding flow for WhereHere, including Kakao OAuth integration, session management, and character creation.

## Architecture

### Tech Stack
- **Auth Provider**: Supabase Auth with Kakao OAuth
- **State Management**: Zustand (`authStore`)
- **API Client**: Axios with interceptors
- **Animations**: react-native-reanimated
- **Haptics**: expo-haptics

### Flow Diagram

```
app/index.tsx
    ↓
[Check Auth State]
    ↓
    ├─ Not Authenticated → (auth)/welcome.tsx → (auth)/login.tsx
    │                                                ↓
    │                                          [Kakao OAuth]
    │                                                ↓
    ├─ Authenticated but No Character → (auth)/onboarding.tsx
    │                                          ↓
    │                                    [Create Character]
    │                                          ↓
    └─ Authenticated & Has Character → (tabs)/map.tsx
```

## Screens

### 1. Welcome Screen (`app/(auth)/welcome.tsx`)
- **Purpose**: First screen users see
- **Design**: App logo, tagline, "시작하기" button
- **Action**: Navigate to login screen

### 2. Login Screen (`app/(auth)/login.tsx`)

#### Design Features
- Full-screen animated gradient background (map illustration)
- Logo animation: fades in from top with spring animation
- Subtitle: "여기, 지금, 탐험을 시작하세요"
- Kakao button: slides up from bottom with spring animation
- Guest preview link: "둘러보기" (fades in last)

#### Animations
```typescript
// Logo entrance
logoOpacity: 0 → 1 (800ms, delay 200ms)
logoTranslateY: -50 → 0 (spring animation)

// Button entrance
buttonTranslateY: 100 → 0 (spring animation, delay 1000ms)
buttonOpacity: 0 → 1 (600ms, delay 1000ms)

// Background
mapScale: 1 → 1.05 → 1 (breathing effect, 6s loop)
```

#### Implementation
```typescript
const handleKakaoLogin = async () => {
  await signInWithKakao();
  const hasOnboarded = await checkOnboardingStatus();
  
  if (hasOnboarded) {
    router.replace('/(tabs)/map');
  } else {
    router.replace('/(auth)/onboarding');
  }
};
```

### 3. Onboarding Screen (`app/(auth)/onboarding.tsx`)

Multi-step wizard with 3 steps:

#### Step 1: Username Input
- **Title**: "탐험가 이름을 지어주세요"
- **Features**:
  - Text input (2-10 characters, Korean allowed)
  - Real-time validation
  - Debounced duplicate check (500ms)
  - Bouncing character placeholder animation
  - Success/error feedback

#### Step 2: Character Selection
- **Title**: "첫 번째 동반자를 선택하세요"
- **Characters**:
  1. **도담 (Dodam)** - Explorer
     - Element: 🍃
     - Colors: Green gradient
     - Description: "숲의 정령과 친구가 된 탐험가"
  
  2. **나래 (Narae)** - Foodie
     - Element: ☁️
     - Colors: Blue gradient
     - Description: "바람을 타고 날아다니는 모험가"
  
  3. **하람 (Haram)** - Artist
     - Element: ✨
     - Colors: Orange gradient
     - Description: "태양의 힘을 지닌 수호자"
  
  4. **별찌 (Byeolzzi)** - Socialite
     - Element: 🌙
     - Colors: Purple gradient
     - Description: "별을 모으는 신비한 여행자"

- **Interactions**:
  - Card selection with scale animation
  - Haptic feedback on selection
  - Selected card: border highlight + checkmark badge
  - Gradient background based on character theme

#### Step 3: Completion
- **Title**: "준비 완료!"
- **Features**:
  - Celebration animation (confetti emoji scales up)
  - Summary card showing:
    - Selected character emoji
    - Username
    - Character name
  - "탐험 시작하기" button
  - Loading state during character creation

#### Progress Indicator
- 3 dots at top of screen
- Active dot expands horizontally
- Smooth transitions between steps

#### Step Transitions
```typescript
// Fade out current step
contentOpacity: 1 → 0 (200ms)
contentTranslateX: 0 → -50 (200ms)

// Update step state

// Fade in new step
contentTranslateX: 50 → 0 (300ms)
contentOpacity: 0 → 1 (300ms)
```

## State Management

### Auth Store (`src/stores/authStore.ts`)

```typescript
interface AuthState {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasCompletedOnboarding: boolean;

  // Actions
  setUser: (user: User) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  setOnboardingComplete: (complete: boolean) => void;
  signInWithKakao: () => Promise<void>;
  signOut: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  checkOnboardingStatus: () => Promise<boolean>;
}
```

#### Key Methods

**`initializeAuth()`**
- Called on app launch
- Restores session from AsyncStorage
- Sets up auth state change listener
- Checks onboarding status if authenticated

**`signInWithKakao()`**
- Initiates Kakao OAuth flow via Supabase
- Redirects to `wherehere://auth/callback`
- Stores session on success

**`checkOnboardingStatus()`**
- Fetches `/characters/me` from API
- Returns `true` if character exists
- Returns `false` if 404 or error

**`signOut()`**
- Calls Supabase signOut
- Clears all auth state
- Navigates to welcome screen

## API Integration

### Auth Service (`src/services/authService.ts`)

```typescript
export const authService = {
  loginWithKakao(): Promise<AuthResponse>
  getSession(): Promise<Session | null>
  getCurrentUser(): Promise<User | null>
  refreshToken(): Promise<Session>
  logout(): Promise<void>
  deleteAccount(): Promise<void>
  hasCompletedOnboarding(): Promise<boolean>
}
```

### Character Service (`src/services/characterService.ts`)

```typescript
export const characterService = {
  create(request: CreateCharacterRequest): Promise<Character>
  getMyCharacter(): Promise<Character>
  updateAppearance(appearance: Record<string, unknown>): Promise<Character>
}
```

### API Client (`src/services/api.ts`)

Axios instance with interceptors:

**Request Interceptor**
```typescript
api.interceptors.request.use(async (config) => {
  const { session } = useAuthStore.getState();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});
```

**Response Interceptor**
```typescript
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await useAuthStore.getState().signOut();
    }
    return Promise.reject(error);
  }
);
```

## Supabase Configuration

### Setup (`src/config/supabase.ts`)

```typescript
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Required for React Native
  },
});
```

### Kakao OAuth Provider

1. **Supabase Dashboard Setup**:
   - Enable Kakao provider in Authentication > Providers
   - Add Kakao App ID and Secret
   - Configure redirect URL: `wherehere://auth/callback`

2. **Kakao Developers Console**:
   - Create app at https://developers.kakao.com
   - Add redirect URI: `https://<your-project>.supabase.co/auth/v1/callback`
   - Enable required scopes: profile, email

## Deep Linking

### URL Scheme
- **Scheme**: `wherehere://`
- **Auth Callback**: `wherehere://auth/callback`

### Configuration
Already configured in `app.json`:
```json
{
  "expo": {
    "scheme": "wherehere"
  }
}
```

## Environment Variables

Required in `.env`:

```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# FastAPI Backend
EXPO_PUBLIC_API_URL=https://wherehere-api.railway.app
```

## Navigation Flow

### Root Layout (`app/_layout.tsx`)
- Wraps app in GestureHandlerRootView
- Sets up Stack navigator
- Hides headers globally
- Dark theme background

### Index Screen (`app/index.tsx`)
```typescript
export default function Index() {
  const { isAuthenticated, hasCompletedOnboarding, isLoading, initializeAuth } = useAuthStore();

  useEffect(() => {
    initializeAuth();
  }, []);

  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Redirect href="/(auth)/welcome" />;
  if (!hasCompletedOnboarding) return <Redirect href="/(auth)/onboarding" />;
  return <Redirect href="/(tabs)/map" />;
}
```

## Error Handling

### Login Errors
```typescript
try {
  await signInWithKakao();
} catch (error) {
  Alert.alert(
    '로그인 실패',
    '카카오 로그인 중 문제가 발생했습니다. 다시 시도해주세요.',
    [{ text: '확인' }]
  );
}
```

### Character Creation Errors
```typescript
try {
  await characterService.create({ name, characterClass, appearance });
  setOnboardingComplete(true);
  router.replace('/(tabs)/map');
} catch (error) {
  Alert.alert(
    '생성 실패',
    '캐릭터 생성 중 문제가 발생했습니다. 다시 시도해주세요.',
    [{ text: '확인' }]
  );
}
```

### Session Expiry
- Handled automatically by API interceptor
- 401 response triggers automatic sign out
- User redirected to welcome screen

## Testing

### Manual Testing Checklist

- [ ] Fresh install redirects to welcome screen
- [ ] Welcome screen navigates to login
- [ ] Kakao login button opens OAuth flow
- [ ] Successful login redirects to onboarding (new user)
- [ ] Successful login redirects to map (returning user)
- [ ] Step 1: Username validation works
- [ ] Step 1: Character bounces on load
- [ ] Step 2: All 4 characters selectable
- [ ] Step 2: Haptic feedback on selection
- [ ] Step 2: Selected card highlights correctly
- [ ] Step 3: Celebration animation plays
- [ ] Step 3: Character creation succeeds
- [ ] Step 3: Redirects to map after creation
- [ ] Guest preview link works
- [ ] Sign out clears session
- [ ] App remembers session on restart
- [ ] Token refresh works automatically

### Edge Cases

1. **Network offline during login**
   - Show error alert
   - Allow retry

2. **Username already taken**
   - Show error message
   - Prevent progression to step 2

3. **API error during character creation**
   - Show error alert
   - Allow retry without losing progress

4. **Session expires during onboarding**
   - Redirect to login
   - Show session expired message

## Performance Considerations

### Animations
- Use `react-native-reanimated` for 60fps animations
- Run animations on UI thread
- Avoid layout thrashing

### API Calls
- Debounce username validation (500ms)
- Cache onboarding status check
- Use optimistic updates where possible

### State Management
- Persist session in AsyncStorage
- Lazy load user profile
- Minimize re-renders with Zustand selectors

## Future Enhancements

1. **Social Login**
   - Add Google OAuth
   - Add Apple Sign In (iOS)
   - Add email/password option

2. **Onboarding**
   - Add tutorial overlay
   - Allow character customization
   - Add profile photo upload

3. **Security**
   - Implement biometric authentication
   - Add device verification
   - Implement rate limiting

4. **Analytics**
   - Track onboarding completion rate
   - Monitor drop-off points
   - A/B test character designs

## Troubleshooting

### "Kakao login not working"
- Check Supabase provider configuration
- Verify Kakao app credentials
- Ensure redirect URI matches exactly

### "Session not persisting"
- Check AsyncStorage permissions
- Verify Supabase client config
- Clear app data and retry

### "Character creation fails"
- Check API endpoint availability
- Verify auth token is being sent
- Check backend logs for errors

### "Animations stuttering"
- Enable Hermes engine
- Check for console warnings
- Profile with React DevTools

## Resources

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Kakao Login Guide](https://developers.kakao.com/docs/latest/en/kakaologin/common)
- [Expo Router Docs](https://docs.expo.dev/router/introduction/)
- [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)
