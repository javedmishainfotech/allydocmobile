import { createNavigationContainerRef } from '@react-navigation/native';

/**
 * Lets code outside any screen (the FCM/incoming-call handling in
 * src/services/pushNotifications.js, which runs at the app root, not inside a navigator) drive
 * navigation imperatively - mirrors the web app's `window.location.href` redirects from App.jsx's
 * FCM handlers.
 */
export const navigationRef = createNavigationContainerRef();

export function navigate(name, params) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}
