import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
const path = (s: string) => fileURLToPath(new URL(s, import.meta.url));
export default defineConfig({
  resolve: {
    alias: {
      '@customitin/core': path('./packages/core/src/index.ts'),
      '@customitin/react': path('./packages/react/src'),
      '@customitin/react-native': path('./packages/react-native/src'),
      '@customitin/server': path('./packages/server/src/index.ts'),
      '@customitin/cli': path('./packages/cli/src/api.ts'),
      '@customitin/examples/ui': path('./examples/shared/src/ui/index.ts'),
      '@customitin/examples': path('./examples/shared/src/index.ts'),
      'react-native': 'react-native-web',
    },
  },
  test: { include: ['tests/**/*.test.{ts,tsx}'], testTimeout: 60000 },
});
