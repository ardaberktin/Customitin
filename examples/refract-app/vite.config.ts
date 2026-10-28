import { defineConfig } from 'vite';
import { refractPlannerPlugin } from './server/plugin';
export default defineConfig({
  plugins: [refractPlannerPlugin()],
  server: { host: '127.0.0.1', port: 8086, strictPort: true },
});
