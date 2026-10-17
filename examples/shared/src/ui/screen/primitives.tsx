import { forwardRef } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ScrollViewProps,
  type TextProps,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { useRenderedProfile } from '@customitin/react';

function useSpacing(style: ViewProps['style']) {
  const profile = useRenderedProfile();
  const original = StyleSheet.flatten(style);
  const spacing: ViewStyle = {};
  if (profile?.theme['layout.density'] === 'compact') {
    for (const key of ['gap', 'rowGap', 'columnGap'] as const) {
      const value = original?.[key];
      if (typeof value === 'number') spacing[key] = value * 0.65;
    }
  }
  return [style, spacing];
}

/** Original styles win until the user explicitly selects a supported preference. */
export const ScreenView = forwardRef<View, ViewProps>(
  function ScreenView(props, ref) {
    const style = useSpacing(props.style);
    return <View {...props} ref={ref} style={style} />;
  },
);

export const ScreenScrollView = forwardRef<ScrollView, ScrollViewProps>(
  function ScreenScrollView(props, ref) {
    const style = useSpacing(props.style);
    const contentContainerStyle = useSpacing(props.contentContainerStyle);
    return (
      <ScrollView
        {...props}
        ref={ref}
        style={style}
        contentContainerStyle={contentContainerStyle}
      />
    );
  },
);

export const ScreenText = forwardRef<Text, TextProps>(
  function ScreenText(props, ref) {
    const profile = useRenderedProfile();
    const scale = profile?.theme['type.scale'];
    const original = StyleSheet.flatten(props.style);
    const scaled =
      typeof scale === 'number'
        ? {
            ...(typeof original?.fontSize === 'number'
              ? { fontSize: original.fontSize * scale }
              : {}),
            ...(typeof original?.lineHeight === 'number'
              ? { lineHeight: original.lineHeight * scale }
              : {}),
          }
        : {};
    return <Text {...props} ref={ref} style={[props.style, scaled]} />;
  },
);
