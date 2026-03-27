import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, Platform } from 'react-native';
import { useTheme } from '../../src/providers/ThemeProvider';
import { BRAND, SHADOWS } from '../../src/config/theme';

export default function TabsLayout() {
  const { colors, isDark } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: BRAND.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: colors.tabBar,
            borderTopColor: colors.tabBarBorder,
          },
        ],
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
        animation: 'shift',
      }}
    >
      <Tabs.Screen
        name="quests"
        options={{
          title: '탐험',
          tabBarAccessibilityLabel: '탐험 화면으로 이동',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'compass' : 'compass-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: '지도',
          tabBarAccessibilityLabel: '지도 화면으로 이동',
          tabBarIcon: ({ color, focused }) => (
            <View
              style={[
                styles.centerIcon,
                { backgroundColor: focused ? BRAND.primary : colors.surfaceLight },
                focused && styles.centerIconActive,
              ]}
              accessibilityRole="button"
            >
              <Ionicons
                name={focused ? 'map' : 'map-outline'}
                size={28}
                color={focused ? '#FFFFFF' : color}
              />
            </View>
          ),
          tabBarLabel: () => null,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: '가방',
          tabBarAccessibilityLabel: '가방 화면으로 이동',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'bag-handle' : 'bag-handle-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '프로필',
          tabBarAccessibilityLabel: '프로필 화면으로 이동',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="explore" options={{ href: null }} />
      <Tabs.Screen name="missions" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 88 : 68,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
    paddingTop: 6,
    ...SHADOWS.sm,
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  tabBarItem: {
    paddingTop: 2,
  },
  centerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  centerIconActive: {
    borderColor: BRAND.primaryLight + '40',
    ...SHADOWS.glow,
  },
});
