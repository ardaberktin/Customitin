import { useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import {
  CustomizationProvider,
  type RuntimeBindings,
} from '../provider/context';
import type { RuntimeOptions } from '../provider/runtime';
import { HostContent } from './host-content';
import { ActionButton } from './button';
import { en } from './strings';
import { usePersonalTheme } from '../renderer/theme';

export interface HostInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}
const zeroInsets: HostInsets = { top: 0, bottom: 0, left: 0, right: 0 };

function Screens({
  children,
  screen,
  select,
  insets,
}: {
  children: ReactNode;
  screen: string;
  select: (screen: string) => void;
  insets: HostInsets;
}) {
  const theme = usePersonalTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.paper }}>
      <View
        accessibilityElementsHidden={screen !== 'original'}
        importantForAccessibility={
          screen === 'original' ? 'auto' : 'no-hide-descendants'
        }
        style={{ flex: 1, display: screen === 'original' ? 'flex' : 'none' }}
      >
        {children}
      </View>
      {screen !== 'original' ? (
        <View
          style={{
            flex: 1,
            paddingTop: insets.top,
            paddingLeft: insets.left,
            paddingRight: insets.right,
          }}
        >
          <HostContent screen={screen} select={select} />
        </View>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8,
          paddingTop: 12,
          paddingBottom: 12 + insets.bottom,
          paddingLeft: 12 + insets.left,
          paddingRight: 12 + insets.right,
        }}
      >
        <ActionButton
          label={en.originalApp}
          onPress={() => select('original')}
          secondary
        />
        <ActionButton
          label={en.mySpace}
          onPress={() => select('personal')}
          secondary
        />
        <ActionButton
          label={en.customize}
          onPress={() => select('customize')}
        />
      </View>
    </View>
  );
}
/** Keeps the host navigator mounted while users preview their personal space. */
export function PersonalizationHost({
  options,
  bindings,
  children,
  insets = zeroInsets,
}: {
  options: RuntimeOptions;
  bindings: RuntimeBindings;
  children: ReactNode;
  insets?: HostInsets;
}) {
  const [screen, select] = useState('original');
  const connected = useMemo<RuntimeBindings>(
    () => ({
      ...bindings,
      navigate(id, params) {
        select('original');
        if (id !== 'original') bindings.navigate?.(id, params);
      },
    }),
    [bindings],
  );
  return (
    <CustomizationProvider options={options} bindings={connected}>
      <Screens screen={screen} select={select} insets={insets}>
        {children}
      </Screens>
    </CustomizationProvider>
  );
}
