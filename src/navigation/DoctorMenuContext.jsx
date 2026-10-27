import { createContext, useContext } from 'react';

/**
 * The doctor's menu as returned by the backend (`/AllMenus`), split for the UI:
 * the first four become the bottom tabs, the rest are the cards in the More sheet.
 * Provided by RoleNavigator, read by the tab navigator, tab bar and More sheet.
 */
export const DoctorMenuContext = createContext({ tabItems: [], moreItems: [] });

export function useDoctorMenu() {
  return useContext(DoctorMenuContext);
}
