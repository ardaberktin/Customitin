import { Pressable, Text } from 'react-native';
import { styles } from './styles';
export function Control({
  title,
  onPress,
  disabled = false,
  primary = false,
}: {
  title: string;
  onPress(): void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        primary && styles.primary,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.buttonText, primary && styles.primaryText]}>
        {title}
      </Text>
    </Pressable>
  );
}
