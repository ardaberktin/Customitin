import { ScrollView, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CustomizationProvider,
  SurfaceRenderer,
} from '@customitin/react-native';
import { workspaceRegistry } from './registry';
import { workspaceData } from './data';
import { workspacePlanner } from './planner';
import { useWorkspaceControls } from './controls';
import { en } from './strings';
import { HostChart, HostTable, Button } from './native-components';
const bindings = {
  ...workspaceData(),
  components: { chart: HostChart, table: HostTable },
};
const status = (state: { code: string }) => (
  <Text>{en.status[state.code] ?? en.fallback}</Text>
);
export function NativeWorkspace() {
  return (
    <CustomizationProvider
      options={{
        registry: workspaceRegistry,
        storage: AsyncStorage,
        scope: 'local-device',
        planner: workspacePlanner,
      }}
      bindings={bindings}
    >
      <Workspace />
    </CustomizationProvider>
  );
}
function Workspace() {
  const {
    assistant,
    action,
    instruction,
    setInstruction,
    error,
    saving,
    prepare,
    apply,
    undo,
    reset,
    execute,
  } = useWorkspaceControls();
  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 18 }}>
      <Text style={{ fontSize: 28, fontWeight: '700' }}>{en.nativeTitle}</Text>
      <Text>{en.demo}</Text>
      <HostChart
        values={{ title: en.existing }}
        data={{
          series: {
            rows: [
              { label: 'Design', value: 12 },
              { label: 'Engineering', value: 24 },
            ],
            keys: ['a', 'b'],
            complete: true,
            nextCursor: null,
          },
        }}
      />
      <TextInput
        accessibilityLabel={en.instruction}
        value={instruction}
        onChangeText={setInstruction}
        style={{
          padding: 14,
          borderWidth: 1,
          borderColor: '#8a9b94',
          borderRadius: 12,
        }}
      />
      <Button
        label={en.prepare}
        disabled={assistant.loading || assistant.busy || saving}
        onPress={prepare}
      />
      {assistant.busy ? (
        <Button label={en.cancelPlanning} onPress={assistant.cancel} />
      ) : null}
      {assistant.message || error ? (
        <Text accessibilityRole="alert">{error || assistant.message}</Text>
      ) : null}
      {assistant.preview ? (
        <View style={{ gap: 12 }}>
          <Text>{en.preview}</Text>
          <SurfaceRenderer id="workspace" preview status={status} />
          <Button label={en.apply} disabled={saving} onPress={apply} />
          <Button label={en.discard} onPress={assistant.cancel} />
        </View>
      ) : null}
      {action.status === 'proposed' ? (
        <View style={{ gap: 12 }}>
          <Text>{action.proposal?.summary}</Text>
          <Text>{en.mutationNotice}</Text>
          <Button label={en.confirm} disabled={saving} onPress={execute} />
          <Button label={en.cancelAction} onPress={action.cancel} />
        </View>
      ) : null}
      {action.status !== 'idle' ? (
        <Text>{en.actionStatus[action.status]}</Text>
      ) : null}
      <Text style={{ fontSize: 22 }}>{en.surface}</Text>
      <SurfaceRenderer id="workspace" status={status} />
      <Button
        label={en.undo}
        disabled={!assistant.canUndo || saving}
        onPress={undo}
      />
      <Button
        label={en.reset}
        disabled={assistant.loading || saving}
        onPress={reset}
      />
    </ScrollView>
  );
}
