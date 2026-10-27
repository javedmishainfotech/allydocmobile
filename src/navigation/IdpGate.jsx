import React, { useCallback, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { getItem } from '../utils/storage';
import { toast } from '../utils/toast';
import { adTokens } from '../theme/colors';

// Port of the check in the web's ProtectedRoutes.jsx: a doctor's routes other than these four
// (dashboard, identity-proofing, setting, notification) stay locked until Identity Proofing succeeds.
const IDP_EXEMPT_KEYS = new Set(['DoctorDashboard', 'IdentityProofing', 'DoctorSettings', 'DoctorNotification']);
// "nurse" and "doctor admin" never go through Identity Proofing; only these two roles are gated.
const IDP_GATED_ROLES = new Set(['doctor', 'doctor sub']);

export const requiresIdpGate = (itemKey) => !IDP_EXEMPT_KEYS.has(itemKey);

const gatedCache = new Map();

/** Wraps a doctor screen so it only renders once idpStatus === 'idpsuccess'; otherwise it
 * toasts and sends the user to Identity Proofing (the web's redirect). Cached per component so
 * the wrapper keeps a stable identity as a navigator `component`. */
export function withIdpGate(Component) {
  if (gatedCache.has(Component)) return gatedCache.get(Component);

  function IdpGated(props) {
    const navigation = useNavigation();
    const { profile } = useAuth();
    const [allowed, setAllowed] = useState(false);

    const role = String(profile?.roleName || '').toLowerCase().trim();
    const gated = IDP_GATED_ROLES.has(role);

    // Re-checked on every focus so finishing Identity Proofing unlocks the screens without a restart.
    useFocusEffect(
      useCallback(() => {
        if (!gated) {
          setAllowed(true);
          return undefined;
        }
        let active = true;
        (async () => {
          const stored = await getItem('idpStatus').catch(() => null);
          const status = String(stored || profile?.idpStatus || '').toLowerCase();
          if (!active) return;
          if (status === 'idpsuccess') {
            setAllowed(true);
          } else {
            setAllowed(false);
            toast.error('Please complete Identity Proofing to access this page');
            navigation.navigate('IdentityProofing');
          }
        })();
        return () => {
          active = false;
        };
      }, [gated, navigation, profile?.idpStatus]),
    );

    if (!allowed) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: adTokens.bgBody }}>
          <ActivityIndicator color={adTokens.primary} />
        </View>
      );
    }
    return <Component {...props} />;
  }

  gatedCache.set(Component, IdpGated);
  return IdpGated;
}
