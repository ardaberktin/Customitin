import type { ValueRule } from '@customitin/core';

export interface DiscoveredSymbol {
  id: string;
  name: string;
  exportName: string;
  member?: string;
  selector: string;
  file: string;
  line: number;
  kind: 'component' | 'source' | 'hook' | 'query-client' | 'navigation-ref';
  signature: string;
  fields: Record<string, ValueRule>;
  props: Record<string, ValueRule>;
  unsupportedProps: string[];
  complete: boolean;
  approved: boolean;
  adapter?: 'array' | 'query-options' | 'query-page';
  acceptsQuery?: boolean;
  itemProp?: string;
  itemFields?: Record<string, ValueRule>;
  pressProp?: string;
  screen?: { sections: { key: string; title: string }[] };
  screenIssue?: string;
}
export interface DiscoveredRoute {
  id: string;
  selector: string;
  file: string;
  path: string;
  params: Record<string, ValueRule>;
  supported: boolean;
}
export interface DiscoveryReport {
  project: string;
  appId: string;
  framework: 'expo-router' | 'react-navigation' | 'unknown';
  entry?: string;
  versions: Record<string, string>;
  symbols: DiscoveredSymbol[];
  routes: string[];
  routeDetails: DiscoveredRoute[];
  unsupported: string[];
  unresolved: string[];
  excludedFiles: number;
  contextDigest: string;
  context: string;
}
