import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { SEVERITIES } from '../../constants/assessmentConstants';
import { adTokens } from '../../theme/colors';

/** Port of AllyDocReactApp/src/components/Disease/QuestionCard.jsx - one question in the
 * assessment builder's list, with chips summarizing its logic/safety/follow-up config and
 * row actions. Reordering uses up/down arrows here instead of web's HTML5 drag-and-drop -
 * there's no drag library in this project, and arrows are the standard native substitute. */
export default function QuestionCard({
  question,
  index,
  onEdit,
  onView,
  onDelete,
  onDuplicate,
  onTogglePublish,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  busy,
}) {
  const logicCount = question.conditionalLogic?.length ?? 0;
  const actionCount = question.answerActions?.length ?? 0;
  const safety = question.safetyRule?.enabled ? question.safetyRule : null;
  const severity = safety ? SEVERITIES.find((s) => s.value === safety.severity) : null;
  const isPublished = question.status === 'published';
  const blockedBy = question.dependentRuleCount ?? 0;

  return (
    <View style={[styles.card, safety?.bookingBehavior === 'prevent' && styles.cardBlocking]}>
      <View style={styles.reorderCol}>
        <Pressable
          style={[styles.reorderBtn, !canMoveUp && styles.reorderBtnDisabled]}
          onPress={onMoveUp}
          disabled={!canMoveUp}
          hitSlop={6}
        >
          <Feather name="chevron-up" size={16} color={canMoveUp ? adTokens.textSecondary : adTokens.textMuted} />
        </Pressable>
        <Text style={styles.num}>{index + 1}</Text>
        <Pressable
          style={[styles.reorderBtn, !canMoveDown && styles.reorderBtnDisabled]}
          onPress={onMoveDown}
          disabled={!canMoveDown}
          hitSlop={6}
        >
          <Feather name="chevron-down" size={16} color={canMoveDown ? adTokens.textSecondary : adTokens.textMuted} />
        </Pressable>
      </View>

      <View style={styles.body}>
        <View style={styles.chipsRow}>
          <View style={styles.chip}>
            <Text style={styles.chipText}>{question.type}</Text>
          </View>
          {question.required ? (
            <View style={[styles.chip, styles.chipRequired]}>
              <Text style={[styles.chipText, styles.chipRequiredText]}>Required</Text>
            </View>
          ) : null}
          <View style={[styles.chip, isPublished ? styles.chipPublished : styles.chipDraft]}>
            <Text style={[styles.chipText, isPublished ? styles.chipPublishedText : styles.chipDraftText]}>
              {isPublished ? 'Published' : 'Draft'}
            </Text>
          </View>
        </View>

        <Text style={styles.text}>{question.text}</Text>
        {question.helpText ? <Text style={styles.help}>{question.helpText}</Text> : null}

        {(logicCount > 0 || safety || (actionCount > 0 && !safety)) && (
          <View style={styles.indicatorsRow}>
            {logicCount > 0 && (
              <View style={[styles.chip, styles.chipLogic]}>
                <MaterialCommunityIcons name="source-branch" size={11} color={adTokens.infoDark} />
                <Text style={[styles.chipText, styles.chipLogicText]}>
                  Logic: {logicCount} rule{logicCount === 1 ? '' : 's'}
                </Text>
              </View>
            )}
            {safety && (
              <View style={[styles.chip, styles.chipSafety]}>
                <MaterialCommunityIcons name="alarm-light-outline" size={11} color={adTokens.dangerDark} />
                <Text style={[styles.chipText, styles.chipSafetyText]}>Safety Rule</Text>
              </View>
            )}
            {actionCount > 0 && !safety && (
              <View style={[styles.chip, styles.chipFollowup]}>
                <Feather name="corner-down-right" size={11} color={adTokens.primaryDark} />
                <Text style={[styles.chipText, styles.chipFollowupText]}>Follow-Up</Text>
              </View>
            )}
          </View>
        )}

        {safety?.bookingBehavior === 'prevent' && (
          <Text style={styles.blockingNote}>
            Answering <Text style={styles.blockingNoteStrong}>{safety.triggerValue}</Text> stops the
            assessment and prevents booking.
          </Text>
        )}

        <View style={styles.actionsRow}>
          <Pressable style={styles.actionBtn} onPress={() => onDuplicate?.(question)} disabled={busy} hitSlop={6}>
            {busy ? (
              <ActivityIndicator size={14} color={adTokens.textSecondary} />
            ) : (
              <Feather name="copy" size={16} color={adTokens.textSecondary} />
            )}
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={() => onView?.(question)} hitSlop={6}>
            <Feather name="eye" size={16} color={adTokens.textSecondary} />
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={() => onTogglePublish?.(question)} disabled={busy} hitSlop={6}>
            <Feather name={isPublished ? 'file-text' : 'upload-cloud'} size={16} color={isPublished ? adTokens.warningDark : adTokens.successDark} />
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={() => onEdit?.(question)} hitSlop={6}>
            <Feather name="edit-2" size={15} color={adTokens.primaryDark} />
          </Pressable>
          <Pressable
            style={styles.actionBtn}
            onPress={() => onDelete?.(question)}
            disabled={busy || blockedBy > 0}
            hitSlop={6}
          >
            <Feather name="trash-2" size={16} color={blockedBy > 0 ? adTokens.textMuted : adTokens.dangerDark} />
          </Pressable>
        </View>
        {blockedBy > 0 && (
          <Text style={styles.blockedHint}>
            Used by {blockedBy} conditional rule{blockedBy === 1 ? '' : 's'} - update those first to delete.
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: adTokens.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: adTokens.border,
    padding: 12,
    marginBottom: 10,
    ...adTokens.cardShadow,
  },
  cardBlocking: { borderColor: adTokens.danger, borderWidth: 1.5 },
  reorderCol: { alignItems: 'center', width: 28, gap: 2 },
  reorderBtn: { padding: 2 },
  reorderBtnDisabled: { opacity: 0.35 },
  num: { fontSize: 12, fontWeight: '700', color: adTokens.textMuted },
  body: { flex: 1, gap: 6 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: adTokens.gray100,
  },
  chipText: { fontSize: 10.5, fontWeight: '700', color: adTokens.textSecondary },
  chipRequired: { backgroundColor: adTokens.dangerTint },
  chipRequiredText: { color: adTokens.dangerDark },
  chipPublished: { backgroundColor: adTokens.successTint },
  chipPublishedText: { color: adTokens.successDark },
  chipDraft: { backgroundColor: adTokens.warningTint },
  chipDraftText: { color: adTokens.warningDark },
  chipLogic: { backgroundColor: adTokens.infoTint },
  chipLogicText: { color: adTokens.infoDark },
  chipSafety: { backgroundColor: adTokens.dangerTint },
  chipSafetyText: { color: adTokens.dangerDark },
  chipFollowup: { backgroundColor: adTokens.primaryTint },
  chipFollowupText: { color: adTokens.primaryDark },
  text: { fontSize: 13.5, fontWeight: '600', color: adTokens.textPrimary },
  help: { fontSize: 12, color: adTokens.textSecondary },
  indicatorsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  blockingNote: { fontSize: 11.5, color: adTokens.dangerDark },
  blockingNoteStrong: { fontWeight: '700' },
  actionsRow: { flexDirection: 'row', gap: 14, marginTop: 4 },
  actionBtn: { padding: 2 },
  blockedHint: { fontSize: 11, color: adTokens.textMuted, fontStyle: 'italic' },
});
