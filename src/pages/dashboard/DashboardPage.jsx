import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Avatar } from 'react-native-paper';
import { useAuth } from '../../hooks/useAuth';
import LegalSupportLinks from '../../components/LegalSupportLinks';

/** Placeholder landing page for roles whose own module hasn't started yet
 * (Patient/Nurse for now) - proves the auth module's full loop end-to-end.
 * The Doctor role has moved on to its own real DoctorDashboardPage. */
export default function DashboardPage({ roleLabel }) {
  const { profile, logout } = useAuth();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Avatar.Text size={64} label={(profile?.fullName || roleLabel).slice(0, 2).toUpperCase()} />
      <Text variant="headlineSmall" style={styles.heading}>
        {roleLabel} Dashboard
      </Text>
      <Text variant="bodyMedium" style={styles.subtext}>
        Signed in as {profile?.fullName || profile?.email || 'Unknown user'}
      </Text>
      {profile?.roleName ? (
        <Text variant="bodySmall" style={styles.meta}>
          Role: {profile.roleName}
        </Text>
      ) : null}
      <Button mode="outlined" onPress={() => logout()} style={styles.logoutButton}>
        Log out
      </Button>

      <View style={styles.legalSection}>
        <LegalSupportLinks />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, alignItems: 'center', padding: 24, paddingTop: 48, gap: 8 },
  heading: { marginTop: 16 },
  subtext: { color: '#6B7280' },
  meta: { color: '#9CA3AF' },
  logoutButton: { marginTop: 24, marginBottom: 32 },
  legalSection: { width: '100%' },
});
