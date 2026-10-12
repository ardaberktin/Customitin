import { SavedViewScreen } from '@customitin/examples';
import { useCustomization } from '@customitin/react-native';
export default function Screen() {
  const { profile } = useCustomization();
  const views =
    profile?.navigation.filter(
      (p) => p.target === 'view' && p.placement === 'tab',
    ) ?? [];
  return <SavedViewScreen id={views[1]?.id} />;
}
