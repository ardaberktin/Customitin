import type { useAssistant } from '@customitin/react';
import { en } from '../en';
import { Icon } from './Icon';
import { Dialog } from './Dialog';
type Assistant = ReturnType<typeof useAssistant>;
export function AssistantPanel({
  assistant,
  instruction,
  setInstruction,
  error,
  saving,
  onRequest,
  onClose,
  onUndo,
  onReset,
}: {
  assistant: Assistant;
  instruction: string;
  setInstruction: (value: string) => void;
  error: string;
  saving: boolean;
  onRequest: () => void;
  onClose: () => void;
  onUndo: () => void;
  onReset: () => void;
}) {
  const disabled = assistant.busy || assistant.loading || saving;
  return (
    <Dialog label={en.assistant} onClose={onClose}>
      <section className="assistant-sheet">
        <button className="close" aria-label={en.close} onClick={onClose}>
          <Icon name="close" />
        </button>
        <Icon name="spark" size={28} />
        <h2>{en.assistant}</h2>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onRequest();
          }}
        >
          <label htmlFor="instruction">{en.instruction}</label>
          <textarea
            id="instruction"
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
            placeholder={en.instructionPlaceholder}
            maxLength={2000}
            rows={7}
          />
          <button
            className="primary-button"
            disabled={disabled || !instruction.trim()}
            type="submit"
          >
            {assistant.busy ? en.planning : en.prepare}
          </button>
        </form>
        {assistant.busy && (
          <button className="text-button" onClick={assistant.cancel}>
            {en.cancel}
          </button>
        )}
        {assistant.preview && (
          <button className="primary-button" onClick={onClose}>
            {en.preview}
          </button>
        )}
        {(error || assistant.message) && (
          <p role="status" className="assistant-message">
            {error || assistant.message}
          </p>
        )}
        <div className="assistant-actions">
          <button disabled={disabled || !assistant.canUndo} onClick={onUndo}>
            {en.undo}
          </button>
          <button disabled={disabled} onClick={onReset}>
            {en.reset}
          </button>
        </div>
      </section>
    </Dialog>
  );
}
