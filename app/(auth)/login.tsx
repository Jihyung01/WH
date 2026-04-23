import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  TextInput,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as AppleAuthentication from 'expo-apple-authentication';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useAuthStore } from '../../src/stores/authStore';
import { profileNeedsPersonalityQuiz } from '../../src/lib/api';
import { useTheme } from '../../src/providers/ThemeProvider';
import { BRAND, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, SHADOWS } from '../../src/config/theme';
import { PressableScale } from '../../src/components/ui';

export default function LoginScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const {
    signInWithKakao,
    signInWithApple,
    signInWithGoogle,
    signInWithEmailPassword,
    checkOnboardingStatus,
  } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [emailExpanded, setEmailExpanded] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [appleAvailable, setAppleAvailable] = useState(false);

  const isExpoGo =
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
    Constants.appOwnership === 'expo';

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    void AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);

  const logoOpacity = useSharedValue(0);
  const logoTranslateY = useSharedValue(-50);
  const buttonTranslateY = useSharedValue(100);
  const buttonOpacity = useSharedValue(0);
  const subtitleOpacity = useSharedValue(0);
  const guestLinkOpacity = useSharedValue(0);

  const mapScale = useSharedValue(1);

  useEffect(() => {
    logoOpacity.value = withDelay(200, withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) }));
    logoTranslateY.value = withDelay(200, withSpring(0, { damping: 15, stiffness: 100 }));
    
    subtitleOpacity.value = withDelay(600, withTiming(1, { duration: 600 }));
    
    buttonTranslateY.value = withDelay(1000, withSpring(0, { damping: 12, stiffness: 90 }));
    buttonOpacity.value = withDelay(1000, withTiming(1, { duration: 600 }));
    
    guestLinkOpacity.value = withDelay(1200, withTiming(1, { duration: 600 }));

    mapScale.value = withSequence(
      withTiming(1.05, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
      withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) })
    );
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ translateY: logoTranslateY.value }],
  }));

  const subtitleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ translateY: buttonTranslateY.value }],
  }));

  const guestLinkAnimatedStyle = useAnimatedStyle(() => ({
    opacity: guestLinkOpacity.value,
  }));

  const mapAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: mapScale.value }],
  }));

  async function routeAfterLogin() {
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) return;
    const hasOnboarded = await checkOnboardingStatus();
    if (hasOnboarded) router.replace('/(tabs)/map');
    else {
      const needsQuiz = await profileNeedsPersonalityQuiz();
      router.replace(
        (needsQuiz ? '/(auth)/personality-quiz' : '/(auth)/onboarding') as Href,
      );
    }
  }

  const handleKakaoLogin = async () => {
    try {
      setIsLoading(true);
      await signInWithKakao();
      await routeAfterLogin();
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : typeof error === 'string' ? error : '';
      if (msg.includes('cancelled') || msg.includes('취소')) return;
      Alert.alert(
        '로그인 실패',
        msg.trim().length > 0
          ? msg.trim()
          : '카카오 로그인 중 문제가 발생했습니다. 다시 시도해주세요.',
        [{ text: '확인' }],
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      await signInWithGoogle();
      await routeAfterLogin();
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : typeof error === 'string' ? error : '';
      if (msg.includes('cancel') || msg.includes('취소')) return;
      Alert.alert(
        '로그인 실패',
        msg.trim().length > 0
          ? msg.trim()
          : '구글 로그인 중 문제가 발생했습니다. 다시 시도해주세요.',
        [{ text: '확인' }],
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    try {
      setIsLoading(true);
      await signInWithApple();
      await routeAfterLogin();
    } catch (error: any) {
      if (error?.code === 'ERR_REQUEST_CANCELED' || error?.message?.includes('cancel')) return;
      console.error('Apple login error:', error);
      const msg = String(error?.message ?? '');
      const audienceMismatch = msg.includes('audience') || msg.includes('host.exp.Exponent');
      Alert.alert(
        '로그인 실패',
        audienceMismatch
          ? 'Expo Go에서는 Apple 토큰 audience가 host.exp.Exponent로 나와 Supabase(앱 번들 ID)와 맞지 않습니다. EAS 개발 빌드·TestFlight·스토어 빌드에서 Apple 로그인을 테스트하세요.'
          : 'Apple 로그인에 실패했습니다. Supabase Apple 제공자·Client ID(번들 ID)를 확인하세요.',
        [{ text: '확인' }],
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('입력 필요', '이메일과 비밀번호를 입력해주세요.');
      return;
    }
    try {
      setIsLoading(true);
      await signInWithEmailPassword(email, password);
      await routeAfterLogin();
    } catch (error: any) {
      console.error('Email login error:', error);
      Alert.alert(
        '로그인 실패',
        error?.message ?? '이메일 로그인에 실패했습니다. 심사용 계정은 이메일 인증이 완료된 상태여야 합니다.',
        [{ text: '확인' }],
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestPreview = () => {
    router.push('/(tabs)/map');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
      <Animated.View style={[styles.backgroundMap, mapAnimatedStyle]}>
        <LinearGradient
          colors={[BRAND.primary, BRAND.primaryLight, '#48DBFB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View style={[styles.mapOverlay, { backgroundColor: colors.background + 'B3' }]} />
        </LinearGradient>
      </Animated.View>

      <View style={styles.content}>
        <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
          <Text style={styles.logoIcon}>📍</Text>
          <Text style={[styles.logo, { color: colors.textPrimary }]}>WhereHere</Text>
          <Animated.Text style={[styles.subtitle, subtitleAnimatedStyle, { color: colors.textSecondary }]}>
            여기, 지금, 탐험을 시작하세요
          </Animated.Text>
        </Animated.View>

        <View style={styles.spacer} />

        <Animated.View style={buttonAnimatedStyle}>
          <PressableScale
            style={styles.kakaoButton}
            onPress={handleKakaoLogin}
            disabled={isLoading}
            accessibilityLabel="카카오로 로그인하기"
            accessibilityRole="button"
          >
            <Text style={styles.kakaoIcon}>💬</Text>
            <Text style={styles.kakaoButtonText}>
              {isLoading ? '로그인 중...' : '카카오로 시작하기'}
            </Text>
          </PressableScale>
        </Animated.View>

        <Animated.View style={[buttonAnimatedStyle, { marginTop: 12 }]}>
          <PressableScale
            style={[styles.googleButton, { borderColor: colors.border }]}
            onPress={handleGoogleLogin}
            disabled={isLoading}
            accessibilityLabel="구글로 로그인하기"
            accessibilityRole="button"
          >
            <Text style={styles.googleIcon}>G</Text>
            <Text style={[styles.googleButtonText, { color: colors.textPrimary }]}>
              {isLoading ? '로그인 중...' : '구글로 시작하기'}
            </Text>
          </PressableScale>
        </Animated.View>

        {Platform.OS === 'ios' && appleAvailable ? (
          <Animated.View style={[buttonAnimatedStyle, { marginTop: 12, gap: SPACING.sm }]}>
            {isExpoGo ? (
              <Text style={[styles.expoGoAppleHint, { color: colors.textSecondary }]}>
                Apple 로그인은 Expo Go에서 사용할 수 없습니다. Supabase Client ID는 실제 앱 번들 ID와
                일치해야 하는데, Expo Go에서는 토큰 audience가 달라집니다. EAS 빌드 또는 TestFlight에서
                테스트하세요.
              </Text>
            ) : (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={12}
                style={styles.appleBtnNative}
                onPress={() => {
                  if (isLoading) return;
                  void handleAppleLogin();
                }}
              />
            )}
          </Animated.View>
        ) : null}

        <Pressable
          style={styles.emailToggle}
          onPress={() => setEmailExpanded((v) => !v)}
          disabled={isLoading}
        >
          <Text style={[styles.emailToggleText, { color: colors.textSecondary }]}>
            {emailExpanded ? '이메일 로그인 닫기' : '이메일로 로그인 (앱 심사·테스트)'}
          </Text>
        </Pressable>

        {emailExpanded ? (
          <View style={styles.emailForm}>
            <TextInput
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
              placeholder="이메일"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              editable={!isLoading}
            />
            <TextInput
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
              placeholder="비밀번호"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              editable={!isLoading}
            />
            <Pressable
              style={[styles.emailSubmit, isLoading && styles.emailSubmitDisabled]}
              onPress={() => void handleEmailLogin()}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.emailSubmitText}>로그인</Text>
              )}
            </Pressable>
          </View>
        ) : null}

        <Animated.View style={guestLinkAnimatedStyle}>
          <PressableScale
            style={styles.guestLink}
            onPress={handleGuestPreview}
            haptic={false}
            accessibilityLabel="로그인 없이 둘러보기"
            accessibilityRole="button"
          >
            <Text style={[styles.guestLinkText, { color: colors.textSecondary }]}>둘러보기</Text>
          </PressableScale>
        </Animated.View>
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  appleBtnNative: {
    width: '100%',
    height: 48,
  },
  expoGoAppleHint: {
    fontSize: FONT_SIZE.sm,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: SPACING.md,
  },
  emailToggle: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    marginTop: SPACING.sm,
  },
  emailToggleText: {
    fontSize: FONT_SIZE.sm,
    textDecorationLine: 'underline',
  },
  emailForm: {
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  input: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    fontSize: FONT_SIZE.md,
  },
  emailSubmit: {
    backgroundColor: BRAND.primary,
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  emailSubmitDisabled: {
    opacity: 0.7,
  },
  emailSubmitText: {
    color: '#FFF',
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
  },
  backgroundMap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
    opacity: 0.2,
  },
  gradient: {
    flex: 1,
  },
  mapOverlay: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: 120,
    paddingBottom: SPACING.xxxl,
    justifyContent: 'space-between',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoIcon: {
    fontSize: 80,
    marginBottom: SPACING.lg,
  },
  logo: {
    fontSize: 48,
    fontWeight: FONT_WEIGHT.extrabold,
    marginBottom: SPACING.md,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: FONT_SIZE.lg,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  spacer: {
    flex: 1,
  },
  kakaoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND.kakaoYellow,
    paddingVertical: 18,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.sm,
    ...SHADOWS.md,
  },
  kakaoIcon: {
    fontSize: 24,
  },
  kakaoButtonText: {
    color: BRAND.kakaoText,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    borderRadius: BORDER_RADIUS.lg,
    gap: SPACING.sm,
    borderWidth: 1,
    ...SHADOWS.sm,
  },
  googleIcon: {
    width: 26,
    height: 26,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 18,
    fontWeight: FONT_WEIGHT.extrabold,
    color: '#4285F4',
    backgroundColor: '#F1F3F4',
    borderRadius: 13,
    lineHeight: 26,
    overflow: 'hidden',
  },
  googleButtonText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
  },
  guestLink: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    marginTop: SPACING.md,
  },
  guestLinkText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.medium,
    textDecorationLine: 'underline',
  },
});
