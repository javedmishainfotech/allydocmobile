const { withAndroidManifest, withAppBuildGradle, withInfoPlist, AndroidConfig, createRunOncePlugin } = require('@expo/config-plugins');

/**
 * Local re-implementation of @daily-co/config-plugin-rn-daily-js (its latest release, 0.0.13, only
 * supports Expo <58 - see https://docs.daily.co/docs/react-native/installation.md "Expo: config
 * plugin"). Same native edits that plugin makes for Daily's React Native SDK, written against this
 * project's own (Expo 58) `@expo/config-plugins`, so `npx expo prebuild` / EAS builds configure the
 * Daily foreground service and camera/mic permissions without installing the incompatible package.
 * Screen share is intentionally left out (the app doesn't use it).
 */
const withAppBuildGradleJniFix = (config) => {
  // Works around an Expo/Hermes packaging clash Daily's native module hits otherwise.
  // https://github.com/expo/expo/issues/17450
  return withAppBuildGradle(config, (modConfig) => {
    modConfig.modResults.contents += '\nandroid.packagingOptions.jniLibs.useLegacyPackaging = true\n';
    return modConfig;
  });
};

const withDailyAndroidManifest = (config) => {
  return withAndroidManifest(config, (modConfig) => {
    const { manifest } = modConfig.modResults;
    AndroidConfig.Permissions.ensurePermissions(modConfig.modResults, [
      'android.permission.CAMERA',
      'android.permission.RECORD_AUDIO',
      'android.permission.MODIFY_AUDIO_SETTINGS',
      'android.permission.ACCESS_NETWORK_STATE',
      'android.permission.WAKE_LOCK',
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_CAMERA',
      'android.permission.FOREGROUND_SERVICE_MICROPHONE',
    ]);

    if (!manifest['uses-feature']) manifest['uses-feature'] = [];
    manifest['uses-feature'].push(
      { $: { 'android:name': 'android.hardware.camera', 'android:required': 'false' } },
      { $: { 'android:name': 'android.hardware.camera.autofocus', 'android:required': 'false' } },
    );

    const application = AndroidConfig.Manifest.getMainApplication(modConfig.modResults);
    if (application) {
      if (!application.service) application.service = [];
      application.service.push({
        $: {
          'android:name': 'com.daily.reactlibrary.DailyOngoingMeetingForegroundService',
          'android:exported': 'false',
          'android:foregroundServiceType': 'camera|microphone',
        },
      });
    }

    return modConfig;
  });
};

const withDailyInfoPlist = (config) => {
  return withInfoPlist(config, (modConfig) => {
    modConfig.modResults.NSCameraUsageDescription =
      modConfig.modResults.NSCameraUsageDescription || 'Allow AllyDoc to access your camera for video calls.';
    modConfig.modResults.NSMicrophoneUsageDescription =
      modConfig.modResults.NSMicrophoneUsageDescription || 'Allow AllyDoc to access your microphone for calls.';
    const modes = new Set(modConfig.modResults.UIBackgroundModes || []);
    modes.add('voip');
    modConfig.modResults.UIBackgroundModes = Array.from(modes);
    return modConfig;
  });
};

const withDailyCo = (config) => {
  config = withAppBuildGradleJniFix(config);
  config = withDailyAndroidManifest(config);
  config = withDailyInfoPlist(config);
  return config;
};

module.exports = createRunOncePlugin(withDailyCo, 'withDailyCo', '1.0.0');
