/**
 * secureStore.js — Backward-compatible re-export
 * All logic now lives in secureStorage.js.
 */
export {
  KEYS,
  setSecureValue,
  getSecureValue,
  deleteSecureValue,
  saveSecureProfile,
  getSecureProfile,
  clearSecureProfile,
} from './secureStorage';
