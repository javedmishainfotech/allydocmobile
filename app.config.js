const appJson = require('./app.json');

// Mirrors the web app's VITE_BASE_URL (.env) - same staging API for now.
// Override by setting ALLYDOC_API_BASE_URL in the shell before `expo start`.
const API_BASE_URL =
  process.env.ALLYDOC_API_BASE_URL || 'https://allydocstagingapitest.digitalnoticeboard.biz';

// The hosted payment page the checkout WebView posts the payment token to - the web app's
// VITE_PAYMENT_URL (Authorize.Net sandbox for now).
const PAYMENT_URL = process.env.ALLYDOC_PAYMENT_URL || 'https://test.authorize.net/payment/payment';

// The chat (SignalR) server - the web app's VITE_SIGNAL_R_API_URL. Its hub is `<url>/chathub` and
// chat image uploads go to `<url>/api/chatroom/UploadFiles`.
const SIGNALR_URL = process.env.ALLYDOC_SIGNALR_URL || 'https://allydocsignalrapi-prod.digitalnoticeboard.biz';

module.exports = {
  ...appJson,
  expo: {
    ...appJson.expo,
    plugins: [
      ...(appJson.expo.plugins || []),
      'expo-web-browser',
      'react-native-blob-util',
      'expo-video',
      'expo-asset',
      'expo-font',
      '@react-native-firebase/app',
      '@react-native-firebase/messaging',
      './plugins/withFirebaseNotificationColorFix.js',
      // react-native-firebase's iOS SDK resolves via Swift Package Manager as automatic
      // (non-dynamic) libraries - with the default static pod linkage, each pod that pulls in
      // Firebase embeds its own copy, colliding as duplicate-symbol link errors. Dynamic linkage
      // is react-native-firebase's documented fix (https://rnfirebase.io/ios-spm); Android is
      // untouched by this (useFrameworks is iOS-only).
      ['expo-build-properties', { ios: { useFrameworks: 'dynamic' } }],
    ],
    extra: {
      ...(appJson.expo.extra || {}),
      apiBaseUrl: API_BASE_URL,
      paymentUrl: PAYMENT_URL,
      signalRUrl: SIGNALR_URL,
    },
  },
};
