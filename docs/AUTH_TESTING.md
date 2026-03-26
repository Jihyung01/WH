# Authentication Flow Testing Guide

Comprehensive testing guide for WhereHere authentication and onboarding.

## Test Environment Setup

### Prerequisites
- Development build installed on device/simulator
- Backend API running
- Supabase project configured
- Kakao OAuth configured

### Test Accounts

Create test Kakao accounts for different scenarios:
1. **New User** - Never logged in before
2. **Returning User** - Has completed onboarding
3. **Incomplete User** - Logged in but didn't complete onboarding

## Manual Test Cases

### 1. Fresh Install Flow

**Scenario**: User installs app for the first time

**Steps**:
1. Install app on clean device/simulator
2. Launch app
3. Verify welcome screen appears
4. Tap "시작하기" button
5. Verify login screen appears

**Expected Results**:
- ✅ Welcome screen shows logo and tagline
- ✅ Animations play smoothly
- ✅ Navigation to login works
- ✅ No errors in console

---

### 2. Login Screen Animations

**Scenario**: Verify all animations work correctly

**Steps**:
1. Navigate to login screen
2. Observe entrance animations
3. Check background gradient animation

**Expected Results**:
- ✅ Logo fades in from top (800ms)
- ✅ Subtitle appears after logo
- ✅ Kakao button slides up from bottom (1000ms delay)
- ✅ Guest link fades in last (1200ms delay)
- ✅ Background gradient pulses smoothly
- ✅ All animations at 60fps

**Performance Check**:
- Open React DevTools
- Enable "Highlight Updates"
- Verify no unnecessary re-renders

---

### 3. Kakao OAuth Flow - New User

**Scenario**: First-time user logs in with Kakao

**Steps**:
1. Tap "카카오로 시작하기" button
2. Complete Kakao login in webview
3. Grant permissions
4. Wait for redirect

**Expected Results**:
- ✅ Kakao webview opens
- ✅ Login completes successfully
- ✅ App redirects to onboarding screen
- ✅ Session is stored in AsyncStorage
- ✅ No errors in console

**Debug**:
```javascript
// Check session in console
import { useAuthStore } from './src/stores/authStore';
console.log(useAuthStore.getState().session);
```

---

### 4. Kakao OAuth Flow - Returning User

**Scenario**: User with existing character logs in

**Steps**:
1. Use Kakao account that has completed onboarding
2. Tap "카카오로 시작하기" button
3. Complete Kakao login

**Expected Results**:
- ✅ Login completes successfully
- ✅ App redirects directly to map screen
- ✅ Onboarding is skipped
- ✅ Character data loads correctly

---

### 5. Onboarding Step 1 - Username Input

**Scenario**: User enters username

**Test Cases**:

#### 5.1 Valid Username
**Steps**:
1. Enter "테스트" (2 characters)
2. Wait 500ms for validation

**Expected**:
- ✅ Input accepts Korean characters
- ✅ Success message appears: "✓ 사용 가능한 닉네임입니다"
- ✅ Next button becomes enabled
- ✅ Character bounces on screen

#### 5.2 Too Short Username
**Steps**:
1. Enter "테" (1 character)

**Expected**:
- ✅ Next button remains disabled
- ✅ No error message (just disabled state)

#### 5.3 Duplicate Username
**Steps**:
1. Enter existing username
2. Wait for validation

**Expected**:
- ✅ Error message appears: "이미 사용 중인 닉네임입니다"
- ✅ Next button remains disabled
- ✅ Input border turns red

#### 5.4 Special Characters
**Steps**:
1. Enter "테스트123"
2. Enter "테스트!@#"

**Expected**:
- ✅ Alphanumeric allowed
- ✅ Special characters handled appropriately

#### 5.5 Max Length
**Steps**:
1. Try entering 11+ characters

**Expected**:
- ✅ Input stops at 10 characters
- ✅ maxLength prop enforced

---

### 6. Onboarding Step 2 - Character Selection

**Scenario**: User selects starter character

**Test Cases**:

#### 6.1 Character Selection
**Steps**:
1. Navigate to step 2
2. Tap on "도담" character card

**Expected**:
- ✅ Haptic feedback fires
- ✅ Card scales up slightly
- ✅ Card shows gradient background
- ✅ Checkmark badge appears
- ✅ Border highlights
- ✅ Next button becomes enabled

#### 6.2 Change Selection
**Steps**:
1. Select "도담"
2. Select "나래"

**Expected**:
- ✅ Previous selection deselects
- ✅ New selection highlights
- ✅ Haptic feedback on each selection

#### 6.3 All Characters Selectable
**Steps**:
1. Tap each character one by one:
   - 도담 (Dodam) - Green
   - 나래 (Narae) - Blue
   - 하람 (Haram) - Orange
   - 별찌 (Byeolzzi) - Purple

**Expected**:
- ✅ All 4 characters are selectable
- ✅ Each shows correct gradient
- ✅ Each shows correct emoji and description

#### 6.4 Scroll Behavior
**Steps**:
1. Scroll through character list

**Expected**:
- ✅ ScrollView works smoothly
- ✅ All characters visible
- ✅ No layout issues

---

### 7. Onboarding Step 3 - Completion

**Scenario**: User completes onboarding

**Test Cases**:

#### 7.1 Summary Display
**Steps**:
1. Navigate to step 3

**Expected**:
- ✅ Celebration emoji scales up
- ✅ Username displays correctly
- ✅ Selected character shows
- ✅ Character gradient matches selection

#### 7.2 Character Creation Success
**Steps**:
1. Tap "탐험 시작하기" button
2. Wait for API call

**Expected**:
- ✅ Button shows loading spinner
- ✅ API call succeeds
- ✅ Character created in backend
- ✅ App redirects to map screen (1.5s delay)
- ✅ Success haptic feedback

**Debug**:
```bash
# Check backend logs
curl -H "Authorization: Bearer <token>" \
  https://wherehere-api.railway.app/api/v1/characters/me
```

#### 7.3 Character Creation Failure
**Steps**:
1. Disconnect network
2. Tap "탐험 시작하기"

**Expected**:
- ✅ Error alert appears
- ✅ Alert message: "캐릭터 생성 중 문제가 발생했습니다"
- ✅ User stays on step 3
- ✅ Can retry after reconnecting

---

### 8. Step Transitions

**Scenario**: Verify smooth transitions between steps

**Steps**:
1. Complete step 1, tap "다음"
2. Complete step 2, tap "다음"

**Expected Results**:
- ✅ Content fades out (200ms)
- ✅ Content slides left (-50px)
- ✅ New content slides in from right (50px)
- ✅ New content fades in (300ms)
- ✅ Progress dots update
- ✅ Haptic feedback on each transition

---

### 9. Progress Indicator

**Scenario**: Progress dots show current step

**Steps**:
1. Observe progress dots on each step

**Expected Results**:
- ✅ Step 1: First dot expanded
- ✅ Step 2: Second dot expanded
- ✅ Step 3: Third dot expanded
- ✅ Active dot is wider (24px vs 8px)
- ✅ Active dot is primary color
- ✅ Inactive dots are surface color

---

### 10. Session Persistence

**Scenario**: App remembers logged-in user

**Test Cases**:

#### 10.1 Close and Reopen
**Steps**:
1. Complete login
2. Close app (don't force quit)
3. Reopen app

**Expected**:
- ✅ User stays logged in
- ✅ Redirects to appropriate screen
- ✅ No login required

#### 10.2 Force Quit and Reopen
**Steps**:
1. Complete login
2. Force quit app
3. Reopen app

**Expected**:
- ✅ User stays logged in
- ✅ Session restored from AsyncStorage
- ✅ Auth state initialized correctly

#### 10.3 Clear App Data
**Steps**:
1. Complete login
2. Clear app data (Settings > Apps > WhereHere > Clear Data)
3. Reopen app

**Expected**:
- ✅ User is logged out
- ✅ Redirects to welcome screen
- ✅ Must login again

---

### 11. Guest Preview

**Scenario**: User browses without logging in

**Steps**:
1. On login screen, tap "둘러보기"

**Expected Results**:
- ✅ Navigates to map screen
- ✅ Limited functionality available
- ✅ Can view events but not check in
- ✅ Prompt to login for full features

---

### 12. Sign Out

**Scenario**: User signs out of account

**Steps**:
1. Navigate to profile/settings
2. Tap "로그아웃" button
3. Confirm sign out

**Expected Results**:
- ✅ Confirmation dialog appears
- ✅ Session cleared from AsyncStorage
- ✅ Auth store reset
- ✅ Redirects to welcome screen
- ✅ Cannot access protected routes

---

### 13. Token Refresh

**Scenario**: Session token expires and refreshes

**Steps**:
1. Login and wait for token to expire (or manually expire it)
2. Make an API call

**Expected Results**:
- ✅ Token refreshes automatically
- ✅ API call succeeds
- ✅ User stays logged in
- ✅ No visible interruption

**Debug**:
```javascript
// Manually expire token for testing
import { useAuthStore } from './src/stores/authStore';
const store = useAuthStore.getState();
store.setSession({ ...store.session, expires_at: Date.now() / 1000 - 1 });
```

---

### 14. Unauthorized Access

**Scenario**: Expired/invalid token triggers logout

**Steps**:
1. Login successfully
2. Manually invalidate token
3. Make an API call

**Expected Results**:
- ✅ API returns 401
- ✅ Interceptor catches error
- ✅ User automatically signed out
- ✅ Redirects to welcome screen
- ✅ Alert shown: "세션이 만료되었습니다"

---

### 15. Network Errors

**Scenario**: Handle various network conditions

**Test Cases**:

#### 15.1 No Internet - Login
**Steps**:
1. Disable network
2. Tap "카카오로 시작하기"

**Expected**:
- ✅ Error alert appears
- ✅ User stays on login screen
- ✅ Can retry after reconnecting

#### 15.2 No Internet - Onboarding
**Steps**:
1. Complete login
2. Disable network
3. Try to create character

**Expected**:
- ✅ Error alert appears
- ✅ User stays on step 3
- ✅ Can retry after reconnecting

#### 15.3 Slow Network
**Steps**:
1. Enable network throttling (slow 3G)
2. Complete login and onboarding

**Expected**:
- ✅ Loading indicators show
- ✅ No timeouts
- ✅ Eventually succeeds

---

## Automated Testing

### Unit Tests

```typescript
// authStore.test.ts
describe('authStore', () => {
  it('should initialize with correct default state', () => {
    const store = useAuthStore.getState();
    expect(store.isAuthenticated).toBe(false);
    expect(store.user).toBeNull();
  });

  it('should set session on signIn', async () => {
    await useAuthStore.getState().signInWithKakao();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('should clear session on signOut', async () => {
    await useAuthStore.getState().signOut();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().session).toBeNull();
  });
});
```

### Integration Tests

```typescript
// auth-flow.test.ts
describe('Authentication Flow', () => {
  it('should complete full onboarding flow', async () => {
    // 1. Navigate to login
    const { getByText } = render(<App />);
    fireEvent.press(getByText('시작하기'));
    
    // 2. Mock Kakao login
    await mockKakaoLogin();
    
    // 3. Enter username
    const usernameInput = getByPlaceholderText('닉네임 (2-10자)');
    fireEvent.changeText(usernameInput, '테스트');
    fireEvent.press(getByText('다음'));
    
    // 4. Select character
    fireEvent.press(getByText('도담'));
    fireEvent.press(getByText('다음'));
    
    // 5. Complete onboarding
    fireEvent.press(getByText('탐험 시작하기'));
    
    // 6. Verify navigation to map
    await waitFor(() => {
      expect(getByText('지도')).toBeTruthy();
    });
  });
});
```

## Performance Testing

### Metrics to Track

1. **Animation Frame Rate**
   - Target: 60fps
   - Tool: React DevTools Profiler

2. **Screen Load Time**
   - Welcome → Login: < 100ms
   - Login → Onboarding: < 500ms
   - Onboarding → Map: < 1000ms

3. **API Response Time**
   - Character creation: < 2s
   - Onboarding status check: < 500ms

4. **Memory Usage**
   - No memory leaks
   - Stable memory after navigation

### Performance Test Script

```javascript
// performance.test.js
import { measurePerformance } from '@shopify/react-native-performance';

measurePerformance('onboarding-flow', async () => {
  await navigateToLogin();
  await completeKakaoLogin();
  await completeOnboarding();
});
```

## Accessibility Testing

### Checklist

- [ ] All buttons have accessible labels
- [ ] Form inputs have labels
- [ ] Error messages are announced
- [ ] Navigation is keyboard accessible (web)
- [ ] Color contrast meets WCAG AA standards
- [ ] Touch targets are at least 44x44 points

### Screen Reader Test

1. Enable VoiceOver (iOS) or TalkBack (Android)
2. Navigate through auth flow
3. Verify all elements are announced correctly

## Security Testing

### Test Cases

1. **Token Storage**
   - ✅ Tokens stored in AsyncStorage (encrypted)
   - ✅ Tokens not logged to console
   - ✅ Tokens not exposed in error messages

2. **Deep Link Validation**
   - ✅ Only valid redirect URIs accepted
   - ✅ CSRF protection in place
   - ✅ State parameter validated

3. **API Security**
   - ✅ All requests use HTTPS
   - ✅ Auth header included in requests
   - ✅ Sensitive data not in URL params

## Bug Report Template

When filing bugs, include:

```markdown
**Environment**
- OS: iOS 17.0 / Android 14
- Device: iPhone 15 Pro / Pixel 8
- App Version: 1.0.0
- Build: Development / Production

**Steps to Reproduce**
1. 
2. 
3. 

**Expected Behavior**


**Actual Behavior**


**Screenshots**
[Attach screenshots]

**Logs**
[Paste relevant console logs]

**Additional Context**
```

## Test Checklist Summary

Before release, ensure all tests pass:

### Functional Tests
- [ ] Fresh install flow
- [ ] Login animations
- [ ] Kakao OAuth (new user)
- [ ] Kakao OAuth (returning user)
- [ ] Username validation
- [ ] Character selection
- [ ] Onboarding completion
- [ ] Step transitions
- [ ] Session persistence
- [ ] Guest preview
- [ ] Sign out
- [ ] Token refresh
- [ ] Unauthorized access
- [ ] Network errors

### Non-Functional Tests
- [ ] Performance (60fps animations)
- [ ] Memory (no leaks)
- [ ] Accessibility (screen reader)
- [ ] Security (token storage)

### Platform-Specific Tests
- [ ] iOS simulator
- [ ] iOS device
- [ ] Android emulator
- [ ] Android device
- [ ] Web (if applicable)

## Continuous Testing

### Pre-Commit
- Run linter
- Run type check
- Run unit tests

### Pre-Push
- Run integration tests
- Check bundle size

### Pre-Release
- Full manual test suite
- Performance profiling
- Accessibility audit
- Security scan

## Resources

- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Detox E2E Testing](https://wix.github.io/Detox/)
- [React Native Performance](https://reactnative.dev/docs/performance)
- [Accessibility Guide](https://reactnative.dev/docs/accessibility)
