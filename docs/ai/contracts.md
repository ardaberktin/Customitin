# Supported contracts and adapter examples

Examples use fictional host exports. They are patterns to map to the consuming app, not instructions to replace working business logic.

## Complete repositories

Discovery supports exported function declarations, exported arrow/function expressions and callable methods on exported repository objects. Methods are invoked on the imported object so their `this` receiver is retained. Complete automatic array loaders take no parameters and return typed mutable/readonly arrays or promises of arrays.

```ts
interface Entry {
  id: string;
  title: string;
  stage: 'draft' | 'done';
  note?: string;
}

/** @customitinComplete */
export const loadEntries = async (): Promise<Entry[]> => repository.readAll();
```

The marker asserts all authorized rows are returned within the declared row budget. It is not justified by an array return type, a successful fetch, or a cache containing several pages. Without it, use a reviewed source override with completeness: "complete". Other exported sources remain unchanged.

Strings, numbers, booleans, literal enums and nullable/optional scalar fields are discovered. Nested objects and executable fields are not exposed. Optional row values normalize to null. The ID field must be a non-nullable string or number; override idField for `_id`, `uuid`, etc. Every returned row is validated and duplicate IDs are rejected. The adapter projects only the registry's exposed fields before validation/rendering.

## TanStack Query

```ts
import { QueryClient, queryOptions } from '@tanstack/react-query';
export const queryClient = new QueryClient(); // Reuse the app's actual existing instance.

/** @customitinComplete */
export const entryOptions = () =>
  queryOptions({
    queryKey: ['entries'],
    queryFn: loadEntries,
  });
```

Export an existing QueryClient rather than introducing a second one. When exactly one client is discovered, generation binds it automatically; otherwise select `queryClient` in overrides or use --query-client. The generated adapter calls fetchQuery, keeps the original options, appends `customitin-scope` and the active local scope to the query key, and sets staleTime to zero for refreshes. It uses the same client but a scoped cache entry; it does not claim to share the original exact cache key.

Invalidation of the host key prefix (for example `['entries']`) refreshes personal collections. Manual cache writes on matching keys also notify them. Ordinary fetch-success events do not trigger a new fetch, preventing feedback loops. Exact-key invalidation of only the original key may leave scoped entries unaffected at the cache level, but the bridge observes the matching invalidation event and refreshes the personal source.

Cancellation stops the personalized request from accepting a late result. A shared host fetch is not forcibly cancelled by the bridge; its own query function/client controls network cancellation. Existing session checks and account-scoped host data remain the application's responsibility.

Supported factories currently take no parameters and return query options whose query function returns a typed array. Infinite queries, hooks, unexported clients and factories requiring account/filter arguments need a custom config binding or a small exported host wrapper. Discovery does not invoke hooks or flatten arbitrary useInfiniteQuery caches.

## Paginated queries

Use an explicit remote query contract when the host already supports typed filter/sort operations and cursors:

```ts
import type { QueryContext, ValidatedQuery } from '@customitin/core';

/** @customitinQuery */
export async function queryEntries(
  query: ValidatedQuery,
  context: QueryContext,
  cursor?: string,
): Promise<{
  items: Entry[];
  nextCursor: string | null;
  complete: boolean;
  totalCount?: number;
}> {
  return existingClient.queryEntries(
    query,
    context.session,
    cursor,
    context.signal,
  );
}
```

The argument order above is the contract. The host verifies authorization and applies mandatory tenant restrictions independently of user filters. Filter and sort happen before cursor pagination. totalCount, if supplied, is the matching total, not the number loaded. Return complete: true only with nextCursor: null.

Remote filter/sort capabilities default to empty. Declare supported operators explicitly:

```json
{
  "version": 1,
  "sources": {
    "src/data.ts#queryEntries": {
      "filters": { "stage": ["eq"], "title": ["contains"] },
      "sortable": ["title"],
      "pageSize": 30,
      "maxRows": 500
    }
  }
}
```

A string field does not prove a remote server supports contains. Grouping over paginated/partial sources is unavailable. A backend with another pagination protocol needs a small wrapper implementing the contract; the CLI does not guess URL parameters or SQL.

## Components

Use --component, enabled: true, or @customitinComponent to opt a discovered component into generation. Function components with scalar props become host sections; components with one scalar-record object prop can become item renderers when exactly one compatible source is selected. Optional onPress callbacks connect to registered detail navigation. Other required callbacks, React children, complex object props and context requirements need a host wrapper.

```tsx
export function EntryCard({
  entry,
  onPress,
}: {
  entry: Entry;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <Text>{entry.title}</Text>
    </Pressable>
  );
}
```

The generator matches actual field types/nullability/enums. If several sources fit, use the component's source selector. Item renderers get a sourceIds restriction enforced by core validation; the planner cannot reuse a bound renderer with an unrelated source. Required extra item props need defaults. Host scalar props remain configurable; supplied defaults fill omitted values. Components are registered for possible layouts; they are not automatically inserted into the original screen.

## Navigation

Expo Router discovery reads app/ or src/app/ TSX routes, skips layouts and special + files, and extracts single dynamic parameters. Catch-all/array routes need custom navigation. Enabling a route generates a createNavigationAdapter closure using the existing router; discovery alone does not enable it.

React Navigation discovery reads explicit TypeScript type aliases ending in ParamList. Export the existing createNavigationContainerRef result and ensure it is attached to the host container. With one discovered ref it is selected automatically; otherwise use navigationRef/--navigation-ref. Generated closures check isReady and call the existing ref with typed screen names/params. Nested NavigatorScreenParams and arbitrary navigation hooks require host code.

For details, source detailDestination references an enabled route selector or stable ID. Automatic row-to-route mapping supports exactly one parameter of the same scalar type as the ID. Multi-parameter destinations remain available as shortcuts but need a custom detail binding.
