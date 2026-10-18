import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useAssistant, useCustomization } from '@customitin/react';
import { Control } from './controls';
import { Existing } from './existing';
import { Workspace } from './workspace';
import { en } from './en';
import { styles } from './styles';
function Pilot() {
  const [existing, setExisting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const { registry } = useCustomization();
  const id = registry.surfaces.find((surface) => surface.kind === 'screen')!.id;
  const assistant = useAssistant(existing ? [id] : ['workspace', 'heading']);
  const disabled = saving || assistant.loading || assistant.busy;
  async function run(task: () => void | Promise<void>) {
    setError(false);
    setSaving(true);
    try {
      await task();
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }
  return (
    <KeyboardAvoidingView
      style={styles.safe}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" />
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          <View>
            <Text style={styles.title}>{en.title}</Text>
            <Text style={styles.subtitle}>{en.subtitle}</Text>
          </View>
          <View style={styles.row}>
            <Control
              title={en.workspace}
              primary={!existing}
              disabled={disabled || !!assistant.preview}
              onPress={() => setExisting(false)}
            />
            <Control
              title={en.existing}
              primary={existing}
              disabled={disabled || !!assistant.preview}
              onPress={() => setExisting(true)}
            />
          </View>
          {existing ? (
            <Existing id={id} run={run} disabled={disabled} />
          ) : (
            <Workspace run={run} disabled={disabled} />
          )}
        </ScrollView>
        <View style={styles.footer}>
          <Text accessibilityLiveRegion="polite" style={styles.body}>
            {error || assistant.code
              ? en.failed
              : assistant.preview
                ? en.preview
                : en.saved}
          </Text>
          <View style={styles.row}>
            {assistant.preview && (
              <>
                <Control
                  title={en.apply}
                  primary
                  disabled={disabled}
                  onPress={() => run(assistant.apply)}
                />
                <Control
                  title={en.discard}
                  disabled={disabled}
                  onPress={assistant.cancel}
                />
              </>
            )}
            <Control
              title={en.undo}
              disabled={disabled || !!assistant.preview || !assistant.canUndo}
              onPress={() => run(assistant.undo)}
            />
          </View>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <Pilot />
    </SafeAreaProvider>
  );
}
