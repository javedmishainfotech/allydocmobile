import React from 'react';
import { Modal, View, Text, StyleSheet } from 'react-native';
import Toast from 'react-native-toast-message';
import { IdpButton } from './IdpUi';
import { adTokens } from '../../theme/colors';

/** Port of AttemptModal in AllyDocReactApp utils/Modals/Modals.jsx - blocking, closes only via "Try Again". */
export default function AttemptModal({ options, onClose }) {
  if (!options) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Toast />
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Attempt {options.attempt}</Text>
          </View>
          <Text style={styles.header}>{options.header}</Text>
          <Text style={styles.content}>{options.content}</Text>
          <IdpButton label="Try Again" variant="primary" onPress={onClose} style={styles.button} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: adTokens.white,
    borderRadius: 14,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#B91C1C' },
  header: { fontSize: 16, fontWeight: '700', color: adTokens.textPrimary, marginTop: 14, textAlign: 'center' },
  content: { fontSize: 14, lineHeight: 21, color: '#374151', marginTop: 10, textAlign: 'center' },
  button: { marginTop: 20, alignSelf: 'stretch' },
});
