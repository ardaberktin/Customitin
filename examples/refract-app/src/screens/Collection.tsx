import { useState, type MouseEvent } from 'react';
import {
  SurfaceRenderer,
  useAssistant,
  type SurfaceStatus,
} from '@customitin/react';
import { en } from '../en';
import { Icon } from '../components/Icon';
import { AssistantPanel } from '../components/AssistantPanel';
const status = ({ code }: SurfaceStatus) => (
  <p role="status" className="surface-status">
    {code === 'DATA_LOADING' ? en.loading : en.unavailable}
  </p>
);
/** This screen owns only an empty SDK surface and assistant controls, never a collection layout. */
export function Collection() {
  const assistant = useAssistant(['collection']);
  const [open, setOpen] = useState(false);
  const [instruction, setInstruction] = useState<string>(en.initialPrompt);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const openAssistant = (event: MouseEvent<HTMLButtonElement>) => {
    event.currentTarget.focus();
    setOpen(true);
  };
  const run = async (work: () => Promise<unknown>) => {
    setError('');
    setSaving(true);
    try {
      await work();
    } catch {
      setError(en.failed);
    } finally {
      setSaving(false);
    }
  };
  const request = async () => {
    setError('');
    try {
      await assistant.request(instruction);
    } catch {
      setError(en.failed);
    }
  };
  const hasLayout = Boolean(assistant.profile?.surfaces.collection?.length);
  const preview = Boolean(assistant.preview);
  return (
    <div className="collection-screen">
      {!hasLayout && !preview && (
        <div className="empty-collection">
          <Icon name="collection" size={48} />
          <h1>{en.emptyCollection}</h1>
          <p>{en.collectionHint}</p>
          <button className="primary-button" onClick={openAssistant}>
            {en.customize}
          </button>
        </div>
      )}
      <section aria-label={preview ? en.preview : en.collection}>
        <SurfaceRenderer id="collection" preview={preview} status={status} />
      </section>
      {preview && (
        <div className="preview-bar">
          <span>{en.preview}</span>
          <button
            className="primary-button"
            disabled={saving}
            onClick={() => void run(assistant.apply)}
          >
            {en.apply}
          </button>
          <button disabled={saving} onClick={assistant.cancel}>
            {en.discard}
          </button>
        </div>
      )}
      <button
        className="assistant-launcher"
        aria-label={en.customize}
        onClick={openAssistant}
      >
        <Icon name="spark" size={20} />
      </button>
      {error && !open && (
        <p role="status" className="surface-status">
          {error}
        </p>
      )}
      {open && (
        <AssistantPanel
          assistant={assistant}
          instruction={instruction}
          setInstruction={setInstruction}
          error={error}
          saving={saving}
          onRequest={() => void request()}
          onClose={() => setOpen(false)}
          onUndo={() => void run(assistant.undo)}
          onReset={() => void run(assistant.reset)}
        />
      )}
    </div>
  );
}
