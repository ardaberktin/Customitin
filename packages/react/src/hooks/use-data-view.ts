import { useCallback, useEffect, useRef, useState } from 'react';
import {
  abortable,
  executeDataPlan,
  validateDataPlan,
  type DataResult,
} from '@customitin/core';
import { useCustomization, useRenderedProfile } from '../provider/context';

export function useDataView(id: string, surfaceId: string) {
  const { runtime, bindings, registry } = useCustomization();
  const profile = useRenderedProfile();
  const view = profile?.dataViews?.find((item) => item.id === id);
  const planKey = JSON.stringify(view?.plan);
  const identity = `${runtime.activeScope}:${surfaceId}:${id}:${planKey}`;
  const [state, setState] = useState<{
    identity: string;
    data?: DataResult;
    loading: boolean;
    code?: string;
  }>({ identity, loading: true });
  const active = useRef<AbortController | null>(null);
  const result = useRef<DataResult | undefined>(undefined);
  const generation = useRef(0);
  const refresh = useCallback(
    async (cursor?: string) => {
      active.current?.abort();
      const request = new AbortController();
      active.current = request;
      const current = ++generation.current;
      const signal = runtime.signal,
        abort = () => request.abort();
      signal.addEventListener('abort', abort, { once: true });
      const timer = setTimeout(abort, 30000);
      setState((previous) => ({
        identity,
        data: previous.identity === identity ? previous.data : undefined,
        loading: true,
      }));
      try {
        if (!planKey || signal.aborted)
          throw new Error('Data view is unavailable');
        const parsed: unknown = JSON.parse(planKey);
        const { plan } = validateDataPlan(parsed, registry, surfaceId);
        const next = await runtime.queries.run(
          () =>
            abortable(
              executeDataPlan(
                plan,
                {
                  registry,
                  sources: bindings.sources,
                  remote: bindings.remoteData,
                },
                {
                  signal: request.signal,
                  scope: runtime.activeScope,
                  session: bindings.session,
                },
                surfaceId,
                cursor,
              ),
              request.signal,
            ),
          request.signal,
        );
        if (
          current !== generation.current ||
          request.signal.aborted ||
          signal.aborted
        )
          return;
        const combined = new Map<string, DataResult['rows'][number]>();
        if (cursor)
          result.current?.keys.forEach((key, index) =>
            combined.set(key, result.current!.rows[index]!),
          );
        next.keys.forEach((key, index) => combined.set(key, next.rows[index]!));
        if (combined.size > 10000)
          throw new Error('Data view exceeds its row budget');
        result.current = {
          ...next,
          keys: [...combined.keys()],
          rows: [...combined.values()],
        };
        setState({ identity, data: result.current, loading: false });
      } catch {
        if (current === generation.current && !signal.aborted)
          setState({
            identity,
            loading: false,
            code: request.signal.aborted ? 'DATA_CANCELLED' : 'DATA_FAILED',
          });
      } finally {
        clearTimeout(timer);
        signal.removeEventListener('abort', abort);
      }
    },
    [
      planKey,
      registry,
      surfaceId,
      bindings.sources,
      bindings.remoteData,
      bindings.session,
      identity,
      runtime,
    ],
  );
  useEffect(() => {
    void refresh();
    let sourceIds: string[] = [];
    try {
      if (planKey)
        sourceIds = validateDataPlan(
          JSON.parse(planKey),
          registry,
          surfaceId,
        ).sourceIds;
    } catch {
      /* Refresh exposes a structured error. */
    }
    const unsubscribers = sourceIds.map((sourceId) =>
      bindings.sources[sourceId]?.subscribeInvalidation?.(() => void refresh()),
    );
    const unsubscribe = runtime.subscribeInvalidation((ids) => {
      if (ids.some((sourceId) => sourceIds.includes(sourceId))) void refresh();
    });
    return () => {
      active.current?.abort();
      unsubscribe();
      unsubscribers.forEach((fn) => fn?.());
    };
  }, [refresh, runtime, registry, surfaceId, planKey, bindings.sources]);
  return {
    data: state.identity === identity ? state.data : undefined,
    loading: state.identity !== identity || state.loading,
    code: state.identity === identity ? state.code : undefined,
    refresh: () => refresh(),
    more: () =>
      !state.loading && state.identity === identity && state.data?.nextCursor
        ? refresh(state.data.nextCursor)
        : Promise.resolve(),
  };
}
