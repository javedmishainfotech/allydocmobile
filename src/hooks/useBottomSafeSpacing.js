import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * The device's bottom system-bar inset (3-button nav bar or gesture pill), plus
 * however much extra visual breathing room a screen wants on top of it. Use this
 * for any bottom-edge UI OUTSIDE the tab navigator - a pushed screen's scroll
 * content, a fixed footer action row, or a full-screen Modal's bottom buttons -
 * so it always clears the system nav bar on any device instead of a hardcoded
 * padding number that only happens to work on the device it was tested on.
 *
 * Screens INSIDE the tab navigator don't need this - they already get
 * `useDockInset()` (DockInsetContext.js), which accounts for both the floating
 * tab dock AND the system bar beneath it.
 */
export function useBottomSafeSpacing(extra = 0) {
  const insets = useSafeAreaInsets();
  return insets.bottom + extra;
}
