import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import LegalSupportLinks from '../../components/LegalSupportLinks';
import { useDockInset } from '../../navigation/DockInsetContext';

export default function DoctorSupportPage() {
  const dockInset = useDockInset();
  return (
    <ScrollView contentContainerStyle={[styles.container, { paddingBottom: 32 + dockInset }]}>
      <LegalSupportLinks showHeading={false} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
});
