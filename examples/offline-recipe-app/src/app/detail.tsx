import { useLocalSearchParams } from 'expo-router';
import { DetailScreen } from '@customitin/examples';
export default function Screen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <DetailScreen kind="recipe" id={typeof id === 'string' ? id : undefined} />
  );
}
