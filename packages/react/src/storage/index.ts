import type { StorageAdapter } from '@customitin/core';
export {
  memoryStorage,
  ProfileStore,
  type StorageAdapter,
} from '@customitin/core';
/** No browser globals are accessed until the host explicitly supplies its storage. */
export function browserStorage(
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>,
): StorageAdapter {
  return {
    async getItem(key) {
      return storage.getItem(key);
    },
    async setItem(key, value) {
      storage.setItem(key, value);
    },
    async removeItem(key) {
      storage.removeItem(key);
    },
  };
}
