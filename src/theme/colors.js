// Exact port of the CSS variables in AllyDocReactApp/src/assets/css/newStyle.css
// (.auth-theme-patient / .auth-theme-doctor block) - same blue brand palette.
export const colors = {
  accent: '#3B82F6',
  accentDark: '#2563EB',
  accentDarker: '#1D4ED8',
  accentLight: '#EFF6FF',
  accentActiveIconBg: 'rgba(59, 130, 246, 0.15)',
  accentFocusRing: 'rgba(59, 130, 246, 0.12)',

  heading: '#0F172A',
  bodyText: '#64748B',
  roleLabel: '#94A3B8',
  fieldLabel: '#344054',
  inputText: '#1E293B',
  inputBorder: '#D0D5DD',
  placeholder: '#94A3B8',

  cardBorderInactive: '#E2E8F0',
  cardBorderHover: '#CBD5E1',
  cardBgHover: '#F8FAFC',
  roleTitleInactive: '#1E293B',
  roleDescInactive: '#94A3B8',
  roleIconBgInactive: '#F1F5F9',
  roleIconColorInactive: '#64748B',

  hintBg: '#EFF6FF',
  hintBorder: '#BFDBFE',
  hintText: '#334155',

  dangerBg: '#FEF2F2',
  dangerBorder: '#FECACA',
  dangerTitle: '#B91C1C',
  dangerText: '#DC2626',
  successText: '#16A34A',

  disabledButtonBg: '#CBD5E1',
  white: '#FFFFFF',
  checkboxBorder: '#CBD5E1',

  // --auth-gradient: the dark-blue panel on the web login page (linear-gradient 160deg).
  authGradient: ['#0F172A', '#1E3A5F', '#1D4ED8'],
};

/**
 * Exact port of the "ad-" design tokens in AllyDocReactApp/src/styles/components.css
 * (the admin/dashboard surface's own token set, distinct from the auth pages'
 * .auth-theme-* variables above). Used by DoctorDashboardPage and anything
 * else porting a web "ad-card"-based screen, so dashboard-style screens match
 * the web app's actual colors instead of reusing the auth palette loosely.
 */
export const adTokens = {
  primary: '#3B82F6',
  primaryDark: '#2563EB',
  primaryLight: '#EFF6FF',
  primaryTint: 'rgba(59, 130, 246, 0.12)',

  success: '#10B981',
  successDark: '#059669',
  successLight: '#D1FAE5',
  successTint: 'rgba(16, 185, 129, 0.12)',

  warning: '#F59E0B',
  warningDark: '#D97706',
  warningLight: '#FEF3C7',
  warningTint: 'rgba(245, 158, 11, 0.12)',

  danger: '#EF4444',
  dangerDark: '#DC2626',
  dangerLight: '#FEE2E2',
  dangerTint: 'rgba(239, 68, 68, 0.12)',

  info: '#06B6D4',
  infoDark: '#0891B2',
  infoLight: '#CFFAFE',
  infoTint: 'rgba(6, 182, 212, 0.12)',

  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',

  gray50: '#F8FAFC',
  gray100: '#F1F5F9',
  gray200: '#E2E8F0',
  border: '#D1DAE6',
  tableHeaderBorder: '#B8C5D6',

  white: '#FFFFFF',

  // ── Page background (--ad-bg-body) ──
  // The web app's content area sits on this pale blue-grey, not plain white,
  // so white cards (ad-card/ad-stat-card) read as raised surfaces against it.
  bgBody: '#E8EDF4',

  // ── Dark navy navigation chrome (--ad-bg-sidebar + .ad-sidebar's exact
  // gradient/link colors) - used for the drawer (sidebar) and bottom nav,
  // the app's two navigation surfaces. The top navbar stays light, same as
  // the web app's header, which never goes dark even with this sidebar.
  navGradient: ['#0B1425', '#111D35', '#0D1A30'],
  navBorder: 'rgba(59, 130, 246, 0.12)',
  navDivider: 'rgba(255, 255, 255, 0.08)',
  navTextInactive: 'rgba(148, 163, 184, 0.9)',
  navTextActive: '#93C5FD',
  navActiveBg: 'rgba(59, 130, 246, 0.16)',
  navIconInactiveOpacity: 0.75,

  cardBorderRadius: 14,
  cardShadow: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
};
