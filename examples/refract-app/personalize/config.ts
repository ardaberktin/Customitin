import { browserStorage } from '@customitin/react/storage';
import { createHttpPlanner } from '@customitin/react/adapters';
export const storage = {
  async getItem(key: string) {
    return browserStorage(window.localStorage).getItem(key);
  },
  async setItem(key: string, value: string) {
    await browserStorage(window.localStorage).setItem(key, value);
  },
  async removeItem(key: string) {
    await browserStorage(window.localStorage).removeItem(key);
  },
};
export const scope = 'refract-sdk-controls-tester';
// The browser holds an HttpOnly local session, never a model API key.
export const planner = createHttpPlanner({
  url: new URL('/api/plan', window.location.origin).href,
  allowLocalhost: true,
  getHeaders: async () => {
    const response = await fetch('/api/session');
    if (!response.ok) throw new Error('Local planner session unavailable');
    return {};
  },
});
export function useHostConfiguration() {
  return { scope, plannerTimeoutMs: 300_000 };
}
