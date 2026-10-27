// Field-reading helpers shared by every appointment list / detail screen (the API inconsistently
// cases some fields, so the web reads them with fallbacks - mirrored here).

/** Same consult/symptom-field preference order as AllyDocReactApp's getAppointmentSymptom. */
export function getAppointmentSymptom(item) {
  return String(
    item?.consultReason ||
      item?.ConsultReason ||
      item?.symptom ||
      item?.symtom ||
      item?.appointmentReason ||
      item?.symptonName ||
      '',
  ).trim();
}

export function getInfoButtonProps(item) {
  return {
    rescheduleReason: item?.rescheduleReason ?? item?.RescheduleReason,
    cancelReason: item?.cancelReason ?? item?.CancelReason,
    remarks: item?.remarks ?? item?.Remarks,
    feedbackRating: item?.feedbackRating ?? item?.FeedbackRating,
    feedbackComment: item?.feedbackComment ?? item?.FeedbackComment,
  };
}

export const STATUS_STYLE = {
  completed: { color: '#10B981', bg: '#D1FAE5', label: 'COMPLETED' },
  inprogress: { color: '#F59E0B', bg: '#FEF3C7', label: 'IN PROGRESS' },
  cancelled: { color: '#EF4444', bg: '#FEE2E2', label: 'CANCELLED' },
  scheduled: { color: '#3B82F6', bg: '#EFF6FF', label: 'SCHEDULED' },
  rescheduled: { color: '#8B5CF6', bg: '#EDE9FE', label: 'RE-SCHEDULED' },
};

