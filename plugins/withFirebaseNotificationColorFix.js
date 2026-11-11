const { withAndroidManifest, createRunOncePlugin } = require('@expo/config-plugins');

/**
 * expo-notifications' own config plugin and @react-native-firebase/messaging's bundled
 * AndroidManifest.xml both declare the `com.google.firebase.messaging.default_notification_color`
 * meta-data (pointing at different color resources), which fails the manifest merger with
 * "Attribute ... is also present at [:react-native-firebase_messaging] AndroidManifest.xml ...".
 * Adding tools:replace="android:resource" lets our own value (expo-notifications' configured
 * color) win, exactly as the merger's own error message suggests.
 */
const META_DATA_NAME = 'com.google.firebase.messaging.default_notification_color';

const withFirebaseNotificationColorFix = (config) => {
  return withAndroidManifest(config, (modConfig) => {
    const application = modConfig.modResults.manifest.application?.[0];
    const metaData = application?.['meta-data'] || [];
    const entry = metaData.find((item) => item.$?.['android:name'] === META_DATA_NAME);
    if (entry) {
      entry.$['tools:replace'] = 'android:resource';
    }
    return modConfig;
  });
};

module.exports = createRunOncePlugin(withFirebaseNotificationColorFix, 'withFirebaseNotificationColorFix', '1.0.0');
