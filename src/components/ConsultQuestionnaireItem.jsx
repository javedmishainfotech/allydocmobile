import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { adTokens } from '../theme/colors';

/**
 * Port of AllyDocReactApp/src/components/ConsultQuestionnaire/ConsultQuestionnaireItem.jsx.
 * `record` is flat: { question, answer } - answer is always a single plain
 * value (no multi-select/checkbox branching exists in the web version either).
 */
export default function ConsultQuestionnaireItem({ record, index, isOpen, onToggle }) {
  return (
    <View style={styles.item}>
      <Pressable style={styles.header} onPress={onToggle}>
        <View style={styles.indexBadge}>
          <Text style={styles.indexBadgeText}>{index + 1}</Text>
        </View>
        <Text style={styles.question} numberOfLines={isOpen ? undefined : 1}>
          {record?.question}
        </Text>
        <Feather
          name={isOpen ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={adTokens.white}
        />
      </Pressable>
      {isOpen ? (
        <View style={styles.answerPanel}>
          <Feather name="check" size={13} color={adTokens.successDark} />
          <Text style={styles.answerText}>{record?.answer || '—'}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    borderWidth: 1,
    borderColor: adTokens.border,
    borderRadius: 10,
    marginBottom: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    backgroundColor: '#1E3A5F',
  },
  indexBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: adTokens.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexBadgeText: { fontSize: 11, fontWeight: '700', color: adTokens.white },
  question: { flex: 1, fontSize: 13, fontWeight: '600', color: adTokens.white },
  answerPanel: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: adTokens.border,
  },
  answerText: { flex: 1, fontSize: 13, color: adTokens.textPrimary },
});
