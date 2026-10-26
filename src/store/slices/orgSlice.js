import { createSlice } from '@reduxjs/toolkit';

/**
 * Mobile equivalent of the web app's URL-based org detection (`/:orgName?`
 * path param -> `clientName` in the login payload). Since a mobile app has
 * no URL bar, the user enters/skips an organization code on a dedicated
 * screen before reaching the login form, and that choice lives here.
 */
const orgSlice = createSlice({
  name: 'org',
  initialState: {
    orgName: '', // '' means the non-tenant (freelancer/patient) login path
    resolved: false, // whether the user has gone through the org-entry step yet
  },
  reducers: {
    setOrgName(state, action) {
      state.orgName = action.payload || '';
      state.resolved = true;
    },
    resetOrg(state) {
      state.orgName = '';
      state.resolved = false;
    },
  },
});

export const { setOrgName, resetOrg } = orgSlice.actions;
export default orgSlice.reducer;
