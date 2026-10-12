import { throwIfAborted } from '@customitin/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  validatePage,
  validateQuery,
  type QueryPage,
  type Row,
  type SavedView,
} from '@customitin/core';
import { useCustomization } from '../provider/context';

export function useCollection(view: SavedView) {
  const { bindings, runtime } = useCustomization();
  const adapter = bindings.sources[view.sourceId];
  const [page, setPage] = useState<QueryPage>();
  const [pageKey, setPageKey] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const request = useRef<AbortController | null>(null);
  const pageRef = useRef<QueryPage | undefined>(undefined);
  const generation = useRef(0);
  const queryKey = JSON.stringify(view.query);
  const identity = `${runtime.activeScope}:${view.sourceId}:${queryKey}`;
  const refresh = useCallback(
    async (cursor?: string) => {
      request.current?.abort();
      const controller = new AbortController();
      request.current = controller;
      const signal = runtime.signal;
      const abort = () => controller.abort();
      signal.addEventListener('abort', abort, { once: true });
      let timedOut = false;
      const deadline = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, 15000);
      const current = ++generation.current;
      setLoading(true);
      setError(false);
      if (!cursor) {
        pageRef.current = undefined;
        setPage(undefined);
      }
      try {
        if (!adapter) throw new Error('Missing source binding');
        throwIfAborted(signal);
        const query = validateQuery(JSON.parse(queryKey), adapter.descriptor);
        const result = validatePage(
          await runtime.queries.run(
            () =>
              adapter.query(
                query,
                {
                  signal: controller.signal,
                  scope: runtime.activeScope,
                  session: bindings.session,
                },
                cursor,
              ),
            controller.signal,
          ),
          adapter.descriptor,
        );
        if (controller.signal.aborted || current !== generation.current) return;
        if (cursor && result.nextCursor === cursor)
          throw new Error('Source returned a repeated cursor');
        const items = new Map<string, Row>();
        for (const row of [
          ...(cursor ? (pageRef.current?.items ?? []) : []),
          ...result.items,
        ])
          items.set(String(row[adapter.descriptor.idField]), row);
        if (items.size > adapter.descriptor.maxRows)
          throw new Error('Collection row budget exceeded');
        const next = { ...result, items: [...items.values()] };
        pageRef.current = next;
        setPageKey(identity);
        setPage(next);
      } catch {
        if (
          (!controller.signal.aborted || timedOut) &&
          !signal.aborted &&
          current === generation.current
        )
          setError(true);
      } finally {
        clearTimeout(deadline);
        signal.removeEventListener('abort', abort);
        if (
          (!controller.signal.aborted || timedOut) &&
          !signal.aborted &&
          current === generation.current
        )
          setLoading(false);
      }
    },
    [adapter, runtime, bindings.session, queryKey, identity],
  );
  useEffect(() => {
    void refresh();
    const unsubscribe = adapter?.subscribeInvalidation?.(() => void refresh());
    return () => {
      request.current?.abort();
      unsubscribe?.();
    };
  }, [adapter, refresh]);
  return {
    page: pageKey === identity ? page : undefined,
    error,
    loading,
    descriptor: adapter?.descriptor,
    refresh: () => void refresh(),
    more: () => {
      if (!loading && page?.nextCursor) void refresh(page.nextCursor);
    },
  };
}
