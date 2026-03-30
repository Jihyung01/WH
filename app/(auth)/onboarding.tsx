import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { createCharacter, updateProfile } from '../../src/lib/api';
import { supabase } from '../../src/config/supabase';
import { useAuthStore } from '../../src/stores/authStore';
import { useCharacterStore } from '../../src/stores/characterStore';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../src/config/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type CharacterName = '도담' | '나래' | '하람' | '별찌';

interface StarterCharacterDef {
  name: CharacterName;
  type: string;
  koreanName: string;
  description: string;
  emoji: string;
  colors: string[];
  element: string;
}

const STARTER_CHARACTERS: StarterCharacterDef[] = [
  {
    name: '도담',
    type: 'explorer',
    koreanName: '도담',
    description: '숲의 정령과 친구가 된 탐험가',
    emoji: '🌿',
    colors: ['#00D68F', '#00B074'],
    element: '🍃',
  },
  {
    name: '나래',
    type: 'foodie',
    koreanName: '나래',
    description: '바람을 타고 날아다니는 모험가',
    emoji: '💨',
    colors: ['#48DBFB', '#0ABDE3'],
    element: '☁️',
  },
  {
    name: '하람',
    type: 'artist',
    koreanName: '하람',
    description: '태양의 힘을 지닌 수호자',
    emoji: '☀️',
    colors: ['#F0C040', '#EE9A00'],
    element: '✨',
  },
  {
    name: '별찌',
    type: 'socialite',
    koreanName: '별찌',
    description: '별을 모으는 신비한 여행자',
    emoji: '⭐',
    colors: ['#7EE8CA', '#2DD4A8'],
    element: '🌙',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { setOnboardingComplete } = useAuthStore();
  
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [selectedCharacter, setSelectedCharacter] = useState<StarterCharacterDef | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const contentOpacity = useSharedValue(1);
  const contentTranslateX = useSharedValue(0);
  const characterBounce = useSharedValue(0);
  const celebrationScale = useSharedValue(0);

  useEffect(() => {
    if (step === 1) {
      characterBounce.value = withSequence(
        withTiming(-10, { duration: 500, easing: Easing.out(Easing.ease) }),
        withSpring(0, { damping: 5, stiffness: 100 })
      );
    }
  }, [step]);

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateX: contentTranslateX.value }],
  }));

  const characterBounceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: characterBounce.value }],
  }));

  const celebrationStyle = useAnimatedStyle(() => ({
    transform: [{ scale: celebrationScale.value }],
    opacity: celebrationScale.value,
  }));

  const handleNext = () => {
    if (step === 1 && username.length < 2) {
      setUsernameError('닉네임은 최소 2자 이상이어야 합니다');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    contentOpacity.value = withTiming(0, { duration: 200 });
    contentTranslateX.value = withTiming(-50, { duration: 200 }, () => {
      runOnJS(setStep)(step + 1);
      contentTranslateX.value = 50;
      contentOpacity.value = withTiming(1, { duration: 300 });
      contentTranslateX.value = withTiming(0, { duration: 300 });
    });
  };

  const handleCharacterSelect = (character: StarterCharacterDef) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setSelectedCharacter(character);
  };

  const checkUsernameAvailability = async (name: string) => {
    if (name.length < 2) {
      setUsernameError('');
      return;
    }

    setIsCheckingUsername(true);
    setUsernameError('');

    try {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', name)
        .maybeSingle();

      if (data) {
        setUsernameError('이미 사용 중인 닉네임입니다');
      } else {
        setUsernameError('');
      }
    } catch {
      setUsernameError('닉네임 확인 중 오류가 발생했습니다');
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const handleComplete = async () => {
    if (!selectedCharacter) return;

    try {
      setIsCreating(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      celebrationScale.value = withSpring(1, { damping: 10, stiffness: 100 });

      await updateProfile({ username });
      await createCharacter(selectedCharacter.name, selectedCharacter.type);
      try {
        await useCharacterStore.getState().fetchCharacter();
      } catch {
        /* 캐릭터는 이미 생성됨; 프로필 탭에서 다시 불러오기 */
      }

      setOnboardingComplete(true);

      setTimeout(() => {
        router.replace('/(tabs)/map');
      }, 1500);
    } catch (error) {
      console.error('Character creation error:', error);
      Alert.alert(
        '생성 실패',
        '캐릭터 생성 중 문제가 발생했습니다. 다시 시도해주세요.',
        [{ text: '확인' }]
      );
      celebrationScale.value = withTiming(0, { duration: 200 });
    } finally {
      setIsCreating(false);
    }
  };

  const renderStep1 = () => (
    <Animated.View style={[styles.stepContainer, contentAnimatedStyle]}>
      <Text style={styles.title}>탐험가 이름을 지어주세요</Text>
      <Text style={styles.subtitle}>모험에서 사용할 닉네임을 입력하세요</Text>

      <Animated.View style={[styles.characterPreview, characterBounceStyle]}>
        <Text style={styles.characterEmoji}>🧑‍🚀</Text>
      </Animated.View>

      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, usernameError && styles.inputError]}
          value={username}
          onChangeText={(text) => {
            setUsername(text);
            checkUsernameAvailability(text);
          }}
          placeholder="닉네임 (2-10자)"
          placeholderTextColor={COLORS.textMuted}
          maxLength={10}
          autoFocus
        />
        {isCheckingUsername && (
          <ActivityIndicator size="small" color={COLORS.primary} style={styles.inputSpinner} />
        )}
        {usernameError ? (
          <Text style={styles.errorText}>{usernameError}</Text>
        ) : username.length >= 2 ? (
          <Text style={styles.successText}>✓ 사용 가능한 닉네임입니다</Text>
        ) : null}
      </View>

      <Pressable
        style={[styles.nextButton, username.length < 2 && styles.nextButtonDisabled]}
        onPress={handleNext}
        disabled={username.length < 2 || isCheckingUsername || !!usernameError}
      >
        <Text style={styles.nextButtonText}>다음</Text>
      </Pressable>
    </Animated.View>
  );

  const renderStep2 = () => (
    <Animated.View style={[styles.stepContainer, contentAnimatedStyle]}>
      <Text style={styles.title}>첫 번째 동반자를 선택하세요</Text>
      <Text style={styles.subtitle}>함께 모험을 떠날 캐릭터를 골라주세요</Text>

      <ScrollView 
        style={styles.characterGrid}
        contentContainerStyle={styles.characterGridContent}
        showsVerticalScrollIndicator={false}
      >
        {STARTER_CHARACTERS.map((character) => {
          const isSelected = selectedCharacter?.name === character.name;
          
          return (
            <Pressable
              key={character.name}
              onPress={() => handleCharacterSelect(character)}
              style={styles.characterCardWrapper}
            >
              <LinearGradient
                colors={isSelected ? character.colors : [COLORS.surfaceLight, COLORS.surfaceLight]}
                style={[
                  styles.characterCard,
                  isSelected && styles.characterCardSelected,
                ]}
              >
                <View style={styles.characterElement}>
                  <Text style={styles.elementIcon}>{character.element}</Text>
                </View>
                
                <Text style={styles.characterCardEmoji}>{character.emoji}</Text>
                <Text style={styles.characterCardName}>{character.koreanName}</Text>
                <Text style={styles.characterCardSubname}>({character.name})</Text>
                <Text style={styles.characterCardDescription}>{character.description}</Text>
                
                {isSelected && (
                  <View style={styles.selectedBadge}>
                    <Text style={styles.selectedBadgeText}>✓</Text>
                  </View>
                )}
              </LinearGradient>
            </Pressable>
          );
        })}
      </ScrollView>

      <Pressable
        style={[styles.nextButton, !selectedCharacter && styles.nextButtonDisabled]}
        onPress={handleNext}
        disabled={!selectedCharacter}
      >
        <Text style={styles.nextButtonText}>다음</Text>
      </Pressable>
    </Animated.View>
  );

  const renderStep3 = () => (
    <Animated.View style={[styles.stepContainer, contentAnimatedStyle]}>
      <Animated.View style={[styles.celebrationContainer, celebrationStyle]}>
        <Text style={styles.celebrationEmoji}>🎉</Text>
      </Animated.View>

      <Text style={styles.title}>준비 완료!</Text>
      <Text style={styles.subtitle}>이제 {username}님의 모험이 시작됩니다</Text>

      <View style={styles.summaryCard}>
        {selectedCharacter && (
          <LinearGradient
            colors={selectedCharacter.colors}
            style={styles.summaryGradient}
          >
            <Text style={styles.summaryEmoji}>{selectedCharacter.emoji}</Text>
            <Text style={styles.summaryName}>{username}</Text>
            <Text style={styles.summaryCharacter}>
              동반자: {selectedCharacter.koreanName}
            </Text>
          </LinearGradient>
        )}
      </View>

      <Pressable
        style={[styles.completeButton, isCreating && styles.completeButtonDisabled]}
        onPress={handleComplete}
        disabled={isCreating}
      >
        {isCreating ? (
          <ActivityIndicator size="small" color={COLORS.textPrimary} />
        ) : (
          <Text style={styles.completeButtonText}>탐험 시작하기</Text>
        )}
      </Pressable>
    </Animated.View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={styles.progressBar}>
        {[1, 2, 3].map((s) => (
          <View
            key={s}
            style={[
              styles.progressDot,
              s <= step && styles.progressDotActive,
            ]}
          />
        ))}
      </View>

      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 60,
  },
  progressBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.xxl,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.surfaceLight,
  },
  progressDotActive: {
    backgroundColor: COLORS.primary,
    width: 24,
  },
  stepContainer: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxxl,
  },
  title: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xxxl,
  },
  characterPreview: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: SPACING.xxxl,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  characterEmoji: {
    fontSize: 64,
  },
  inputContainer: {
    marginBottom: SPACING.xxxl,
  },
  input: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    fontSize: FONT_SIZE.lg,
    color: COLORS.textPrimary,
    borderWidth: 2,
    borderColor: COLORS.borderLight,
    textAlign: 'center',
  },
  inputError: {
    borderColor: COLORS.error,
  },
  inputSpinner: {
    position: 'absolute',
    right: SPACING.lg,
    top: 18,
  },
  errorText: {
    color: COLORS.error,
    fontSize: FONT_SIZE.sm,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  successText: {
    color: COLORS.success,
    fontSize: FONT_SIZE.sm,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  characterGrid: {
    flex: 1,
    marginBottom: SPACING.xl,
  },
  characterGridContent: {
    gap: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  characterCardWrapper: {
    marginBottom: SPACING.md,
  },
  characterCard: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  characterCardSelected: {
    borderColor: COLORS.textPrimary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  characterElement: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
  },
  elementIcon: {
    fontSize: 24,
  },
  characterCardEmoji: {
    fontSize: 56,
    marginBottom: SPACING.md,
  },
  characterCardName: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  characterCardSubname: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  characterCardDescription: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  selectedBadge: {
    position: 'absolute',
    top: SPACING.md,
    left: SPACING.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedBadgeText: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
  },
  celebrationContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  celebrationEmoji: {
    fontSize: 80,
  },
  summaryCard: {
    marginBottom: SPACING.xxxl,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  summaryGradient: {
    padding: SPACING.xxxl,
    alignItems: 'center',
  },
  summaryEmoji: {
    fontSize: 72,
    marginBottom: SPACING.lg,
  },
  summaryName: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  summaryCharacter: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
    opacity: 0.9,
  },
  nextButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    marginTop: 'auto',
  },
  nextButtonDisabled: {
    opacity: 0.4,
  },
  nextButtonText: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
  },
  completeButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    marginTop: 'auto',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  completeButtonDisabled: {
    opacity: 0.6,
  },
  completeButtonText: {
    color: COLORS.textPrimary,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
  },
});
