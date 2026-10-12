import { useState, type ReactNode } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { useCustomization } from '../provider/context';
import { PreviewPanel } from './preview-panel';
import { usePersonalTheme } from '../renderer/theme';
import { ActionButton } from './button';
import { en } from './strings';

export function PersonalizationScreen({
  examples = [],
  previewSurface = 'home',
  header,
}: {
  examples?: string[];
  previewSurface?: string;
  header?: ReactNode;
}) {
  const {
    runtime,
    profile,
    preview,
    proposal,
    busy,
    message,
    warnings,
    canUndo,
    registry,
  } = useCustomization();
  const theme = usePersonalTheme();
  const [instruction, setInstruction] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  async function perform(action: () => Promise<void>) {
    setError('');
    setSaving(true);
    try {
      await action();
    } catch {
      setError('Your change could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  }
  function manual(tokens: Record<string, string | number>) {
    setError('');
    try {
      runtime.previewOperations(
        [{ op: 'setThemeTokens', tokens }],
        'Update your reading preferences.',
      );
    } catch {
      setError('This preference is unavailable in this app.');
    }
  }
  const inputStyle = {
    color: theme.ink,
    backgroundColor: theme.card,
    borderColor: theme.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    fontSize: 16 * theme.scale,
  };
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      style={{ backgroundColor: theme.paper }}
      contentContainerStyle={{
        padding: 24,
        gap: 24,
        maxWidth: 850,
        width: '100%',
        alignSelf: 'center',
        paddingBottom: 60,
      }}
    >
      {header}
      <View style={{ gap: 10 }}>
        <Text
          style={{
            color: theme.accent,
            letterSpacing: 3,
            fontSize: 11,
            fontWeight: '700',
          }}
        >
          YOUR SPACE / CUSTOMITIN
        </Text>
        <Text
          accessibilityRole="header"
          style={{
            color: theme.ink,
            fontSize: 38 * theme.scale,
            fontWeight: '600',
          }}
        >
          {en.title}
        </Text>
        <Text
          style={{
            color: theme.muted,
            fontSize: 16 * theme.scale,
            lineHeight: 25,
          }}
        >
          {en.subtitle}
        </Text>
      </View>
      {profile ? (
        <Text style={{ color: theme.muted }}>
          {profile.name} · {en.saved}
        </Text>
      ) : (
        <ActionButton label={en.retry} onPress={() => void runtime.start()} />
      )}
      <View style={{ gap: 14 }}>
        <Text style={{ color: theme.ink, fontWeight: '600', fontSize: 16 }}>
          {en.prompt}
        </Text>
        <TextInput
          accessibilityLabel={en.prompt}
          testID="customization-prompt"
          multiline
          value={instruction}
          onChangeText={setInstruction}
          placeholder={en.placeholder}
          placeholderTextColor={theme.muted}
          maxLength={2000}
          style={{ ...inputStyle, minHeight: 110, textAlignVertical: 'top' }}
        />
        <ActionButton
          testID="preview-button"
          label={busy ? en.preparing : en.prepare}
          disabled={!instruction.trim() || busy || !profile}
          onPress={() => void runtime.request(instruction)}
        />
        {examples.map((example) => (
          <ActionButton
            key={example}
            label={example}
            onPress={() => {
              setInstruction(example);
              void runtime.request(example);
            }}
            secondary
            disabled={busy || !profile}
          />
        ))}
      </View>
      {message || error ? (
        <Text accessibilityRole="alert" style={{ color: theme.error }}>
          {error || message}
        </Text>
      ) : null}
      {warnings.map((warning, index) => (
        <Text
          key={index}
          accessibilityRole="alert"
          style={{ color: theme.muted }}
        >
          {warning}
        </Text>
      ))}
      {preview && proposal ? (
        <PreviewPanel
          profile={preview}
          proposal={proposal}
          surface={previewSurface}
          saving={saving}
          apply={() => void perform(() => runtime.apply())}
          cancel={() => runtime.cancelPreview()}
        />
      ) : null}
      <View style={{ gap: 12 }}>
        <Text
          accessibilityRole="header"
          style={{ color: theme.ink, fontSize: 22, fontWeight: '600' }}
        >
          {en.manual}
        </Text>
        {registry.themeTokens['appearance.mode'] ? (
          <ActionButton
            label={`${en.theme}: ${profile?.theme['appearance.mode'] === 'dark' ? 'Light' : 'Dark'}`}
            onPress={() =>
              manual({
                'appearance.mode':
                  profile?.theme['appearance.mode'] === 'dark'
                    ? 'light'
                    : 'dark',
              })
            }
            secondary
            disabled={!profile}
          />
        ) : null}
        {registry.themeTokens['type.scale'] ? (
          <ActionButton
            label={en.text}
            onPress={() => manual({ 'type.scale': 1.2 })}
            secondary
            disabled={!profile}
          />
        ) : null}
        {registry.themeTokens['layout.density'] ? (
          <ActionButton
            label={en.compact}
            onPress={() => manual({ 'layout.density': 'compact' })}
            secondary
            disabled={!profile}
          />
        ) : null}
        <Text style={{ color: theme.muted, fontSize: 13 }}>{en.offline}</Text>
      </View>
      <View style={{ gap: 12 }}>
        <Text
          accessibilityRole="header"
          style={{ color: theme.ink, fontSize: 22, fontWeight: '600' }}
        >
          {en.savedViews}
        </Text>
        {profile?.views.length ? (
          profile.views.map((view) => (
            <Text key={view.id} style={{ color: theme.ink }}>
              {view.title} · {view.presentation.mode}
            </Text>
          ))
        ) : (
          <Text style={{ color: theme.muted }}>{en.emptyViews}</Text>
        )}
      </View>
      <TextInput
        accessibilityLabel={en.name}
        value={name}
        onChangeText={setName}
        placeholder={profile?.name ?? en.name}
        placeholderTextColor={theme.muted}
        maxLength={80}
        style={inputStyle}
      />
      <ActionButton
        label={en.rename}
        disabled={!name.trim() || saving || !profile}
        onPress={() => void perform(() => runtime.rename(name))}
        secondary
      />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <ActionButton
          label={en.undo}
          testID="undo-button"
          disabled={!canUndo || saving}
          onPress={() => void perform(() => runtime.undo())}
          secondary
        />
        <ActionButton
          label={en.reset}
          disabled={!profile || saving}
          onPress={() => void perform(() => runtime.reset())}
          secondary
        />
      </View>
      <Text style={{ color: theme.muted, lineHeight: 20, fontSize: 12 }}>
        {en.privacy}
      </Text>
    </ScrollView>
  );
}
