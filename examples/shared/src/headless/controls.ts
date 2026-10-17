import { useState } from 'react';
import { useAction, useAssistant } from '@customitin/react';
import { en } from './strings';

/** Host-owned interaction and error presentation; applications can build different controls. */
export function useWorkspaceControls() {
  const assistant = useAssistant(['workspace']);
  const action = useAction('workspace');
  const [instruction, setInstruction] = useState<string>(en.hoursPrompt);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const perform = (work: () => Promise<void>) => {
    setError('');
    setSaving(true);
    void work()
      .catch(() => setError(en.saveError))
      .finally(() => setSaving(false));
  };
  return {
    assistant,
    action,
    instruction,
    setInstruction,
    error,
    saving,
    prepare: () => perform(() => assistant.request(instruction)),
    apply: () => perform(assistant.apply),
    undo: () => perform(assistant.undo),
    reset: () => perform(assistant.reset),
    // Clicking the host's explicit confirmation control is the confirmation decision.
    execute: () => perform(() => action.execute(async () => true)),
  };
}
