# Authentication Quick Reference

Quick reference for WhereHere authentication implementation.

## File Structure

```
app/
├── (auth)/
│   ├── _layout.tsx          # Auth stack layout
│   ├── welcome.tsx          # Welcome screen
│   ├── login.tsx            # Login with Kakao
│   └── onboarding.tsx       # 3-step character creation
├── (tabs)/                  # Protected routes
└── index.tsx                # Root redirect logic

src/
├── stores/
│   └── authStore.ts         # Zustand auth state
├── services/
│   ├── authService.ts       # Auth API calls
│   ├── characterService.ts  # Character API calls
│   └── api.ts               # Axios instance with interceptors
├── hooks/
│   └── useAuth.ts           # Auth hook
├── components/
│   └── auth/
│       ├── AuthButton.tsx   # Reusable button component
│       └── AuthInput.tsx    # Reusable input component
└── config/
    ├── supabase.ts          # Supabase client
    ├── theme.ts             # Design tokens
    └── api.ts               # API config
```

## Key Components

### Auth Store

```typescript
import { useAuthStore } from '@/src/stores/authStore';

// State
const { 
  user,                      // User object or null
  session,                   // Supabase session
  isAuthenticated,           // Boolean
  isLoading,                 // Boolean
  hasCompletedOnboarding,    // Boolean
} = useAuthStore();

// Actions
const {
  signInWithKakao,           // () => Promise<void>
  signOut,                   // () => Promise<void>
  initializeAuth,            // () => Promise<void>
  checkOnboardingStatus,     // () => Promise<boolean>
} = useAuthStore();
```

### Auth Hook

```typescript
import { useAuth } from '@/src/hooks/useAuth';

const { 
  user,
  isAuthenticated,
  isLoading,
  hasCompletedOnboarding,
  loginWithKakao,
  logout,
} = useAuth();
```

### Auth Service

```typescript
import { authService } from '@/src/services/authService';

// Login
await authService.loginWithKakao();

// Get session
const session = await authService.getSession();

// Get user
const user = await authService.getCurrentUser();

// Logout
await authService.logout();

// Check onboarding
const hasOnboarded = await authService.hasCompletedOnboarding();
```

### Character Service

```typescript
import { characterService } from '@/src/services/characterService';

// Create character
const character = await characterService.create({
  name: 'username',
  characterClass: CharacterClass.EXPLORER,
  appearance: {
    bodyType: 1,
    hairStyle: 1,
    hairColor: '#00D68F',
    outfit: 'default',
    accessory: null,
    expression: 1,
  },
});

// Get my character
const character = await characterService.getMyCharacter();
```

## Navigation Flow

```typescript
// Root redirect (app/index.tsx)
if (!isAuthenticated) {
  return <Redirect href="/(auth)/welcome" />;
}

if (!hasCompletedOnboarding) {
  return <Redirect href="/(auth)/onboarding" />;
}

return <Redirect href="/(tabs)/map" />;
```

## Starter Characters

```typescript
const STARTER_CHARACTERS = [
  {
    id: CharacterClass.EXPLORER,
    name: 'Dodam',
    koreanName: '도담',
    description: '숲의 정령과 친구가 된 탐험가',
    emoji: '🌿',
    colors: ['#00D68F', '#00B074'],
    element: '🍃',
  },
  {
    id: CharacterClass.FOODIE,
    name: 'Narae',
    koreanName: '나래',
    description: '바람을 타고 날아다니는 모험가',
    emoji: '💨',
    colors: ['#48DBFB', '#0ABDE3'],
    element: '☁️',
  },
  {
    id: CharacterClass.ARTIST,
    name: 'Haram',
    koreanName: '하람',
    description: '태양의 힘을 지닌 수호자',
    emoji: '☀️',
    colors: ['#F0C040', '#EE9A00'],
    element: '✨',
  },
  {
    id: CharacterClass.SOCIALITE,
    name: 'Byeolzzi',
    koreanName: '별찌',
    description: '별을 모으는 신비한 여행자',
    emoji: '⭐',
    colors: ['#A29BFE', '#6C5CE7'],
    element: '🌙',
  },
];
```

## Common Patterns

### Protected Route

```typescript
import { useAuth } from '@/src/hooks/useAuth';
import { Redirect } from 'expo-router';

export default function ProtectedScreen() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;

  return <YourScreen />;
}
```

### API Call with Auth

```typescript
import api from '@/src/services/api';

// Token is automatically added by interceptor
const response = await api.get('/characters/me');
```

### Check Auth State

```typescript
import { useAuthStore } from '@/src/stores/authStore';

const isLoggedIn = useAuthStore((state) => state.isAuthenticated);
const user = useAuthStore((state) => state.user);
```

### Handle Auth Error

```typescript
try {
  await authService.loginWithKakao();
} catch (error) {
  Alert.alert('로그인 실패', '다시 시도해주세요.');
}
```

## Animations

### Entrance Animation

```typescript
import Animated, { 
  useSharedValue, 
  withTiming, 
  withSpring,
  useAnimatedStyle 
} from 'react-native-reanimated';

const opacity = useSharedValue(0);
const translateY = useSharedValue(50);

useEffect(() => {
  opacity.value = withTiming(1, { duration: 600 });
  translateY.value = withSpring(0);
}, []);

const animatedStyle = useAnimatedStyle(() => ({
  opacity: opacity.value,
  transform: [{ translateY: translateY.value }],
}));
```

### Button Press Animation

```typescript
const scale = useSharedValue(1);

const handlePressIn = () => {
  scale.value = withSpring(0.96);
};

const handlePressOut = () => {
  scale.value = withSpring(1);
};

const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: scale.value }],
}));
```

## Haptics

```typescript
import * as Haptics from 'expo-haptics';

// Light tap
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

// Medium tap
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

// Heavy tap
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

// Success
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

// Error
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
```

## Environment Variables

```bash
# .env
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
EXPO_PUBLIC_API_URL=https://wherehere-api.railway.app
```

Access in code:
```typescript
process.env.EXPO_PUBLIC_SUPABASE_URL
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
process.env.EXPO_PUBLIC_API_URL
```

## Theme Tokens

```typescript
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '@/src/config/theme';

// Colors
COLORS.primary          // #6C5CE7
COLORS.background       // #0A0E1A
COLORS.textPrimary      // #FFFFFF
COLORS.kakaoYellow      // #FEE500

// Spacing
SPACING.xs              // 4
SPACING.sm              // 8
SPACING.md              // 12
SPACING.lg              // 16
SPACING.xl              // 24

// Font Size
FONT_SIZE.sm            // 13
FONT_SIZE.md            // 15
FONT_SIZE.lg            // 17
FONT_SIZE.xl            // 20

// Font Weight
FONT_WEIGHT.regular     // '400'
FONT_WEIGHT.semibold    // '600'
FONT_WEIGHT.bold        // '700'

// Border Radius
BORDER_RADIUS.md        // 12
BORDER_RADIUS.lg        // 16
```

## Debugging

### Check Auth State

```typescript
// In console or React DevTools
import { useAuthStore } from './src/stores/authStore';
console.log(useAuthStore.getState());
```

### Check Session

```typescript
import { supabase } from './src/config/supabase';
const { data } = await supabase.auth.getSession();
console.log(data.session);
```

### Check AsyncStorage

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
const keys = await AsyncStorage.getAllKeys();
const session = await AsyncStorage.getItem('supabase.auth.token');
console.log(JSON.parse(session));
```

### Clear Session

```typescript
import { useAuthStore } from './src/stores/authStore';
await useAuthStore.getState().signOut();
```

## Common Issues

### "OAuth not working"
- Use development build, not Expo Go
- Check redirect URI configuration
- Verify Kakao app credentials

### "Session not persisting"
- Check AsyncStorage permissions
- Verify Supabase client config
- Clear app data and retry

### "Animations stuttering"
- Enable Hermes engine
- Use development build
- Check for console warnings

### "API calls failing"
- Check network connection
- Verify API URL in .env
- Check auth token in headers

## Scripts

```bash
# Start dev server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Create development build
npx expo prebuild
npx expo run:ios
npx expo run:android

# Type check
npx tsc --noEmit

# Lint
npx eslint .

# Clear cache
npx expo start --clear
```

## Resources

- [Full Documentation](./AUTH_FLOW.md)
- [Setup Guide](./AUTH_SETUP.md)
- [Testing Guide](./AUTH_TESTING.md)
- [Supabase Docs](https://supabase.com/docs)
- [Expo Router Docs](https://docs.expo.dev/router/)
