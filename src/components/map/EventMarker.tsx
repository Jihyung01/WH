import React, { memo, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  InteractionManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Marker } from 'react-native-maps';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { EventCategory } from '../../types/enums';
import type { NearbyEvent, GeoPoint } from '../../types';
import { getConditionalEventTag } from '../../services/weather';
import { getDistance } from '../../utils/geo';
import { CHECK_IN_RADIUS_METERS } from '../../utils/constants';
import { COLORS } from '../../config/theme';

interface EventMarkerProps {
  event: NearbyEvent;
  userLocation: GeoPoint | null;
  onPress: (event: NearbyEvent) => void;
}

type IonName = React.ComponentProps<typeof Ionicons>['name'];

/**
 * Each entry keeps the legacy Ionicons name (used on iOS where bitmap capture
 * handles icon fonts reliably) **and** an emoji fallback. Android rasterises
 * the custom marker into a bitmap, and icon-font glyphs are often not loaded
 * at capture time → broken glyphs. The system emoji font is always available,
 * so emojis round-trip through the bitmap cleanly.
 */
const MARKER_CONFIG: Record<string, { color: string; ion: IonName; emoji: string; label: string }> = {
  /** 레거시/별칭 */
  activity:                         { color: '#00D68F', ion: 'navigate-outline',      emoji: '🧭', label: '탐험' },
  [EventCategory.EXPLORATION]:      { color: '#00D68F', ion: 'navigate-outline',      emoji: '🧭', label: '탐험' },
  [EventCategory.CULTURE]:          { color: '#48DBFB', ion: 'camera-outline',        emoji: '🎨', label: '인증' },
  [EventCategory.HIDDEN_GEM]:       { color: '#A29BFE', ion: 'sparkles-outline',      emoji: '✨', label: '히든' },
  [EventCategory.FOOD]:             { color: '#F0C040', ion: 'restaurant-outline',    emoji: '🍽️', label: '맛집' },
  [EventCategory.CAFE]:             { color: '#F0C040', ion: 'cafe-outline',          emoji: '☕', label: '카페' },
  [EventCategory.NATURE]:           { color: '#00D68F', ion: 'leaf-outline',          emoji: '🌿', label: '자연' },
  [EventCategory.NIGHTLIFE]:        { color: '#A29BFE', ion: 'moon-outline',          emoji: '🌙', label: '야간' },
  [EventCategory.SHOPPING]:         { color: '#FF6B6B', ion: 'bag-outline',           emoji: '🛍️', label: '쇼핑' },
  [EventCategory.PHOTO]:            { color: '#3B82F6', ion: 'image-outline',         emoji: '📸', label: '포토' },
  [EventCategory.QUIZ]:             { color: '#8B5CF6', ion: 'help-circle-outline',   emoji: '❓', label: '퀴즈' },
  [EventCategory.PARTNERSHIP]:      { color: '#F59E0B', ion: 'people-outline',        emoji: '🤝', label: '제휴' },
};

function getMarkerConfig(category: string): {
  color: string;
  ion: IonName;
  emoji: string;
  label: string;
} {
  return MARKER_CONFIG[category] ?? { color: COLORS.primary, ion: 'location-outline', emoji: '📍', label: '이벤트' };
}

const IS_ANDROID = Platform.OS === 'android';

/**
 * 9d77a82 (마커가 동그랗게 정상으로 나왔던 시점)에서 검증된 레이아웃.
 * Android는 GoogleMap이 marker view를 비트맵으로 스냅샷해 GL 텍스처로
 * 띄우는데, 이 비트맵 캡처가 다음 셋에 약하다:
 *   1) 컨테이너 height가 고정인데 자식(spacer/tag) 가 그 밖으로 overflow
 *      하면 캡처에서 잘려나감.
 *   2) absolute-positioned 자식(예: 헤일로) — 일부 OEM 에서 비트맵에
 *      안정적으로 합성되지 않음.
 *   3) Reanimated worklet 이 marker bitmap commit 과 경합 → 반쪽 비트맵.
 *
 * 그래서 동작했던 패턴:
 *   - 컨테이너 height = body + (tag 있으면 22 추가) — 항상 자식 다 포함.
 *   - 펄스 링은 absolute 지만 markerBody **안쪽** 에 들어가는 크기 (60>56)
 *     로 잡아서 컨테이너 안에서 완전히 cover 된다.
 *   - bubble 안에 Ionicons size 20 (다른 OEM 에서 폰트 글리프 누락이 있다는
 *     보고가 있지만, 적어도 Z Flip 의 SVG/emoji 누락 케이스보다 안정적이며
 *     원래 정상 동작했던 조합).
 *   - tracksViewChanges 720ms (Z Flip 첫 layout commit + Ionicons 폰트
 *     계측이 끝날 시간 충분히 줌).
 */
const MARKER_LAYOUT = IS_ANDROID
  ? {
      containerWidth: 72,
      minHeight: 78,
      markerBody: 60,
      bubble: 44,
      pulseRing: 56,
      iconSize: 20,
      paddingBottom: 10,
      arrowTop: 9,
      arrowSide: 7,
    }
  : {
      containerWidth: 64,
      minHeight: 72,
      markerBody: 56,
      bubble: 40,
      pulseRing: 52,
      iconSize: 18,
      paddingBottom: 4,
      arrowTop: 8,
      arrowSide: 6,
    };

function EventMarkerComponent({ event, userLocation, onPress }: EventMarkerProps) {
  const config = getMarkerConfig(event.category);
  const conditionalLabel =
    event.visibility_conditions != null ? getConditionalEventTag(event.visibility_conditions) : null;
  const isExpired = !event.is_active || (event.expires_at != null && new Date(event.expires_at) < new Date());

  const coordinate = { latitude: event.lat, longitude: event.lng };

  const distance = userLocation
    ? getDistance(userLocation, coordinate)
    : Infinity;
  const isInRange = distance <= CHECK_IN_RADIUS_METERS;

  // Reanimated은 iOS 펄스 링 전용. Android 분기에서는 호출 자체를 피해서
  // marker bitmap commit 과 worklet 초기화가 경합하지 않게 한다.
  const pulseOpacity = useSharedValue(1);
  const pulseVisible = useSharedValue(0);

  useEffect(() => {
    if (IS_ANDROID) return;
    pulseVisible.value = isInRange && !isExpired ? 1 : 0;
    if (isInRange && !isExpired) {
      pulseOpacity.value = withRepeat(
        withTiming(0.4, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    } else {
      pulseOpacity.value = 1;
    }
  }, [isInRange, isExpired]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseVisible.value ? pulseOpacity.value : 0,
  }));

  const markerColor = isExpired ? '#555B6E' : conditionalLabel ? '#7C3AED' : config.color;
  const markerOpacity = isExpired ? 0.5 : isInRange ? 1 : 0.7;

  // 9d77a82와 동일: tag 있으면 컨테이너 height에 22(android)/18(ios) 더해서
  // 자식이 컨테이너 밖으로 overflow 안 되게 한다. 이 한 줄이 "잘림" 의 원인.
  const containerMinHeight =
    MARKER_LAYOUT.minHeight +
    (conditionalLabel && !isExpired ? (IS_ANDROID ? 22 : 18) : 0);

  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    InteractionManager.runAfterInteractions(() => {
      // Android: 첫 layout commit + Ionicons 폰트 계측이 다 끝날 시간 충분히 준다.
      // 이 값을 350으로 줄였더니 Z Flip 에서 반쪽 비트맵으로 굳는 회귀가 있었음.
      const delayMs = IS_ANDROID ? 720 : 160;
      timer = setTimeout(() => {
        if (!cancelled) setTracksViewChanges(false);
      }, delayMs);
    });
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [event.id]);

  // Android는 Reanimated 펄스 링을 쓰지 않고, isInRange 일 때만 정적 링을 그린다.
  // (Reanimated worklet 이 marker bitmap commit 과 경합하면 반쪽 비트맵이 됨.)
  const showAndroidStaticPulse = IS_ANDROID && isInRange && !isExpired;

  return (
    <Marker
      identifier={`event-${event.id}`}
      coordinate={coordinate}
      onPress={() => onPress(event)}
      tracksViewChanges={tracksViewChanges}
    >
      <View
        style={[
          styles.container,
          {
            opacity: markerOpacity,
            width: MARKER_LAYOUT.containerWidth,
            // Android: 명시적 height. iOS: minHeight (Reanimated 펄스가
            // 살짝 밖으로 나가도 UIKit 스냅샷이 처리해줌).
            ...(IS_ANDROID
              ? { height: containerMinHeight, minHeight: undefined }
              : { minHeight: containerMinHeight }),
            paddingBottom: MARKER_LAYOUT.paddingBottom,
          },
        ]}
        collapsable={false}
        renderToHardwareTextureAndroid={IS_ANDROID}
      >
        <View
          style={[
            styles.markerBody,
            { width: MARKER_LAYOUT.markerBody, height: MARKER_LAYOUT.markerBody },
          ]}
        >
          {IS_ANDROID ? (
            showAndroidStaticPulse ? (
              <View
                pointerEvents="none"
                style={[
                  styles.pulseRing,
                  styles.pulseRingAndroidStatic,
                  {
                    width: MARKER_LAYOUT.pulseRing,
                    height: MARKER_LAYOUT.pulseRing,
                    borderRadius: MARKER_LAYOUT.pulseRing / 2,
                    borderColor: markerColor,
                  },
                ]}
              />
            ) : null
          ) : (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.pulseRing,
                {
                  width: MARKER_LAYOUT.pulseRing,
                  height: MARKER_LAYOUT.pulseRing,
                  borderRadius: MARKER_LAYOUT.pulseRing / 2,
                  borderColor: markerColor,
                },
                pulseStyle,
              ]}
            />
          )}

          <View
            style={[
              styles.bubble,
              IS_ANDROID && styles.bubbleAndroid,
              {
                backgroundColor: markerColor,
                width: MARKER_LAYOUT.bubble,
                height: MARKER_LAYOUT.bubble,
                borderRadius: MARKER_LAYOUT.bubble / 2,
              },
            ]}
          >
            <Ionicons
              name={isExpired ? 'checkmark' : config.ion}
              size={MARKER_LAYOUT.iconSize}
              color="#FFFFFF"
              style={IS_ANDROID ? styles.ionAndroid : undefined}
              allowFontScaling={false}
            />
          </View>
        </View>

        <View
          style={[
            styles.arrow,
            {
              borderTopColor: markerColor,
              borderLeftWidth: MARKER_LAYOUT.arrowSide,
              borderRightWidth: MARKER_LAYOUT.arrowSide,
              borderTopWidth: MARKER_LAYOUT.arrowTop,
            },
          ]}
        />

        {conditionalLabel && !isExpired ? (
          <View style={styles.tagWrap}>
            <Text style={styles.tagText} numberOfLines={1}>
              {conditionalLabel}
            </Text>
          </View>
        ) : null}
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    overflow: 'visible',
  },
  markerBody: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    borderWidth: 3,
  },
  /** Reanimated worklet 이 marker bitmap commit 과 경합하면 펄스 링이 호일/반원이
   *  되거나 사라진다. Android 에서는 동일 위치에 정적 링만 그려서 회피. */
  pulseRingAndroidStatic: {
    opacity: 0.42,
  },
  bubble: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  /** elevation/shadow 가 marker bitmap 캡처 시 픽셀을 그림자 영역까지 계산하면서
   *  컨테이너 안쪽 컨텐츠를 잘라먹는 OEM 케이스가 있어 Android는 elevation 0. */
  bubbleAndroid: {
    elevation: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },
  ionAndroid: {
    marginTop: -1,
  },
  arrow: {
    width: 0,
    height: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
  tagWrap: {
    marginTop: 2,
    maxWidth: 120,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
  },
  tagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#F5F3FF',
    textAlign: 'center',
    ...(IS_ANDROID ? { includeFontPadding: false } : {}),
  },
});

export const EventMarker = memo(EventMarkerComponent);
