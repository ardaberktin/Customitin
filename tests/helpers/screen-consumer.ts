export const screenConsumer = {
  'App.tsx': `import { createContext } from 'react';
import { Home } from './Home';
export const Session = createContext('missing');
export default function App() {
  return <Session.Provider value="signed-in"><Home label="Your account" /></Session.Provider>;
}`,
  'Home.tsx': `import { useContext, useState } from 'react';
import { ScrollView, View, Text, Pressable, TextInput } from 'react-native';
import { Session } from './App';
function Notes() {
  const [note, setNote] = useState('');
  return <TextInput accessibilityLabel="Trip note" value={note} onChangeText={setNote} />;
}
export function Home({ label }: { label: string }) {
  const session = useContext(Session);
  const [count, setCount] = useState(0);
  return <ScrollView testID="existing-screen" contentContainerStyle={{ gap: 20 }}>
    <Text key="heading" testID="existing-heading" style={{ fontSize: 20 }}>{label}: {session}</Text>
    <View key="notes"><Notes /></View>
    <Pressable key="action" accessibilityRole="button" onPress={() => setCount(count + 1)}><Text>Existing action {count}</Text></Pressable>
  </ScrollView>;
}`,
};

// Explicitly developer-owned controls: the installer never creates this file or UI.
export const hostControls = `import { useState } from 'react';
import { View, Pressable, Text } from 'react-native';
import { useCustomization } from '@customitin/react';
export function HostControls() {
  const [editing, setEditing] = useState(false);
  const { registry, runtime, profile, preview, loading, canUndo } = useCustomization();
  const surface = registry.surfaces.find(item => item.kind === 'screen');
  if (!surface) return null;
  const nodes = preview?.surfaces[surface.id] ?? profile?.surfaces[surface.id] ?? surface.defaultLayout;
  const button = (label: string, action: () => void, disabled = false) => <Pressable key={label} accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={action}><Text>{label}</Text></Pressable>;
  const change = (next: typeof nodes) => runtime.previewOperations([{op:'setSurfaceLayout', surfaceId:surface.id,nodes:next}], 'Change layout', surface.id);
  return <View>{button(editing ? 'Done customizing' : 'Customize this screen', () => { runtime.cancelPreview(); setEditing(!editing); }, loading || !profile)}
    {editing ? <View>{surface.defaultLayout.map(node => {
      const label = registry.components.find(item => item.id === node.componentId)?.title ?? node.id;
      const index = nodes.findIndex(item => item.id === node.id);
      return <View key={node.id}>{button(index >= 0 ? 'Hide '+label : 'Show '+label, () => change(index >= 0 ? nodes.filter(item => item.id !== node.id) : [...nodes,node]), surface.requiredNodeIds.includes(node.id))}
      {button('Move up: '+label, () => { const next=[...nodes]; if(index>0) { [next[index-1],next[index]]=[next[index]!,next[index-1]!]; change(next); } }, index <= 0)}</View>;
    })}{preview ? <View>{button('Apply changes', () => { void runtime.apply(); })}{button('Discard preview', () => runtime.cancelPreview())}</View> : null}
    {button('Undo last change', () => { void runtime.undo(); }, !canUndo)}{button('Restore this screen', () => change(surface.defaultLayout))}</View> : null}
  </View>;
}`;
export const controlledScreenConsumer = {
  ...screenConsumer,
  'Controls.tsx': hostControls,
  'App.tsx': screenConsumer['App.tsx']
    .replace(
      'import { Home }',
      "import { HostControls } from './Controls';\nimport { Home }",
    )
    .replace('<Home label=', '<HostControls /><Home label='),
};
