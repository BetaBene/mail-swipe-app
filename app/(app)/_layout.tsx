import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors } from '../../lib/theme';

function TabIcon({ symbol, focused }: { symbol: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{symbol}</Text>
  );
}

export default function AppTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="swipe"
        options={{ title: 'Wischen', tabBarIcon: ({ focused }) => <TabIcon symbol="✉️" focused={focused} /> }}
      />
      <Tabs.Screen
        name="stats"
        options={{ title: 'Statistik', tabBarIcon: ({ focused }) => <TabIcon symbol="📊" focused={focused} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Einstellungen', tabBarIcon: ({ focused }) => <TabIcon symbol="⚙️" focused={focused} /> }}
      />
    </Tabs>
  );
}
