import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import type { LayoutNode, Scalar } from '@customitin/core';
import { useCustomization, useRenderedProfile } from '@customitin/react';
import { ActionButton } from '../composer/button';
import { en } from '../composer/strings';
import { usePersonalTheme } from '../renderer/theme';
import { SectionControls, type ScreenSurface } from './section-controls';

export function ScreenEditor({ surface }: { surface: ScreenSurface }) {
  const {
    runtime,
    registry,
    preview,
    previewSurfaceId,
    busy,
    message,
    canUndo,
  } = useCustomization();
  const profile = useRenderedProfile();
  const theme = usePersonalTheme();
  const [instruction, setInstruction] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const disabled = saving || busy;
  const nodes = profile?.surfaces[surface.id] ?? surface.defaultLayout;
  function change(next: LayoutNode[], tokens: Record<string, Scalar> = {}) {
    try {
      runtime.previewOperations(
        [
          { op: 'setSurfaceLayout', surfaceId: surface.id, nodes: next },
          { op: 'setThemeTokens', tokens: { ...profile?.theme, ...tokens } },
        ],
        en.screenChanges,
        surface.id,
      );
      setError('');
    } catch {
      setError(en.saveError);
    }
  }
  async function save(action: () => Promise<void>) {
    setSaving(true);
    setError('');
    try {
      await action();
    } catch {
      setError(en.saveError);
    } finally {
      setSaving(false);
    }
  }
  return (
    <View style={{ padding: 16, gap: 12, backgroundColor: theme.paper }}>
      <Text accessibilityRole="header" style={{ color: theme.ink }}>
        {surface.title}
      </Text>
      <SectionControls
        surface={surface}
        nodes={nodes}
        registry={registry}
        disabled={disabled}
        change={change}
      />
      {registry.themeTokens['type.scale'] ? (
        <ActionButton
          label={
            profile?.theme['type.scale'] === 1.2 ? en.standardText : en.text
          }
          disabled={disabled}
          onPress={() =>
            change(nodes, {
              'type.scale': profile?.theme['type.scale'] === 1.2 ? 1 : 1.2,
            })
          }
          secondary
        />
      ) : null}
      {registry.themeTokens['layout.density'] ? (
        <ActionButton
          label={
            profile?.theme['layout.density'] === 'compact'
              ? en.comfortable
              : en.compact
          }
          disabled={disabled}
          onPress={() =>
            change(nodes, {
              'layout.density':
                profile?.theme['layout.density'] === 'compact'
                  ? 'comfortable'
                  : 'compact',
            })
          }
          secondary
        />
      ) : null}
      <Text style={{ color: theme.muted }}>{en.screenAppearance}</Text>
      <TextInput
        accessibilityLabel={en.prompt}
        value={instruction}
        onChangeText={setInstruction}
        maxLength={2000}
        placeholder={en.placeholder}
        placeholderTextColor={theme.muted}
        style={{
          color: theme.ink,
          borderColor: theme.border,
          borderWidth: 1,
          padding: 12,
        }}
      />
      <ActionButton
        label={busy ? en.preparing : en.prepare}
        disabled={disabled || !instruction.trim()}
        onPress={() => void runtime.request(instruction, surface.id)}
      />
      {message || error ? (
        <Text accessibilityRole="alert" style={{ color: theme.error }}>
          {error || message}
        </Text>
      ) : null}
      {preview && previewSurfaceId === surface.id ? (
        <>
          <Text style={{ color: theme.ink }}>{en.screenPreview}</Text>
          <ActionButton
            label={en.applyScreen}
            disabled={disabled}
            onPress={() => void save(() => runtime.apply())}
          />
          <ActionButton
            label={en.cancel}
            disabled={disabled}
            onPress={() => runtime.cancelPreview()}
            secondary
          />
        </>
      ) : null}
      <ActionButton
        label={en.undo}
        disabled={disabled || !canUndo}
        onPress={() => void save(() => runtime.undo())}
        secondary
      />
      <ActionButton
        label={en.restoreScreen}
        disabled={disabled}
        onPress={() => change(surface.defaultLayout)}
        secondary
      />
    </View>
  );
}
