import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';
import { toast } from './toast';

/**
 * Opens a URL in an in-app browser tab (Chrome Custom Tabs on Android), with
 * a fallback to the OS-level Linking API, and a toast if both fail - so an
 * external link never just silently does nothing.
 */
export async function openExternalLink(url) {
  try {
    const result = await WebBrowser.openBrowserAsync(url);
    if (result.type === 'opened' || result.type === 'cancel' || result.type === 'dismiss') {
      return;
    }
    throw new Error('Browser did not open');
  } catch (webBrowserError) {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) throw new Error('URL not supported');
      await Linking.openURL(url);
    } catch (linkingError) {
      toast.error('Could not open the link. Please try again.');
    }
  }
}
