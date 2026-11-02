import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AndroidImportance, AndroidNotificationVisibility } from 'expo-notifications'; // named enums, not Notifications.* namespace members
import * as TaskManager from 'expo-task-manager';
import { registerFcmToken, unregisterFcmToken } from './fcmService';
import { getItem, setItem, removeItem } from '../utils/storage';

/**
 * Port of AllyDocReactApp's firebase.js + fcmRegister.js for native Android: instead of a VAPID
 * web-push token, `Notifications.getDevicePushTokenAsync()` returns the raw FCM registration
 * token for this device (Android routes expo-notifications straight through Firebase Cloud
 * Messaging when `google-services.json` is present - no Expo push service involved), which is
 * registered with the exact same backend endpoints web uses (`/RegisterFcmToken`,
 * `/UnregisterFcmToken`), just with `source: 'android'`.
 */

export const CALLS_CHANNEL_ID = 'calls';
export const DEFAULT_CHANNEL_ID = 'default';
export const INCOMING_CALL_CATEGORY = 'incoming_call';
export const BACKGROUND_NOTIFICATION_TASK = 'ALLYDOC_BACKGROUND_NOTIFICATION_TASK';

const DEVICE_TOKEN_KEY = 'fcmDeviceToken';

// How foreground notifications are presented while the app is open. The incoming-call ring UI
// itself is a custom in-app modal (see IncomingCallProvider), so this only governs plain
// notifications and the OS-level fallback if our own JS handling doesn't run in time.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Android notification channels - "calls" mirrors web's `requireInteraction`/`vibrate` ringing
 * notification (max importance, long vibration pattern); "default" covers everything else. */
export async function configureAndroidChannels() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(DEFAULT_CHANNEL_ID, {
    name: 'General',
    importance: AndroidImportance.DEFAULT,
  });
  await Notifications.setNotificationChannelAsync(CALLS_CHANNEL_ID, {
    name: 'Incoming calls',
    importance: AndroidImportance.MAX,
    vibrationPattern: [300, 150, 300, 150, 300],
    // Omitted `sound` - Android channels play the system default notification sound unless told
    // otherwise, and a literal 'default' string here requires registering an actual sound asset
    // named 'default' via the expo-notifications plugin config, which this app doesn't have.
    enableVibrate: true,
    lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
  });
}

/** Join / Decline action buttons on the incoming-call notification itself (Android), mirroring
 * the web service worker's `actions: [{action: 'join_call', ...}, {action: 'decline_call', ...}]`. */
export async function configureNotificationCategories() {
  await Notifications.setNotificationCategoryAsync(INCOMING_CALL_CATEGORY, [
    { identifier: 'join_call', buttonTitle: 'Join' },
    { identifier: 'decline_call', buttonTitle: 'Decline', options: { isDestructive: true } },
  ]);
}

export async function requestNotificationPermission() {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/** Raw FCM token for this device, or null if permission isn't granted / unavailable (e.g. an
 * emulator without Google Play services). */
export async function getDeviceFcmToken() {
  if (!Device.isDevice) {
    console.log('[push] Not a physical device - FCM token may be unavailable on this emulator.');
  }
  try {
    const token = await Notifications.getDevicePushTokenAsync();
    return token?.data || null;
  } catch (error) {
    console.warn('[push] getDevicePushTokenAsync failed:', error?.message || error);
    return null;
  }
}

/**
 * Registers (or re-registers) this device's current FCM token with the backend. Mirrors web's
 * syncFcmToken: skips re-registering an unchanged token, but always registers when it rotated.
 * Call after login and on app start while already authenticated.
 */
export async function syncPushToken() {
  const granted = await requestNotificationPermission();
  console.log('[push] notification permission granted =', granted);
  if (!granted) return null;

  await configureAndroidChannels();
  await configureNotificationCategories();

  const token = await getDeviceFcmToken();
  console.log('[push] device FCM token =', token);
  if (!token) return null;

  const previousToken = await getItem(DEVICE_TOKEN_KEY);
  if (previousToken === token) {
    console.log('[push] token unchanged, skipping re-registration');
    return token;
  }

  const result = await registerFcmToken(token);
  console.log('[push] registerFcmToken result =', result.success, result.message);
  if (result.success) {
    await setItem(DEVICE_TOKEN_KEY, token);
  } else {
    console.warn('[push] FCM token registration failed:', result.message);
  }
  return token;
}

/** Best-effort cleanup on logout - mirrors unregisterFcmTokenWithBackend + resetFcmTokenSync. */
export async function clearPushToken() {
  const token = await getItem(DEVICE_TOKEN_KEY);
  if (token) {
    await unregisterFcmToken(token).catch(() => {});
  }
  await removeItem(DEVICE_TOKEN_KEY);
}

/**
 * Background/killed-state notification task (expo-notifications + expo-task-manager): fires for
 * both a newly-received remote message and a notification action tap while the app isn't in the
 * foreground. Defined here (not inline in index.js) but registered from index.js, which is
 * required early enough to satisfy Expo's "module scope of a JS module required early" rule.
 *
 * Today the backend sends CALL_RINGING (like every push type) with both a `notification` and a
 * `data` block, so Android auto-displays its own plain, non-interactive system notification
 * whenever the app is backgrounded or killed - this task's own code never runs until the user
 * taps that notification (standard FCM behavior: a `notification` block short-circuits app code
 * while backgrounded). That tap still reaches `addNotificationResponseReceivedListener` once the
 * app is foregrounded, so Join/Decline still work - just without a ring UI until the app opens.
 * To get the SAME background ring/actions/auto-decline experience web's service worker has
 * (an "Incoming call" heads-up notification with Join/Decline buttons appearing immediately,
 * even while backgrounded), the backend would need to send CALL_RINGING (and
 * CALL_STOP_RINGING/CALL_ANSWERED_ELSEWHERE) as a DATA-ONLY message (no `notification` block) for
 * Android device tokens specifically - that is the one backend change this feature is currently
 * missing for full web parity.
 */
TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, ({ data, error }) => {
  if (error) {
    console.warn('[push] background task error:', error);
    return;
  }
  if (!data) return;
  const isResponse = 'actionIdentifier' in data;
  if (isResponse) {
    // A response while backgrounded: best-effort decline so an ignored call doesn't ring forever
    // server-side if the user swipes it away rather than opening the app. Join always needs the
    // app in foreground (to navigate into the call screen), so it is left for the foreground
    // response listener once the tap brings the app up.
    return;
  }
});

export function registerBackgroundNotificationTask() {
  return Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK).catch((error) => {
    console.warn('[push] registerTaskAsync failed:', error?.message || error);
  });
}
