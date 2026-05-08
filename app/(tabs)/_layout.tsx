import { Tabs } from 'expo-router';
import { MangaTabBar } from '../../src/components/ui';

/**
 * 5-tab manga 톤 layout (Phase 1).
 *
 * 탭 순서: 지도 → 피드 (explore) → 소셜 → 메시지 → 프로필.
 * 캐릭터 탭은 5탭에서 제외 (스펙·디자인 변경 — 캐릭터 진입은 프로필 허브의
 * 타일에서). 캐릭터 라우트 자체는 살아있음 (`href: null` 로 탭바에서만 숨김).
 *
 * 탭바 시각: docs/design/WhereHere_Manga.html → MangaTabBar 컴포넌트.
 *   - 종이 배경, 잉크 2.5px 상단 테두리
 *   - 활성: 노랑 pill + 빨강 라벨, translateY(-3) + hard shadow
 *   - 비활성: rgba(ink, .42)
 */
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <MangaTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="map"
        options={{
          title: '지도',
          freezeOnBlur: true,
          tabBarAccessibilityLabel: '지도 화면으로 이동',
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: '피드',
          freezeOnBlur: true,
          tabBarAccessibilityLabel: '커뮤니티 피드로 이동',
        }}
      />
      <Tabs.Screen
        name="social"
        options={{
          title: '소셜',
          tabBarAccessibilityLabel: '소셜 화면으로 이동',
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: '메시지',
          tabBarAccessibilityLabel: '메시지 화면으로 이동',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '프로필',
          tabBarAccessibilityLabel: '프로필 화면으로 이동',
        }}
      />

      {/* 5탭 구조 외 hidden 라우트들 — 라우팅으로만 진입 가능, 탭바 안 보임 */}
      <Tabs.Screen name="character" options={{ href: null }} />
      <Tabs.Screen name="quests" options={{ href: null }} />
      <Tabs.Screen name="inventory" options={{ href: null }} />
      <Tabs.Screen name="missions" options={{ href: null }} />
    </Tabs>
  );
}
