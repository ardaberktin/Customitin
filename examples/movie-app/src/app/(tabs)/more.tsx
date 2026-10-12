import { ScrollView } from 'react-native';
import { router } from 'expo-router';
import { ActionButton, useCustomization } from '@customitin/react-native';
export default function Screen() {
  const { profile } = useCustomization();
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 24, gap: 12 }}
    >
      {profile?.navigation
        .filter((p) => p.target === 'view' && p.placement === 'overflow')
        .map((p) => (
          <ActionButton
            key={p.id}
            label={p.label}
            onPress={() =>
              router.push({ pathname: '/saved', params: { id: p.id } })
            }
          />
        ))}
    </ScrollView>
  );
}
