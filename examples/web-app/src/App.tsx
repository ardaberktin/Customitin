import { useState } from 'react';
import {
  CustomizationProvider,
  SurfaceRenderer,
  type HostComponentProps,
} from '@customitin/react';
import { browserStorage } from '@customitin/react/storage';
import {
  workspaceData,
  workspaceRegistry,
  workspacePlanner,
  useWorkspaceControls,
  en,
} from '@customitin/examples/headless';
import { Chart, Table, type SeriesItem } from './components';
const data = workspaceData();
const series = (props: HostComponentProps): SeriesItem[] =>
  (props.data?.series?.rows ?? []).map((row) => ({
    label: String(row.label),
    value: Number(row.value),
  }));
const bindings = {
  ...data,
  components: {
    chart: (props: HostComponentProps) => (
      <Chart title={String(props.values.title)} series={series(props)} />
    ),
    table: (props: HostComponentProps) => (
      <Table title={String(props.values.title)} series={series(props)} />
    ),
  },
};
const status = (state: { code: string }) => (
  <p role="status">{en.status[state.code] ?? en.fallback}</p>
);
export function App() {
  const [storage] = useState(() => browserStorage(window.localStorage));
  return (
    <CustomizationProvider
      options={{
        registry: workspaceRegistry,
        scope: 'local-device',
        storage,
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
    <main>
      <header>
        <p>{en.eyebrow}</p>
        <h1>{en.webTitle}</h1>
        <p>{en.intro}</p>
      </header>
      <Chart
        title={en.existing}
        series={[
          { label: 'Design', value: 12 },
          { label: 'Engineering', value: 24 },
        ]}
      />
      <section className="assistant">
        <h2>{en.personalize}</h2>
        <p>{en.demo}</p>
        <label>
          {en.instruction}
          <input
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
          />
        </label>
        <div className="buttons">
          <button
            disabled={assistant.loading || assistant.busy || saving}
            onClick={prepare}
          >
            {en.prepare}
          </button>
          <button disabled={!assistant.canUndo || saving} onClick={undo}>
            {en.undo}
          </button>
          <button disabled={assistant.loading || saving} onClick={reset}>
            {en.reset}
          </button>
          {assistant.busy ? (
            <button onClick={assistant.cancel}>{en.cancelPlanning}</button>
          ) : null}
        </div>
        {assistant.message || error ? (
          <p role="status">{error || assistant.message}</p>
        ) : null}
        {assistant.preview ? (
          <section aria-label={en.previewLabel}>
            <h3>{en.preview}</h3>
            <SurfaceRenderer id="workspace" preview status={status} />
            <div className="buttons">
              <button disabled={saving} onClick={apply}>
                {en.apply}
              </button>
              <button onClick={assistant.cancel}>{en.discard}</button>
            </div>
          </section>
        ) : null}
        {action.status === 'proposed' ? (
          <section aria-label={en.confirmationLabel}>
            <p>{action.proposal?.summary}</p>
            <p>{en.mutationNotice}</p>
            <button disabled={saving} onClick={execute}>
              {en.confirm}
            </button>
            <button onClick={action.cancel}>{en.cancelAction}</button>
          </section>
        ) : null}
        {action.status !== 'idle' ? (
          <p role="status">{en.actionStatus[action.status]}</p>
        ) : null}
      </section>
      <section aria-label={en.surface}>
        <h2>{en.surface}</h2>
        <SurfaceRenderer id="workspace" status={status} />
        {!assistant.profile?.surfaces.workspace?.length ? (
          <p>{en.empty}</p>
        ) : null}
      </section>
    </main>
  );
}
