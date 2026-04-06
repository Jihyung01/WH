import React, { useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { CharacterBody } from './CharacterBody';
import { EquipmentLayer } from './EquipmentLayer';
import { BackgroundLayer } from './BackgroundLayer';
import type { CharacterLoadout } from '../../../types';

interface Props {
  characterType: string;
  evolutionStage: string;
  loadout: CharacterLoadout[];
  size?: number;
  onPress?: () => void;
}

export function CharacterRenderer({
  characterType,
  evolutionStage,
  loadout,
  size = 200,
  onPress,
}: Props) {
  const bounceY = useSharedValue(0);
  const idleY = useSharedValue(0);

  // Idle floating animation
  React.useEffect(() => {
    idleY.value = withRepeat(
      withTiming(-4, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bounceY.value + idleY.value }],
  }));

  // Aura rotation
  const auraRotation = useSharedValue(0);
  const hasAura = loadout.some((l) => l.slot === 'aura');
  React.useEffect(() => {
    if (hasAura) {
      auraRotation.value = withRepeat(
        withTiming(360, { duration: 20000, easing: Easing.linear }),
        -1,
      );
    }
  }, [hasAura]);
  const auraStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${auraRotation.value}deg` }],
  }));

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    bounceY.value = withSequence(
      withSpring(-20, { damping: 4, stiffness: 300 }),
      withSpring(0, { damping: 8 }),
    );
    onPress?.();
  }, [onPress]);

  const bgItem = loadout.find((l) => l.slot === 'background');
  const equipmentSlots = loadout.filter((l) => l.slot !== 'background');

  return (
    <Pressable onPress={handlePress}>
      <View style={[styles.container, { width: size, height: size }]}>
        {/* Background layer (behind everything) */}
        {bgItem?.cosmetic && (
          <View style={styles.absolute}>
            <BackgroundLayer rarity={bgItem.cosmetic.rarity} size={size} />
          </View>
        )}

        {/* Aura layer (rotating) */}
        {hasAura && (
          <Animated.View style={[styles.absolute, auraStyle]}>
            {equipmentSlots
              .filter((l) => l.slot === 'aura' && l.cosmetic)
              .map((l) => (
                <EquipmentLayer
                  key={l.id}
                  slot="aura"
                  itemId={l.cosmetic_id}
                  previewEmoji={l.cosmetic!.preview_emoji}
                  rarity={l.cosmetic!.rarity}
                  size={size}
                />
              ))}
          </Animated.View>
        )}

        {/* Character body + equipment (bouncing together) */}
        <Animated.View style={[styles.absolute, animStyle]}>
          {/* Base character */}
          <CharacterBody type={characterType} stage={evolutionStage} size={size} />

          {/* Equipment layers on top */}
          {equipmentSlots
            .filter((l) => l.slot !== 'aura' && l.cosmetic)
            .map((l) => (
              <EquipmentLayer
                key={l.id}
                slot={l.slot}
                itemId={l.cosmetic_id}
                previewEmoji={l.cosmetic!.preview_emoji}
                rarity={l.cosmetic!.rarity}
                size={size}
              />
            ))}
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  absolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
