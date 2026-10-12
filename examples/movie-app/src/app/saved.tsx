import { useLocalSearchParams } from 'expo-router';
import { SavedViewScreen } from '@customitin/examples';
export default function Screen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SavedViewScreen id={typeof id === 'string' ? id : undefined} />;
}
