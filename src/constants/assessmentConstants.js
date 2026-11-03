/**
 * Port of AllyDocReactApp/src/components/Disease/assessmentConstants.js - the admin assessment
 * builder's vocabulary. Every string value here is persisted as-is by the API (same contract the
 * web app's repository validates against), so they must stay byte-identical to web even though the
 * labels/icons are native.
 */

export const QUESTION_TYPES = [
  { key: 'Single Choice', label: 'Single choice', icon: 'radiobox-marked' },
  { key: 'Multiple Choice', label: 'Multiple choice', icon: 'checkbox-marked-outline' },
  { key: 'Yes / No', label: 'Yes / No', icon: 'toggle-switch-outline' },
  { key: 'Short Text', label: 'Short text', icon: 'minus' },
  { key: 'Long Text', label: 'Long text', icon: 'text-long' },
  { key: 'Number', label: 'Number', icon: 'pound' },
  { key: 'Scale', label: 'Scale', icon: 'arrow-left-right' },
  { key: 'Dropdown', label: 'Dropdown', icon: 'menu-down' },
  { key: 'Date', label: 'Date', icon: 'calendar-outline' },
  { key: 'Temperature', label: 'Temperature', icon: 'thermometer' },
  { key: 'File Upload', label: 'File upload', icon: 'upload-outline' },
];

/** Types whose answers the patient picks from a list, so they need an option editor. */
export const OPTION_TYPES = ['Single Choice', 'Multiple Choice', 'Yes / No', 'Dropdown'];

/**
 * Only these evaluate a per-option outcome. Multiple choice and typed answers always continue -
 * the API enforces the same rule, so the UI hides the control rather than letting it be ignored.
 */
export const OUTCOME_TYPES = ['Single Choice', 'Yes / No', 'Dropdown'];

export const isOptionType = (type) => OPTION_TYPES.includes(type);
export const supportsOutcome = (type) => OUTCOME_TYPES.includes(type);

/** Types with their own numeric bounds panel. Temperature is a Number with a unit of degF / degC. */
export const NUMERIC_TYPES = ['Number', 'Temperature'];

export const CONDITIONAL_OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not-equals', label: 'Does not equal' },
  { value: 'contains', label: 'Contains' },
  { value: 'gt', label: 'Greater than' },
  { value: 'lt', label: 'Less than' },
];

/**
 * What happens after a specific answer. Deliberately worded as workflow behaviour, never as
 * diagnosis - this is a self-assessment tool, not a diagnostic engine.
 */
export const ACTION_TYPES = [
  { value: 'continue', label: 'Continue Normally' },
  { value: 'follow-up', label: 'Show Follow-Up Question' },
  { value: 'info-message', label: 'Show Information Message' },
  { value: 'warning', label: 'Show Warning' },
  { value: 'flag-review', label: 'Flag for Provider Review' },
  { value: 'stop-assessment', label: 'Stop Assessment' },
  { value: 'prevent-booking', label: 'Prevent Appointment Booking' },
  { value: 'allow-booking', label: 'Allow Appointment Booking' },
];

/** Action types the API requires a patient message for. */
export const ACTIONS_NEEDING_MESSAGE = ['info-message', 'warning', 'stop-assessment', 'prevent-booking'];

export const SEVERITIES = [
  { value: 'information', label: 'Information' },
  { value: 'warning', label: 'Warning' },
  { value: 'high-risk', label: 'High Risk' },
  { value: 'emergency', label: 'Emergency' },
];

export const BOOKING_BEHAVIORS = [
  { value: 'continue', label: 'Continue Booking' },
  { value: 'review', label: 'Require Provider Review' },
  { value: 'prevent', label: 'Prevent Booking' },
];

export const DATE_RANGES = [
  { value: 'any', label: 'Any Date' },
  { value: 'past', label: 'Past Dates Only' },
  { value: 'future', label: 'Future Dates Only' },
];

export const ASSESSMENT_STATUS = {
  enabled: { label: 'Self-Assessment Enabled' },
  draft: { label: 'Draft' },
  disabled: { label: 'Self-Assessment Disabled' },
};

/**
 * Internal value for an option: what the admin typed, else a slug of the label. Conditional rules
 * and answer actions match on this, so it must survive a label being reworded.
 */
export const optionValueFor = (opt) => {
  if (opt?.value?.trim()) return opt.value.trim();
  return (opt?.text ?? '').trim().toLowerCase().replace(/\s+/g, '-').replace(/\//g, '-').slice(0, 200);
};

export const createOption = (index = 0) => ({
  answerId: null,
  text: `Option ${index + 1}`,
  value: '',
  hasTextInput: false,
  textInputLabel: '',
  outcome: 'continue',
  outcomeMessage: '',
});

/** Yes / No questions get their two options created for them, with labels still editable. */
export const createYesNoOptions = () => [
  { answerId: null, text: 'Yes', value: 'yes', hasTextInput: false, textInputLabel: '', outcome: 'continue', outcomeMessage: '' },
  { answerId: null, text: 'No', value: 'no', hasTextInput: false, textInputLabel: '', outcome: 'continue', outcomeMessage: '' },
];
