# Authentication Setup Guide

Quick guide to set up authentication for WhereHere development and production.

## Prerequisites

- Expo CLI installed
- Supabase account
- Kakao Developers account
- Node.js 18+

## Step 1: Supabase Setup

### 1.1 Create Supabase Project

1. Go to https://supabase.com
2. Create a new project
3. Note your project URL and anon key

### 1.2 Enable Kakao OAuth

1. Navigate to **Authentication > Providers**
2. Find **Kakao** in the provider list
3. Toggle it **ON**
4. You'll need to fill in:
   - Kakao App ID (from Step 2)
   - Kakao Secret Key (from Step 2)
   - Redirect URL: `https://<your-project>.supabase.co/auth/v1/callback`

### 1.3 Configure Redirect URLs

1. Go to **Authentication > URL Configuration**
2. Add redirect URLs:
   - `wherehere://auth/callback` (for mobile app)
   - `http://localhost:8081/auth/callback` (for Expo dev)

## Step 2: Kakao Developers Setup

### 2.1 Create Kakao App

1. Go to https://developers.kakao.com
2. Click **내 애플리케이션** (My Applications)
3. Click **애플리케이션 추가하기** (Add Application)
4. Fill in app details:
   - App name: WhereHere
   - Company name: Your company
5. Note your **App Key** (REST API Key)

### 2.2 Configure Kakao Login

1. In your app dashboard, go to **제품 설정 > 카카오 로그인**
2. Toggle **카카오 로그인 활성화** ON
3. Add Redirect URI:
   - `https://<your-project>.supabase.co/auth/v1/callback`

### 2.3 Get Client Secret

1. Go to **보안** (Security) tab
2. Click **코드 생성** (Generate Code) for Client Secret
3. Copy the secret key

### 2.4 Set Consent Items

1. Go to **제품 설정 > 카카오 로그인 > 동의항목**
2. Enable required scopes:
   - ✅ 닉네임 (Nickname) - Required
   - ✅ 프로필 사진 (Profile Image) - Optional
   - ✅ 카카오계정(이메일) (Email) - Optional

## Step 3: Environment Variables

### 3.1 Copy Environment Template

```bash
cp .env.example .env
```

### 3.2 Fill in Values

Edit `.env`:

```bash
# Supabase (from Step 1)
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# FastAPI Backend
EXPO_PUBLIC_API_URL=https://wherehere-api.railway.app

# Google Maps (optional, for Android)
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...
```

## Step 4: Install Dependencies

```bash
npm install
```

## Step 5: Run the App

### Development

```bash
# Start Expo dev server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android
```

### Testing OAuth Flow

1. Start the app
2. Navigate to login screen
3. Click "카카오로 시작하기"
4. You'll be redirected to Kakao login
5. After login, you'll be redirected back to the app

**Note**: OAuth may not work perfectly in Expo Go. For full testing, use a development build:

```bash
# Create development build
npx expo prebuild
npx expo run:ios
# or
npx expo run:android
```

## Step 6: Backend API Setup

Ensure your FastAPI backend has these endpoints:

### Required Endpoints

```
POST   /api/v1/auth/kakao          - Exchange Kakao token for session
GET    /api/v1/auth/me             - Get current user profile
DELETE /api/v1/auth/account        - Delete user account

POST   /api/v1/characters          - Create character
GET    /api/v1/characters/me       - Get user's character
PATCH  /api/v1/characters/me       - Update character
```

### Example Backend Auth Flow

```python
@router.post("/auth/kakao")
async def kakao_login(token: str):
    # 1. Verify Kakao token
    kakao_user = await verify_kakao_token(token)
    
    # 2. Get or create user in database
    user = await get_or_create_user(kakao_user)
    
    # 3. Create Supabase session
    session = await supabase.auth.sign_in_with_oauth({
        "provider": "kakao",
        "access_token": token
    })
    
    return {
        "success": True,
        "data": {
            "user": user,
            "session": session
        }
    }
```

## Troubleshooting

### Issue: "Invalid redirect URI"

**Solution**: 
- Check that redirect URI in Kakao console exactly matches Supabase callback URL
- Ensure no trailing slashes
- Verify URL is added to both Kakao and Supabase

### Issue: "OAuth popup closes immediately"

**Solution**:
- Use development build instead of Expo Go
- Check URL scheme in `app.json` matches `wherehere://`
- Verify deep linking is configured

### Issue: "Session not persisting"

**Solution**:
- Check AsyncStorage permissions
- Clear app data and retry
- Verify Supabase client configuration

### Issue: "Character creation fails"

**Solution**:
- Check backend API is running
- Verify auth token is being sent in headers
- Check backend logs for errors
- Ensure character endpoint accepts correct payload

### Issue: "Animations are laggy"

**Solution**:
- Enable Hermes engine (should be default in Expo 50+)
- Use development build instead of Expo Go
- Check for console warnings
- Reduce animation complexity

## Testing Checklist

Before deploying, test these scenarios:

- [ ] Fresh install shows welcome screen
- [ ] Kakao login works on iOS
- [ ] Kakao login works on Android
- [ ] Session persists after app restart
- [ ] Onboarding flow completes successfully
- [ ] Character is created in backend
- [ ] User can sign out
- [ ] Signed out user redirects to welcome
- [ ] Returning user skips onboarding
- [ ] Token refresh works automatically
- [ ] Expired session redirects to login
- [ ] Network errors show appropriate messages

## Production Deployment

### 1. Update Environment Variables

Create production `.env`:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://prod-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<production-anon-key>
EXPO_PUBLIC_API_URL=https://api.wherehere.com
```

### 2. Update Kakao Redirect URIs

Add production redirect URIs to Kakao console:
- `https://prod-project.supabase.co/auth/v1/callback`
- `wherehere://auth/callback`

### 3. Build for Production

```bash
# iOS
eas build --platform ios --profile production

# Android
eas build --platform android --profile production
```

### 4. Submit to App Stores

Follow Expo's guide for app store submission:
- https://docs.expo.dev/submit/ios/
- https://docs.expo.dev/submit/android/

## Security Best Practices

1. **Never commit `.env` file**
   - Already in `.gitignore`
   - Use environment variables in CI/CD

2. **Use HTTPS only**
   - All API calls should use HTTPS
   - Verify SSL certificates

3. **Rotate secrets regularly**
   - Change Supabase anon key periodically
   - Update Kakao client secret

4. **Implement rate limiting**
   - Limit login attempts
   - Throttle API requests

5. **Monitor auth events**
   - Log failed login attempts
   - Alert on suspicious activity

## Support

For issues or questions:
- Check [AUTH_FLOW.md](./AUTH_FLOW.md) for detailed documentation
- Review Supabase logs in dashboard
- Check Kakao developer console for errors
- Contact backend team for API issues

## Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Kakao Login Guide (Korean)](https://developers.kakao.com/docs/latest/ko/kakaologin/common)
- [Expo Authentication Guide](https://docs.expo.dev/guides/authentication/)
- [React Native Reanimated Docs](https://docs.swmansion.com/react-native-reanimated/)
