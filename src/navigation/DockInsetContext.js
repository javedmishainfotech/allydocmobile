import { createContext, useContext } from 'react';

/**
 * How much of the bottom of a tab screen the floating dock (DoctorTabBar) covers.
 * The dock overlays the content (that is what makes it glass), so scrolling pages
 * add this to their bottom padding or their last item would sit hidden behind it.
 * 0 outside the tab screens (pushed screens have no dock), so the same page can
 * be used either way.
 */
export const DockInsetContext = createContext(0);

export function useDockInset() {
  return useContext(DockInsetContext);
}
