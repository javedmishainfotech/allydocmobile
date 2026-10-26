import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

/**
 * Mirrors the web app's flat localStorage session store (see
 * SignInAction.js's SignInActionV3Dot1), split across two backends:
 *  - SecureStore for the auth/refresh tokens (sensitive).
 *  - AsyncStorage for everything else (profile fields, role, org, flags).
 * Every key name matches the web app exactly so the two clients can be
 * reasoned about identically.
 */

const SECURE_KEYS = new Set(['auth_token', 'refreshToken']);

export async function setItem(key, value) {
  if (SECURE_KEYS.has(key)) {
    await SecureStore.setItemAsync(key, value);
    return;
  }
  await AsyncStorage.setItem(key, value);
}

export async function getItem(key) {
  if (SECURE_KEYS.has(key)) {
    return SecureStore.getItemAsync(key);
  }
  return AsyncStorage.getItem(key);
}

export async function removeItem(key) {
  if (SECURE_KEYS.has(key)) {
    await SecureStore.deleteItemAsync(key);
    return;
  }
  await AsyncStorage.removeItem(key);
}

/** Clears everything except `preserveKeys` - mirrors the web logout flow's
 * localStorage.clear() + re-setting preferredLoginTab. */
export async function clearAll(preserveKeys = []) {
  const preserved = {};
  for (const key of preserveKeys) {
    preserved[key] = await getItem(key);
  }

  await AsyncStorage.clear();
  for (const key of SECURE_KEYS) {
    await SecureStore.deleteItemAsync(key).catch(() => undefined);
  }

  for (const key of preserveKeys) {
    if (preserved[key] != null) {
      await setItem(key, preserved[key]);
    }
  }
}
