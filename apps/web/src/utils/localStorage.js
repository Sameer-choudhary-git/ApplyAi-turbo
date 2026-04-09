// localStore.js — replaces all db.entities / db.integrations calls
// Data is persisted in localStorage under the key "applyai_profile"

const STORAGE_KEY = 'applyai_profile';

export const localStore = {
  /** Read the saved profile (returns null if nothing saved yet) */
  getProfile() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  /** Save / overwrite the profile */
  saveProfile(profileData) {
    const record = { ...profileData, onboarding_completed: true, created_date: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    return record;
  },

  /** Clear everything (useful for "log out / reset") */
  clear() {
    localStorage.removeItem(STORAGE_KEY);
  },
};