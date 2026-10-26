import React from 'react';
import { Alert, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { adTokens } from '../theme/colors';

const REASON_FIELDS = [
  { key: 'rescheduleReason', label: 'Reschedule Reason' },
  { key: 'cancelReason', label: 'Cancel Reason' },
  { key: 'remarks', label: 'Remarks' },
];

const hasValue = (value) => (typeof value === 'string' ? value.trim().length > 0 : Boolean(value));

/**
 * Port of AllyDocReactApp/src/components/AppointmentInfoButton.jsx: only
 * renders when at least one of reschedule/cancel reason, remarks, or patient
 * feedback is actually populated. The web version shows a hover tooltip;
 * mobile has no hover, so this shows the same info via a tap -> Alert.
 */
export default function AppointmentInfoButton({
  rescheduleReason,
  cancelReason,
  remarks,
  feedbackRating,
  feedbackComment,
  size = 14,
}) {
  const values = { rescheduleReason, cancelReason, remarks };
  const entries = REASON_FIELDS.filter(({ key }) => hasValue(values[key]));
  const hasFeedback = Boolean(feedbackRating) || hasValue(feedbackComment);

  if (!entries.length && !hasFeedback) return null;

  const showInfo = () => {
    const lines = [
      ...entries.map(({ key, label }) => `${label}:\n${String(values[key]).trim()}`),
      hasFeedback
        ? `Patient Feedback${feedbackRating ? ` (${feedbackRating}/5)` : ''}:\n${
            hasValue(feedbackComment) ? String(feedbackComment).trim() : 'No comment left.'
          }`
        : null,
    ].filter(Boolean);
    Alert.alert('Appointment Details', lines.join('\n\n'));
  };

  return (
    <Pressable onPress={showInfo} hitSlop={8}>
      <Feather name="info" size={size} color={adTokens.primaryDark} />
    </Pressable>
  );
}
