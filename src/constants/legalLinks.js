/**
 * Verified routes ported from AllyDocReactApp's src/routes.jsx - every path
 * here was confirmed to exist and render real content before being added.
 * Do not add an entry unless it's been verified against the web app's
 * actual routing, per the same rule the web app itself follows.
 *
 * WEB_APP_BASE_URL is the web app's own hosting domain (not the backend API
 * domain, which is a different host - see src/api/client.js).
 */
export const WEB_APP_BASE_URL = 'https://allydoc-app-dev.digitalnoticeboard.biz';

// Opened in-app via WebView (src/pages/legal/LegalWebViewScreen.jsx).
export const IN_APP_LEGAL_PAGES = {
  termsAndConditions: {
    title: 'Terms & Conditions',
    url: `${WEB_APP_BASE_URL}/terms-and-conditions`,
  },
  privacyPolicy: {
    title: 'Privacy Policy',
    url: `${WEB_APP_BASE_URL}/privacy-policy`,
  },
};

// Opened externally via expo-web-browser (src/utils/openExternalLink.js).
export const EXTERNAL_INFO_PAGES = {
  contactUs: {
    title: 'Contact Us',
    url: `${WEB_APP_BASE_URL}/Contact-us`, // exact casing from routes.jsx
  },
  faq: {
    title: 'FAQ',
    url: `${WEB_APP_BASE_URL}/faq`,
  },
  refundPolicy: {
    title: 'Refund Policy',
    url: `${WEB_APP_BASE_URL}/refund-policy`,
  },
};
