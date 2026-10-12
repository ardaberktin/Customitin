import { ScrollView, Text } from 'react-native';
import { useCustomization } from '../provider/context';
import { Collection } from '../renderer/collection';
import { CustomizableSurface } from '../renderer/surface';
import { usePersonalTheme } from '../renderer/theme';
import { PersonalizationScreen } from './composer';
import { ActionButton } from './button';

export function HostContent({
  screen,
  select,
}: {
  screen: string;
  select: (screen: string) => void;
}) {
  const { profile } = useCustomization();
  const theme = usePersonalTheme();
  const view = profile?.views.find((v) => `view:${v.id}` === screen);
  if (screen === 'customize') return <PersonalizationScreen />;
  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
      {view ? (
        <>
          <Text
            accessibilityRole="header"
            style={{ color: theme.ink, fontSize: 23 * theme.scale }}
          >
            {view.title}
          </Text>
          <Collection key={`${profile?.scope}:${view.id}`} view={view} />
        </>
      ) : (
        <CustomizableSurface id="home" />
      )}
      {profile?.navigation
        .filter((p) => p.target === 'view')
        .map((p) => (
          <ActionButton
            key={p.id}
            label={p.label}
            onPress={() => select(`view:${p.id}`)}
            secondary
          />
        ))}
    </ScrollView>
  );
}
