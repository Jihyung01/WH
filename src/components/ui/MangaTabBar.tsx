import React, { memo } from 'react';
import { View, Pressable, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { MANGA, MANGA_BORDER, MANGA_SHADOW_OFFSET, FONT_FAMILY } from '../../config/theme';

/**
 * Spec §0.2 — 만화 톤 5탭 탭바.
 *
 * 디자인 (WhereHere_Manga.html):
 *   - 종이 배경 (#FFFEF5)
 *   - 잉크 상단 테두리 2.5px
 *   - 비활성 라벨: rgba(ink, .42)
 *   - 활성 라벨: 빨강 (#FF4757)
 *   - 활성 아이콘: 36x36 노랑 pill + ink 2px 외곽선 + sm hard shadow + translateY(-3)
 *   - 라벨 폰트: 10px / 900 / -.2 letter-spacing
 *
 * iOS / Android 양쪽 안전. 햅틱 light + 시각적 scale active.
 */

const TAB_ICON_SIZE = 36;
const TAB_ICON_RADIUS = 10;

type TabIconKey = 'map' | 'feed' | 'social' | 'messages' | 'profile';

const ICON_FOR: Record<TabIconKey, { active: string; inactive: string }> = {
  map:      { active: 'map',          inactive: 'map-outline' },
  feed:     { active: 'images',       inactive: 'images-outline' },
  social:   { active: 'people',       inactive: 'people-outline' },
  messages: { active: 'chatbubbles',  inactive: 'chatbubbles-outline' },
  profile:  { active: 'person',       inactive: 'person-outline' },
};

const ROUTE_TO_ICON: Record<string, TabIconKey> = {
  map: 'map',
  explore: 'feed',
  social: 'social',
  messages: 'messages',
  profile: 'profile',
};

/**
 * 탭바에 노출할 5개 라우트 화이트리스트.
 * expo-router 의 href:null 옵션이 일부 환경에서 state.routes 에서 안 빠지는
 * 케이스가 있어, 이름 매칭으로 한 번 더 가드. 이게 없으면 chara/quests/
 * inventory/missions 같은 hidden route 가 탭바에 새어 나옴.
 */
const VISIBLE_TAB_ROUTES = new Set(Object.keys(ROUTE_TO_ICON));

function MangaTabBarInner({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const offset = MANGA_SHADOW_OFFSET.sm;

  return (
    <View
      style={[
        styles.bar,
        {
          paddingBottom: Math.max(insets.bottom, 12) + 6,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        // 화이트리스트로 1차 가드 — href:null 옵션이 새는 환경에서도 hidden
        // route(chara/quests/inventory/missions) 가 탭바에 안 나오게.
        if (!VISIBLE_TAB_ROUTES.has(route.name)) return null;

        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        // 라벨: options.title > options.tabBarLabel > route.name
        const labelRaw =
          (options.tabBarLabel as string | undefined) ?? options.title ?? route.name;
        const label = typeof labelRaw === 'string' ? labelRaw : route.name;

        // href:null 처리: hidden 탭은 그리지 않음
        if (options.tabBarButton === null || (options as { href?: unknown }).href === null) {
          return null;
        }

        const iconKey = ROUTE_TO_ICON[route.name] ?? 'map';
        const iconName = isFocused
          ? ICON_FOR[iconKey].active
          : ICON_FOR[iconKey].inactive;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            if (Platform.OS === 'ios') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            }
            navigation.navigate(route.name as never);
          }
        };

        const onLongPress = () => {
          navigation.emit({ type: 'tabLongPress', target: route.key });
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            onPress={onPress}
            onLongPress={onLongPress}
            style={({ pressed }) => [
              styles.tab,
              { transform: [{ scale: pressed ? 0.92 : 1 }] },
            ]}
          >
            <View style={styles.iconWrap}>
              {/* 활성 시 hard-shadow underlay */}
              {isFocused ? (
                <View
                  style={[
                    styles.iconShadow,
                    { top: offset - 3, left: offset },
                  ]}
                />
              ) : null}
              <View
                style={[
                  styles.iconBox,
                  isFocused
                    ? {
                        backgroundColor: MANGA.y,
                        borderWidth: 2,
                        borderColor: MANGA.ink,
                        transform: [{ translateY: -3 }],
                      }
                    : {
                        backgroundColor: 'transparent',
                      },
                ]}
              >
                <Ionicons
                  // expo Ionicons 의 union type 이라 string 직접 못 넣음
                  name={iconName as never}
                  size={isFocused ? 22 : 24}
                  color={MANGA.ink}
                  style={{ opacity: isFocused ? 1 : 0.42 }}
                  allowFontScaling={false}
                />
              </View>
            </View>
            <Text
              allowFontScaling={false}
              numberOfLines={1}
              style={[
                styles.label,
                {
                  color: isFocused ? MANGA.r : 'rgba(26,22,18,0.42)',
                  marginTop: isFocused ? -1 : 2,
                },
              ]}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: MANGA.paper,
    borderTopWidth: MANGA_BORDER.width,
    borderTopColor: MANGA_BORDER.color,
    paddingTop: 6,
    paddingHorizontal: 4,
    justifyContent: 'space-around',
    alignItems: 'flex-start',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 4,
    minHeight: 56,
  },
  iconWrap: {
    width: TAB_ICON_SIZE,
    height: TAB_ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconShadow: {
    position: 'absolute',
    width: TAB_ICON_SIZE,
    height: TAB_ICON_SIZE,
    borderRadius: TAB_ICON_RADIUS,
    backgroundColor: MANGA.ink,
  },
  iconBox: {
    width: TAB_ICON_SIZE,
    height: TAB_ICON_SIZE,
    borderRadius: TAB_ICON_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.primaryBold,
    fontWeight: '900',
    letterSpacing: -0.2,
    includeFontPadding: false,
  },
});

export const MangaTabBar = memo(MangaTabBarInner);
