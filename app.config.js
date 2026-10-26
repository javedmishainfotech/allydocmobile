const appJson = require('./app.json');

// Mirrors the web app's VITE_BASE_URL (.env) - same staging API for now.
// Override by setting ALLYDOC_API_BASE_URL in the shell before `expo start`.
const API_BASE_URL =
  process.env.ALLYDOC_API_BASE_URL || 'https://allydocstagingapitest.digitalnoticeboard.biz';

module.exports = {
  ...appJson,
  expo: {
    ...appJson.expo,
    plugins: [...(appJson.expo.plugins || []), 'expo-web-browser'],
    extra: {
      ...(appJson.expo.extra || {}),
      apiBaseUrl: API_BASE_URL,
    },
  },
};
