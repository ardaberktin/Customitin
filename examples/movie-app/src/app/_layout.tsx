import { useCallback } from 'react';
import { Stack, router } from 'expo-router';
import { DemoProvider } from '@customitin/examples';
import type { Scalar } from '@customitin/core';
export default function RootLayout() {
  const navigate = useCallback((id: string, params: Record<string, Scalar>) => {
    if (id === 'detail' && typeof params.id === 'string')
      router.push({ pathname: '/detail', params: { id: params.id } });
    else if (id === 'customize') router.push('/customize');
    else router.push('/');
  }, []);
  return (
    <DemoProvider kind="movie" navigate={navigate}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#F6F5EF' },
          headerTintColor: '#245C46',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="detail" options={{ title: 'Details' }} />
        <Stack.Screen name="saved" options={{ title: 'Your collection' }} />
      </Stack>
    </DemoProvider>
  );
}
