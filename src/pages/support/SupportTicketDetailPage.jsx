import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import { useRoute } from '@react-navigation/native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { fetchMyTicket, replyToTicket, closeTicket, ATTACHMENT_MIME_TYPES, REPLY_MAX, checkAttachments } from '../../services/supportService';
import { formatDateTime } from '../../utils/supportFields';
import SupportStatusPill from '../../components/support/SupportStatusPill';
import AttachmentChip from '../../components/support/AttachmentChip';
import CloseTicketModal from '../../components/support/CloseTicketModal';
import { toast } from '../../utils/toast';
import { adTokens, colors } from '../../theme/colors';

const LIFECYCLE_STEPS = ['New', 'In Progress', 'Resolved', 'Closed'];

function LifecycleBar({ status }) {
  const currentIndex = LIFECYCLE_STEPS.indexOf(status);
  return (
    <View style={styles.lifecycle}>
      {LIFECYCLE_STEPS.map((step, index) => {
        const reached = index <= currentIndex;
        const isCurrent = index === currentIndex;
        return (
          <React.Fragment key={step}>
            <View style={styles.lifecycleStep}>
              <View style={[styles.lifecycleDot, reached && styles.lifecycleDotReached, isCurrent && styles.lifecycleDotCurrent]}>
                {reached && !isCurrent ? <Feather name="check" size={11} color={colors.white} /> : null}
              </View>
              <Text style={[styles.lifecycleLabel, reached && styles.lifecycleLabelReached]}>{step}</Text>
            </View>
            {index < LIFECYCLE_STEPS.length - 1 ? <View style={[styles.lifecycleLine, index < currentIndex && styles.lifecycleLineReached]} /> : null}
          </React.Fragment>
        );
      })}
    </View>
  );
}

function timelineFor(detail) {
  if (!detail) return [];
  const entries = [
    {
      id: 'original',
      badge: 'Issue Description',
      tone: 'neutral',
      author: 'You',
      message: detail.message,
      createdOn: detail.createdOn,
      attachments: detail.attachments || [],
    },
    ...(detail.replies || []).map((reply) => ({
      id: String(reply.id),
      badge: reply.authorType === 'User' ? 'Your Update' : reply.authorType === 'Admin' ? 'Support Response' : 'Update',
      tone: reply.authorType === 'User' ? 'neutral' : reply.authorType === 'Admin' ? 'success' : 'info',
      author: reply.authorType === 'User' ? 'You' : reply.authorName || 'AllyDoc Support',
      message: reply.message,
      createdOn: reply.createdOn,
      attachments: reply.attachments || [],
    })),
  ];
  if (detail.status === 'Closed') {
    entries.push({
      id: 'closed',
      badge: 'Closed',
      tone: 'dark',
      author: detail.closedBy === 'User' ? 'You' : 'AllyDoc Support',
      message: detail.closeRemarks ? `Closed this ticket. Remarks: ${detail.closeRemarks}` : 'Closed this ticket.',
      createdOn: detail.closedOn,
      attachments: [],
    });
  }
  return entries;
}

const BADGE_COLORS = {
  neutral: { bg: adTokens.gray100, color: adTokens.textSecondary },
  success: { bg: adTokens.successLight, color: adTokens.successDark },
  info: { bg: adTokens.infoLight, color: adTokens.infoDark },
  dark: { bg: '#1E293B', color: colors.white },
};

/**
 * Port of web's SupportPage.jsx conversation panel: ticket header + info + lifecycle + the full
 * timeline (original issue, every reply, and a closing entry) + reply composer, or a "closed" notice.
 */
export default function SupportTicketDetailPage() {
  const route = useRoute();
  const { ticketId } = route.params || {};

  const [detail, setDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [replyAttachments, setReplyAttachments] = useState([]);
  const [isReplying, setIsReplying] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [closeRemarks, setCloseRemarks] = useState('');
  const [isClosing, setIsClosing] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    const result = await fetchMyTicket(ticketId);
    if (result.success) setDetail(result.data);
    else toast.error(result.message || 'Could not load the ticket.');
    setIsLoading(false);
  }, [ticketId]);

  useEffect(() => {
    load();
  }, [load]);

  const timeline = useMemo(() => timelineFor(detail), [detail]);
  const isClosed = detail?.status === 'Closed';

  const pickFiles = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ATTACHMENT_MIME_TYPES, multiple: true, copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.length) return;
    const { accepted, errors } = checkAttachments(replyAttachments, result.assets);
    if (errors.length) toast.error(errors.join('\n'));
    setReplyAttachments((prev) => [...prev, ...accepted]);
  };

  const removeReplyAttachment = (index) => setReplyAttachments((prev) => prev.filter((_, i) => i !== index));

  const postUpdate = async () => {
    if (!replyText.trim() || isReplying) return;
    setIsReplying(true);
    const result = await replyToTicket(detail.id, replyText.trim(), replyAttachments);
    setIsReplying(false);
    if (!result.success) {
      toast.error(result.message || 'Could not post your update.');
      return;
    }
    setDetail(result.data);
    setReplyText('');
    setReplyAttachments([]);
    toast.success('Update sent to Support.');
  };

  const confirmClose = async () => {
    setIsClosing(true);
    const result = await closeTicket(detail.id, closeRemarks.trim());
    setIsClosing(false);
    if (!result.success) {
      toast.error(result.message || 'Could not close the ticket.');
      return;
    }
    setDetail(result.data);
    setCloseOpen(false);
    setCloseRemarks('');
    toast.success('Ticket marked as closed.');
  };

  if (isLoading && !detail) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={adTokens.primary} />
        <Text style={styles.centerText}>Loading ticket...</Text>
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={styles.center}>
        <MaterialCommunityIcons name="alert-circle-outline" size={28} color={adTokens.danger} />
        <Text style={styles.centerText}>This ticket could not be loaded.</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={styles.flex1}>
              <Text style={styles.ticketNumber}>{detail.ticketNumber}</Text>
              <Text style={styles.subject}>{detail.subject || '(no subject)'}</Text>
            </View>
            <SupportStatusPill status={detail.status} />
          </View>
          {!isClosed ? (
            <Pressable style={styles.closeButton} onPress={() => setCloseOpen(true)}>
              <Feather name="x-circle" size={14} color={adTokens.danger} />
              <Text style={styles.closeButtonText}>Mark as closed</Text>
            </Pressable>
          ) : null}

          <View style={styles.infoGrid}>
            <InfoCell label="Opened" value={formatDateTime(detail.createdOn) || '—'} />
            <InfoCell label="Last update" value={formatDateTime(detail.lastActivityOn) || '—'} />
            <InfoCell label="Attachments" value={detail.attachmentCount > 0 ? String(detail.attachmentCount) : 'None'} />
          </View>

          {detail.attachments?.length > 0 ? (
            <View style={styles.attachmentSection}>
              <Text style={styles.sectionLabel}>Screenshots / Attachments</Text>
              <View style={styles.attachmentList}>
                {detail.attachments.map((attachment) => (
                  <AttachmentChip key={attachment.id} attachment={attachment} />
                ))}
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Ticket Lifecycle</Text>
          <LifecycleBar status={detail.status} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Conversation</Text>
          <View style={styles.timeline}>
            {timeline.map((entry) => {
              const tone = BADGE_COLORS[entry.tone] || BADGE_COLORS.neutral;
              return (
                <View key={entry.id} style={styles.timelineItem}>
                  <View style={styles.timelineHeader}>
                    <View style={[styles.timelineBadge, { backgroundColor: tone.bg }]}>
                      <Text style={[styles.timelineBadgeText, { color: tone.color }]}>{entry.badge}</Text>
                    </View>
                    <Text style={styles.timelineAuthor}>{entry.author}</Text>
                    <View style={styles.flex1} />
                    <Text style={styles.timelineDate}>{formatDateTime(entry.createdOn)}</Text>
                  </View>
                  <Text style={styles.timelineMessage}>{entry.message}</Text>
                  {entry.attachments?.length > 0 ? (
                    <View style={styles.attachmentList}>
                      {entry.attachments.map((attachment) => (
                        <AttachmentChip key={attachment.id} attachment={attachment} />
                      ))}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          {isClosed ? (
            <Text style={styles.closedNotice}>This ticket is closed. Please raise a new ticket if you still need help.</Text>
          ) : (
            <>
              <View style={styles.replyHeaderRow}>
                <Text style={styles.sectionLabel}>Add an update to this ticket</Text>
                <Pressable style={styles.attachButton} onPress={pickFiles} disabled={isReplying}>
                  <MaterialCommunityIcons name="cloud-upload-outline" size={15} color={adTokens.primaryDark} />
                  <Text style={styles.attachButtonText}>Attach files</Text>
                </Pressable>
              </View>
              {replyAttachments.length > 0 ? (
                <View style={styles.attachmentList}>
                  {replyAttachments.map((file, index) => (
                    <AttachmentChip key={`${file.name}-${index}`} attachment={file} onRemove={() => removeReplyAttachment(index)} disabled={isReplying} />
                  ))}
                </View>
              ) : null}
              <TextInput
                style={[styles.input, styles.textArea]}
                value={replyText}
                onChangeText={(text) => setReplyText(text.slice(0, REPLY_MAX))}
                multiline
                textAlignVertical="top"
                placeholder="Add more details for Support..."
                placeholderTextColor={adTokens.textMuted}
                editable={!isReplying}
              />
              <View style={styles.replyFooter}>
                <Text style={styles.counter}>
                  {replyText.length}/{REPLY_MAX}
                </Text>
                <Pressable style={[styles.postButton, (!replyText.trim() || isReplying) && styles.disabled]} disabled={!replyText.trim() || isReplying} onPress={postUpdate}>
                  <Text style={styles.postButtonText}>Post update</Text>
                  {isReplying ? <ActivityIndicator size="small" color={colors.white} style={styles.spinner} /> : null}
                </Pressable>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      <CloseTicketModal
        visible={closeOpen}
        remarks={closeRemarks}
        onChangeRemarks={setCloseRemarks}
        submitting={isClosing}
        onConfirm={confirmClose}
        onClose={() => setCloseOpen(false)}
      />
    </View>
  );
}

function InfoCell({ label, value }) {
  return (
    <View style={styles.infoCell}>
      <Text style={styles.infoCellLabel}>{label}</Text>
      <Text style={styles.infoCellValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: adTokens.bgBody },
  flex1: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  centerText: { fontSize: 13.5, color: adTokens.textSecondary, textAlign: 'center' },
  content: { padding: 16, gap: 14, paddingBottom: 32 },
  card: { gap: 12, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: adTokens.border, backgroundColor: adTokens.white, ...adTokens.cardShadow },

  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  ticketNumber: { fontSize: 12, color: adTokens.textSecondary },
  subject: { fontSize: 17, fontWeight: '800', color: adTokens.textPrimary, marginTop: 2 },
  closeButton: { flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: adTokens.danger },
  closeButtonText: { fontSize: 12, fontWeight: '700', color: adTokens.danger },

  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  infoCell: { flexGrow: 1, minWidth: 100, gap: 2, padding: 10, borderRadius: 10, backgroundColor: adTokens.gray50 },
  infoCellLabel: { fontSize: 10.5, fontWeight: '700', color: adTokens.textSecondary, textTransform: 'uppercase' },
  infoCellValue: { fontSize: 13, fontWeight: '700', color: adTokens.textPrimary },

  sectionLabel: { fontSize: 12.5, fontWeight: '800', color: adTokens.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4 },
  attachmentSection: { gap: 8 },
  attachmentList: { gap: 8 },

  lifecycle: { flexDirection: 'row', alignItems: 'flex-start' },
  lifecycleStep: { alignItems: 'center', gap: 5, width: 70 },
  lifecycleDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: adTokens.gray100, alignItems: 'center', justifyContent: 'center' },
  lifecycleDotReached: { backgroundColor: adTokens.successDark },
  lifecycleDotCurrent: { backgroundColor: adTokens.primary },
  lifecycleLabel: { fontSize: 10.5, fontWeight: '600', color: adTokens.textSecondary, textAlign: 'center' },
  lifecycleLabelReached: { color: adTokens.textPrimary, fontWeight: '700' },
  lifecycleLine: { flex: 1, height: 2, marginTop: 11, backgroundColor: adTokens.border },
  lifecycleLineReached: { backgroundColor: adTokens.successDark },

  timeline: { gap: 14 },
  timelineItem: { gap: 6, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: adTokens.gray100 },
  timelineHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  timelineBadge: { paddingVertical: 2, paddingHorizontal: 9, borderRadius: 999 },
  timelineBadgeText: { fontSize: 10.5, fontWeight: '800' },
  timelineAuthor: { fontSize: 12.5, fontWeight: '700', color: adTokens.textPrimary },
  timelineDate: { fontSize: 11, color: adTokens.textSecondary },
  timelineMessage: { fontSize: 13.5, color: adTokens.textPrimary, lineHeight: 19 },

  replyHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  attachButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: adTokens.primary },
  attachButtonText: { fontSize: 11.5, fontWeight: '700', color: adTokens.primaryDark },
  input: { borderWidth: 1, borderColor: adTokens.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13.5, color: adTokens.textPrimary },
  textArea: { minHeight: 76 },
  replyFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  counter: { fontSize: 11.5, color: adTokens.textSecondary },
  postButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 16, borderRadius: 10, backgroundColor: adTokens.successDark },
  postButtonText: { fontSize: 13, fontWeight: '700', color: colors.white },
  spinner: { marginLeft: 8 },
  disabled: { opacity: 0.55 },
  closedNotice: { fontSize: 13, color: adTokens.textSecondary, fontStyle: 'italic' },
});
