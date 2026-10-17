import { useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { ScrollView, Text, View } from 'react-native';
import { useCustomization } from '@customitin/react-native';
import {
  PersonalizationScreen,
  ActionButton,
  Collection,
  CustomizableSurface,
  usePersonalTheme,
} from '@customitin/examples/ui';
import { demoPrompts } from './demo-planner';
import { demoData, type DemoKind } from './data';
import { completeTask } from './sources';
export function HomeScreen() {
  const focused = useIsFocused();
  const theme = usePersonalTheme();
  const { loading, profile, message, runtime } = useCustomization();
  if (!focused) return null;
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: theme.paper }}
      contentContainerStyle={{
        padding: 24,
        paddingBottom: 50,
        maxWidth: 850,
        width: '100%',
        alignSelf: 'center',
      }}
    >
      {loading ? (
        <Text>Opening your space…</Text>
      ) : profile ? (
        <CustomizableSurface id="home" />
      ) : (
        <View>
          <Text>{message}</Text>
          <ActionButton label="Retry" onPress={() => void runtime.start()} />
        </View>
      )}
    </ScrollView>
  );
}
export function CustomizeScreen({ kind }: { kind: DemoKind }) {
  const focused = useIsFocused();
  if (!focused) return null;
  return (
    <PersonalizationScreen
      examples={demoPrompts[kind]}
      header={
        <Text style={{ color: '#68726A', fontSize: 12 }}>
          {process.env.EXPO_PUBLIC_PLANNER_URL
            ? 'Connected to your planner endpoint'
            : 'Demo assistant · no API key or network needed'}
        </Text>
      }
    />
  );
}
export function SavedViewScreen({ id }: { id?: string }) {
  const focused = useIsFocused();
  const { profile } = useCustomization();
  const theme = usePersonalTheme();
  const view = profile?.views.find((v) => v.id === id);
  if (!focused) return null;
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: theme.paper }}
      contentContainerStyle={{
        padding: 24,
        gap: 20,
        maxWidth: 850,
        width: '100%',
        alignSelf: 'center',
      }}
    >
      {view ? (
        <>
          <Text
            accessibilityRole="header"
            style={{ color: theme.ink, fontSize: 32 }}
          >
            {view.title}
          </Text>
          <Collection key={`${profile?.scope}:${id}`} view={view} />
        </>
      ) : (
        <Text style={{ color: theme.ink }}>
          This personal collection is no longer available.
        </Text>
      )}
    </ScrollView>
  );
}
export function DetailScreen({ kind, id }: { kind: DemoKind; id?: string }) {
  const theme = usePersonalTheme();
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const row = demoData[kind].find((item) => item.id === id);
  async function complete() {
    if (!id) return;
    setSaving(true);
    try {
      await completeTask(id);
      setMessage('Completed. Your collections are up to date.');
    } catch {
      setMessage('Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  }
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: theme.paper }}
      contentContainerStyle={{
        padding: 28,
        gap: 22,
        maxWidth: 850,
        width: '100%',
        alignSelf: 'center',
      }}
    >
      {row ? (
        <>
          <Text
            accessibilityRole="header"
            style={{ color: theme.ink, fontSize: 36 * theme.scale }}
          >
            {String(row.title)}
          </Text>
          <Text style={{ color: theme.muted, fontSize: 18, lineHeight: 28 }}>
            {String(row.note)}
          </Text>
          {kind === 'recipe' ? (
            <View style={{ gap: 14 }}>
              <Text style={{ color: theme.ink, fontSize: 22 }}>
                In the kitchen
              </Text>
              <Text selectable style={{ color: theme.ink, fontSize: 17 }}>
                {String(row.ingredients)}
              </Text>
              <Text style={{ color: theme.muted }}>
                {String(row.minutes)} minutes · {String(row.category)}
              </Text>
            </View>
          ) : null}
          {kind === 'task' ? (
            <ActionButton
              label="Mark complete"
              disabled={saving}
              onPress={() => void complete()}
            />
          ) : null}
        </>
      ) : (
        <Text>This item is unavailable.</Text>
      )}
      {message ? (
        <Text accessibilityRole="alert" style={{ color: theme.ink }}>
          {message}
        </Text>
      ) : null}
    </ScrollView>
  );
}
