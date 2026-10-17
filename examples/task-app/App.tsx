import { en as workspaceStrings } from '@customitin/examples/headless';
import { NativeWorkspace } from '@customitin/examples/headless/native';
import { useCallback } from 'react';
import {
  createNavigationContainerRef,
  NavigationContainer,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ScrollView } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useCustomization } from '@customitin/react-native';
import { ActionButton, usePersonalTheme } from '@customitin/examples/ui';
import {
  CustomizeScreen,
  DemoProvider,
  DetailScreen,
  HomeScreen,
  SavedViewScreen,
} from '@customitin/examples';
import type { Scalar } from '@customitin/core';
type Routes = {
  Main: undefined;
  Detail: { id: string };
  Saved: { id: string };
};
const navigation = createNavigationContainerRef<Routes>();
const Stack = createNativeStackNavigator<Routes>();
const Tabs = createBottomTabNavigator();
function MainTabs() {
  const { profile, registry } = useCustomization();
  const theme = usePersonalTheme();
  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent,
        tabBarStyle: { backgroundColor: theme.paper },
        tabBarIcon: () => null,
        tabBarIconStyle: { display: 'none' },
      }}
    >
      {(profile?.navigation.filter((p) => p.placement === 'tab') ?? []).map(
        (p) => (
          <Tabs.Screen
            key={`${p.target}-${p.id}`}
            name={`${p.target}-${p.id}`}
            options={{ title: p.label }}
          >
            {() =>
              p.target === 'view' ? (
                <SavedViewScreen id={p.id} />
              ) : p.id === 'customize' ? (
                <CustomizeScreen kind="task" />
              ) : (
                <HomeScreen />
              )
            }
          </Tabs.Screen>
        ),
      )}
      {!profile ? (
        <Tabs.Screen
          name="destination-home"
          component={HomeScreen}
          options={{ title: registry.defaultNavigation[0]?.label }}
        />
      ) : null}
      <Tabs.Screen
        name="Workspace"
        options={{ title: workspaceStrings.tab }}
        component={NativeWorkspace}
      />
      {profile?.navigation.some((p) => p.placement === 'overflow') ? (
        <Tabs.Screen name="More">
          {() => (
            <ScrollView
              contentInsetAdjustmentBehavior="automatic"
              contentContainerStyle={{ padding: 24, gap: 12 }}
            >
              {profile.navigation
                .filter(
                  (p) => p.target === 'view' && p.placement === 'overflow',
                )
                .map((p) => (
                  <ActionButton
                    key={p.id}
                    label={p.label}
                    onPress={() => navigation.navigate('Saved', { id: p.id })}
                  />
                ))}
            </ScrollView>
          )}
        </Tabs.Screen>
      ) : null}
    </Tabs.Navigator>
  );
}
export default function App() {
  const navigate = useCallback((id: string, params: Record<string, Scalar>) => {
    if (
      navigation.isReady() &&
      id === 'detail' &&
      typeof params.id === 'string'
    )
      navigation.navigate('Detail', { id: params.id });
  }, []);
  return (
    <SafeAreaProvider>
      <DemoProvider kind="task" navigate={navigate}>
        <NavigationContainer ref={navigation}>
          <Stack.Navigator>
            <Stack.Screen
              name="Main"
              component={MainTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen name="Detail" options={{ title: 'Task details' }}>
              {({ route }) => <DetailScreen kind="task" id={route.params.id} />}
            </Stack.Screen>
            <Stack.Screen name="Saved" options={{ title: 'Your collection' }}>
              {({ route }) => <SavedViewScreen id={route.params.id} />}
            </Stack.Screen>
          </Stack.Navigator>
        </NavigationContainer>
      </DemoProvider>
    </SafeAreaProvider>
  );
}
