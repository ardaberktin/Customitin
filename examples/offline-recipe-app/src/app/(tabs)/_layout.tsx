import { Tabs } from 'expo-router';
import { useCustomization, usePersonalTheme } from '@customitin/react-native';
export default function TabLayout() {
  const { profile } = useCustomization();
  const theme = usePersonalTheme();
  const views =
    profile?.navigation.filter(
      (p) => p.target === 'view' && p.placement === 'tab',
    ) ?? [];
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.muted,
        tabBarStyle: {
          backgroundColor: theme.paper,
          borderTopColor: theme.border,
        },
        tabBarIcon: () => null,
        tabBarIconStyle: { display: 'none' },
        tabBarItemStyle: { justifyContent: 'center' },
        tabBarLabelStyle: { fontSize: 13, paddingBottom: 0 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'My space' }} />
      <Tabs.Screen name="customize" options={{ title: 'Customize' }} />
      <Tabs.Screen
        name="personal-1"
        options={{
          title: views[0]?.label ?? 'Collection',
          href: views[0] ? '/personal-1' : null,
        }}
      />
      <Tabs.Screen
        name="personal-2"
        options={{
          title: views[1]?.label ?? 'Collection',
          href: views[1] ? '/personal-2' : null,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          href: profile?.navigation.some((p) => p.placement === 'overflow')
            ? '/more'
            : null,
        }}
      />
    </Tabs>
  );
}
