import React, { useCallback, useEffect } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { IdentityProofingProvider, useIdentityProofing } from '../../components/identityProofing/IdentityProofingContext';
import { IdpPill } from '../../components/identityProofing/IdpUi';
import OverviewScreen from '../../components/identityProofing/OverviewScreen';
import Step1Begin from '../../components/identityProofing/Step1Begin';
import Step2Consent from '../../components/identityProofing/Step2Consent';
import Step3Disclaimer from '../../components/identityProofing/Step3Disclaimer';
import Step4PrescriberInfo from '../../components/identityProofing/Step4PrescriberInfo';
import QuestionnaireScreen from '../../components/identityProofing/QuestionnaireScreen';
import FacialStepsScreen from '../../components/identityProofing/FacialStepsScreen';
import IdMeGuideScreen from '../../components/identityProofing/IdMeGuideScreen';
import TfaActivationScreen from '../../components/identityProofing/TfaActivationScreen';
import TfaGuideScreen from '../../components/identityProofing/TfaGuideScreen';
import TfaConfirmScreen from '../../components/identityProofing/TfaConfirmScreen';
import { IDP_STATUS_CONFIG, TFA_STATUS_CONFIG } from '../../utils/idpStatus';
import { adTokens } from '../../theme/colors';

const STEP_CRUMBS = {
  1: 'Begin Identity Proofing',
  2: 'Consent Agreement',
  3: 'Disclaimer',
  4: 'Confirm Prescriber Information',
};

const TFA_ROUTES = ['tfa-activation', 'tfa-guide', 'tfa-confirm'];

/** Page title + current-section label, mirroring the web header's title and last breadcrumb item. */
function getHeading(route) {
  if (TFA_ROUTES.includes(route.name)) {
    const crumb = {
      'tfa-activation': 'Complete your Two-Factor Authentication setup',
      'tfa-guide': 'Guide',
      'tfa-confirm': 'Confirm information',
    }[route.name];
    return { title: 'Two-Factor Authentication (TFA)', crumb };
  }
  if (route.name === 'step') return { title: 'Identity Proofing', crumb: STEP_CRUMBS[route.params?.step] };
  if (route.name === 'questionnaire') return { title: 'Identity Proofing', crumb: 'Security Questions' };
  if (route.name === 'facial') return { title: 'Identity Proofing', crumb: 'Experian Facial Verification' };
  return { title: 'Identity Proofing', crumb: null };
}

function renderRoute(route) {
  switch (route.name) {
    case 'step':
      switch (route.params?.step) {
        case 1:
          return <Step1Begin />;
        case 2:
          return <Step2Consent />;
        case 3:
          return <Step3Disclaimer />;
        case 4:
          return <Step4PrescriberInfo />;
        default:
          return <OverviewScreen />;
      }
    case 'questionnaire':
      return <QuestionnaireScreen params={route.params} />;
    case 'facial':
      return <FacialStepsScreen />;
    case 'idme-guide':
      return <IdMeGuideScreen />;
    case 'tfa-activation':
      return <TfaActivationScreen />;
    case 'tfa-guide':
      return <TfaGuideScreen />;
    case 'tfa-confirm':
      return <TfaConfirmScreen />;
    default:
      return <OverviewScreen />;
  }
}

function IdentityProofingContent() {
  const navigation = useNavigation();
  const { route, canGoBack, goBack, goToOverview, replace, idpDisplayStatus, tfaDisplayStatus } = useIdentityProofing();

  // Step n goes back to step n-1 (step 1 back to the overview); everything else pops the stack.
  const handleBack = useCallback(() => {
    if (route.name === 'step') {
      const step = route.params?.step || 1;
      if (step > 1) replace('step', { step: step - 1 });
      else goToOverview();
      return;
    }
    goBack();
  }, [goBack, goToOverview, replace, route]);

  // Hardware back button: step back through the module, and only leave the screen from the overview.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!canGoBack) return false;
      handleBack();
      return true;
    });
    return () => subscription.remove();
  }, [canGoBack, handleBack]);

  // The drawer keeps this screen mounted, so a tap on "Identity Proofing" starts back at the overview, like the web link does.
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', goToOverview);
    return unsubscribe;
  }, [navigation, goToOverview]);

  const { title, crumb } = getHeading(route);

  return (
    <View style={styles.flex1}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          {canGoBack ? (
            <Pressable onPress={handleBack} hitSlop={10} style={styles.backButton} accessibilityLabel="Back">
              <MaterialCommunityIcons name="arrow-left" size={22} color={adTokens.textPrimary} />
            </Pressable>
          ) : null}
          <View style={styles.flex1}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {crumb ? (
              <Text style={styles.crumb} numberOfLines={1}>
                {crumb}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={styles.pillRow}>
          <IdpPill prefix="IDP" config={IDP_STATUS_CONFIG[idpDisplayStatus] || IDP_STATUS_CONFIG.not_started} />
          <IdpPill prefix="TFA" config={TFA_STATUS_CONFIG[tfaDisplayStatus] || TFA_STATUS_CONFIG.locked} />
        </View>
      </View>

      <View style={styles.flex1}>{renderRoute(route)}</View>
    </View>
  );
}

/**
 * Port of the Doctor "Identity Proofing" page (IdentityProofing.jsx + its
 * nested routes) from AllyDocReactAppLatest: the IDP -> TFA verification flow.
 * The web nested routes (overview, step/1-4, questionnaire, facial-steps,
 * id-me-guide, two-factor/activation|guide|confirm) are a screen stack held in
 * IdentityProofingProvider.
 */
export default function DoctorIdentityProofingPage() {
  const navigation = useNavigation();
  return (
    // This screen is a route on the doctor stack now (no drawer above it), so
    // its own navigation reaches Dashboard / Settings by name.
    <IdentityProofingProvider drawerNavigation={navigation}>
      <IdentityProofingContent />
    </IdentityProofingProvider>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: adTokens.white,
    borderBottomWidth: 1,
    borderBottomColor: adTokens.gray200,
    gap: 8,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backButton: { paddingVertical: 2 },
  title: { fontSize: 18, fontWeight: '700', color: adTokens.textPrimary },
  crumb: { fontSize: 12.5, fontWeight: '600', color: adTokens.primary, marginTop: 1 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
