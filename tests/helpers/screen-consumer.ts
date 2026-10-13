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
