import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
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
import { useTheme } from '../../src/providers/ThemeProvider';
import { BRAND, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, SHADOWS } from '../../src/config/theme';
import { PressableScale } from '../../src/components/ui';

export default function LoginScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { signInWithKakao, checkOnboardingStatus } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

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

  const handleKakaoLogin = async () => {
    try {
      setIsLoading(true);
      await signInWithKakao();
      
      const hasOnboarded = await checkOnboardingStatus();
      
      if (hasOnboarded) {
        router.replace('/(tabs)/map');
      } else {
        router.replace('/(auth)/onboarding');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert(
        '로그인 실패',
        '카카오 로그인 중 문제가 발생했습니다. 다시 시도해주세요.',
        [{ text: '확인' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestPreview = () => {
    router.push('/(tabs)/map');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
