import { Pressable, Text } from 'react-native';
import { usePersonalTheme } from '../renderer/theme';
export function ActionButton({
  label,
  onPress,
  disabled = false,
  secondary = false,
  testID,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  testID?: string;
}) {
  const theme = usePersonalTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 48,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: secondary ? theme.wash : theme.accent,
        opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
      })}
    >
      <Text
        style={{
          color: secondary ? theme.ink : theme.paper,
          fontWeight: '600',
          fontSize: 14 * theme.scale,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
