import React from 'react';
import { Modal, View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { adTokens } from '../theme/colors';

/** Port of the inline questionnaire modal in AllyDocReactApp's ManageAppointments.jsx
 * - a flat # | Question | Answer list, distinct from the Dashboard's collapsible
 * ConsultQuestionnaireItem version. */
export default function QuestionnaireModal({ visible, questionAnswerList, onClose }) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Questionnaire</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={20} color={adTokens.textSecondary} />
            </Pressable>
          </View>
          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            <View style={styles.headerRow}>
              <Text style={[styles.headerCell, styles.indexCol]}>#</Text>
              <Text style={[styles.headerCell, styles.flex1]}>Question</Text>
              <Text style={[styles.headerCell, styles.flex1]}>Answer</Text>
            </View>
            {(questionAnswerList || []).map((qa, index) => (
              <View key={index} style={styles.row}>
                <Text style={[styles.indexText, styles.indexCol]}>{index + 1}.</Text>
                <Text style={[styles.questionText, styles.flex1]}>{qa.question}</Text>
                <Text style={[styles.answerText, styles.flex1]}>{qa.answer}</Text>
              </View>
            ))}
          </ScrollView>
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.18)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: adTokens.white,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 16,
    maxHeight: '80%',
  },
  flex1: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: adTokens.border,
  },
  title: { fontSize: 16, fontWeight: '700', color: adTokens.textPrimary },
  body: { paddingHorizontal: 18 },
  bodyContent: { paddingVertical: 14 },
  headerRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  headerCell: { fontSize: 11.5, fontWeight: '700', color: adTokens.textSecondary },
  indexCol: { width: 22 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  indexText: { fontSize: 13, color: adTokens.textMuted },
  questionText: { fontSize: 13, color: adTokens.textPrimary },
  answerText: { fontSize: 13, fontWeight: '600', color: adTokens.primaryDark },
  closeButton: {
    margin: 18,
    alignSelf: 'flex-end',
    paddingVertical: 9,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: adTokens.border,
  },
  closeButtonText: { fontSize: 13.5, fontWeight: '600', color: adTokens.textSecondary },
});
