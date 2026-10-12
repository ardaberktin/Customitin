import { Text, View } from 'react-native';
import type { Profile, Proposal } from '@customitin/core';
import { ProfilePreview } from '../provider/context';
import { CustomizableSurface } from '../renderer/surface';
import { usePersonalTheme } from '../renderer/theme';
import { ActionButton } from './button';
import { en } from './strings';
export function PreviewPanel({
  profile,
  proposal,
  surface,
  saving,
  apply,
  cancel,
}: {
  profile: Profile;
  proposal: Proposal;
  surface: string;
  saving: boolean;
  apply: () => void;
  cancel: () => void;
}) {
  const theme = usePersonalTheme();
  return (
    <View
      testID="preview-panel"
      style={{
        borderWidth: 1,
        borderColor: theme.accent,
        borderRadius: 20,
        padding: 20,
        gap: 18,
      }}
    >
      <Text
        accessibilityRole="header"
        style={{ color: theme.ink, fontSize: 22, fontWeight: '600' }}
      >
        {en.preview}
      </Text>
      <Text style={{ color: theme.muted }}>{proposal.summary}</Text>
      <ProfilePreview profile={profile}>
        <View style={{ gap: 16 }}>
          <CustomizableSurface id={surface} />
          <Text style={{ color: theme.muted }}>
            Navigation: {profile.navigation.map((p) => p.label).join(' · ')}
          </Text>
        </View>
      </ProfilePreview>
      <ActionButton
        testID="apply-button"
        label={en.apply}
        disabled={saving}
        onPress={apply}
      />
      <ActionButton label={en.cancel} onPress={cancel} secondary />
    </View>
  );
}
