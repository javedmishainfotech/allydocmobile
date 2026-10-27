export const QUESTION_TYPES = {
  SINGLE_CHOICE: "single_choice",
  MULTIPLE_CHOICE: "multiple_choice",
  DROPDOWN: "dropdown",
  YES_NO: "yes_no",
  SHORT_TEXT: "short_text",
  LONG_TEXT: "long_text",
  NUMBER: "number",
  SCALE: "scale",
  DATE: "date",
  TEMPERATURE: "temperature",
  FILE_UPLOAD: "file_upload",
};

/**
 * Legacy per-option outcome. Predates answer actions and safety rules and is still configured on
 * existing questions, so it keeps being evaluated alongside them.
 */
export const OUTCOME_TYPES = {
  CONTINUE: "continue",
  ALLOW_BOOKING: "allow_booking",
  BLOCK_BOOKING: "block_booking",
};

/**
 * What a question's configuration says should happen after a given answer. Mirrors the admin portal's
 * action types; an unknown value falls through to continuing, so a newer admin build cannot strand a
 * patient mid-assessment.
 */
export const ACTION_TYPES = {
  CONTINUE: "continue",
  FOLLOW_UP: "follow-up",
  INFO_MESSAGE: "info-message",
  WARNING: "warning",
  FLAG_REVIEW: "flag-review",
  STOP_ASSESSMENT: "stop-assessment",
  PREVENT_BOOKING: "prevent-booking",
  ALLOW_BOOKING: "allow-booking",
};

/** What a triggered safety rule does to the booking. */
export const BOOKING_BEHAVIOR = {
  CONTINUE: "continue",
  REVIEW: "review",
  PREVENT: "prevent",
};

/** Allowed dateRange values for Date question types. */
export const DATE_RANGE_TYPES = {
  ANY: "any",
  PAST: "past",
  FUTURE: "future",
};

const formatInputDate = (date) => {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const startOfLocalDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const pickMinDate = (...values) => {
  const valid = values.filter(Boolean).sort();
  return valid.length ? valid[valid.length - 1] : null;
};

const pickMaxDate = (...values) => {
  const valid = values.filter(Boolean).sort();
  return valid.length ? valid[0] : null;
};

/**
 * Resolve min/max for HTML date inputs from dateRange + optional minDate/maxDate.
 * - any: no dateRange restriction (minDate/maxDate still apply)
 * - past: only dates before today
 * - future: only dates after today
 */
export const getDateInputConstraints = (question) => {
  if (!question) return { min: null, max: null };

  const range = String(question.dateRange || DATE_RANGE_TYPES.ANY)
    .toLowerCase()
    .trim();
  const today = startOfLocalDay();
  const yesterday = formatInputDate(addDays(today, -1));
  const tomorrow = formatInputDate(addDays(today, 1));

  let min = question.minDate || null;
  let max = question.maxDate || null;

  if (range === DATE_RANGE_TYPES.PAST) {
    max = pickMaxDate(max, yesterday);
  } else if (range === DATE_RANGE_TYPES.FUTURE) {
    min = pickMinDate(min, tomorrow);
  }

  return { min, max };
};

export const getDateRangeValidationMessage = (question) => {
  const range = String(question?.dateRange || DATE_RANGE_TYPES.ANY)
    .toLowerCase()
    .trim();

  if (range === DATE_RANGE_TYPES.PAST) {
    return "Please select a past date.";
  }
  if (range === DATE_RANGE_TYPES.FUTURE) {
    return "Please select a future date.";
  }
  return "Please select a valid date.";
};

export const isDateWithinConstraints = (question, answerText) => {
  const value = String(answerText || "").trim();
  if (!value) return true;

  const { min, max } = getDateInputConstraints(question);
  if (min && value < min) return false;
  if (max && value > max) return false;
  return true;
};

/** Options currently selected that require inline text (hasTextInput / + List). */
export const getActiveTextInputOptions = (question, answer) => {
  if (!question?.answers?.length || !answer) return [];

  if (question.questionType === QUESTION_TYPES.MULTIPLE_CHOICE) {
    const ids = answer.answerIds || [];
    return question.answers.filter(
      (item) => ids.includes(item.answerId) && item.hasTextInput,
    );
  }

  const selected = question.answers.find(
    (item) => item.answerId === answer.answerId,
  );
  return selected?.hasTextInput ? [selected] : [];
};

/** Supported detail text sent as supportedData in the legacy payload. */
export const getAnswerSupportedData = (answer) =>
  String(answer?.optionDetail || answer?.supportiveData || "").trim();

const TYPE_ALIASES = {
  "single choice": QUESTION_TYPES.SINGLE_CHOICE,
  "one-option": QUESTION_TYPES.DROPDOWN,
  "one option": QUESTION_TYPES.SINGLE_CHOICE,
  "multiple choice": QUESTION_TYPES.MULTIPLE_CHOICE,
  "multi-option": QUESTION_TYPES.MULTIPLE_CHOICE,
  "multi option": QUESTION_TYPES.MULTIPLE_CHOICE,
  dropdown: QUESTION_TYPES.DROPDOWN,
  "yes / no": QUESTION_TYPES.YES_NO,
  "yes/no": QUESTION_TYPES.YES_NO,
  yesno: QUESTION_TYPES.YES_NO,
  "short text": QUESTION_TYPES.SHORT_TEXT,
  text: QUESTION_TYPES.SHORT_TEXT,
  match: QUESTION_TYPES.SHORT_TEXT,
  "long text": QUESTION_TYPES.LONG_TEXT,
  number: QUESTION_TYPES.NUMBER,
  scale: QUESTION_TYPES.SCALE,
  date: QUESTION_TYPES.DATE,
  temperature: QUESTION_TYPES.TEMPERATURE,
  "file upload": QUESTION_TYPES.FILE_UPLOAD,
  "file/image upload": QUESTION_TYPES.FILE_UPLOAD,
  fileupload: QUESTION_TYPES.FILE_UPLOAD,
};

const emptyToNull = (value) => {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
};

const toNumberOrNull = (value) => {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const toBoolean = (value) => value === true || value === "true" || value === 1;

export const normalizeQuestionType = (questionType) => {
  const normalized = questionType?.toString().toLowerCase().trim() || "";
  return TYPE_ALIASES[normalized] || QUESTION_TYPES.SHORT_TEXT;
};

const normalizeAnswer = (answer) => ({
  answerId: answer.answerId,
  answer: answer.answer || "",
  // Stable internal value that rules, actions and safety triggers match on. Older payloads have no
  // value, so it falls back to a slug of the label rather than being left blank - a blank would make
  // every rule silently fail to match.
  value: emptyToNull(answer.value ?? answer.Value)
    || String(answer.answer || "").trim().toLowerCase().replace(/\s+/g, "-").replace(/\//g, "-"),
  hasTextInput: toBoolean(answer.hasTextInput ?? answer.HasTextInput),
  textInputLabel: emptyToNull(answer.textInputLabel ?? answer.TextInputLabel),
  needSupportiveData: toBoolean(answer.needSupportiveData),
  supportiveDataMandatory: toBoolean(answer.supportiveDataMandatory),
  supportiveDataType: emptyToNull(answer.supportiveDataType),
  options: Array.isArray(answer.options) ? answer.options : [],
  supportiveDataTitle: emptyToNull(answer.supportiveDataTitle),
  outcome:
    emptyToNull(answer.outcome) ||
    emptyToNull(answer.Outcome) ||
    OUTCOME_TYPES.CONTINUE,
  outcomeMessage:
    emptyToNull(answer.outcomeMessage) || emptyToNull(answer.OutcomeMessage),
});

export const normalizeQuestion = (question) => ({
  questionId: question.questionId,
  question: question.question || "",
  questionType: normalizeQuestionType(question.questionType),
  questionSequence: question.questionSequence ?? 0,
  helpText: emptyToNull(question.helpText),
  required: toBoolean(question.isRequired ?? question.required),
  isPublished: question.isPublished !== false,
  min: toNumberOrNull(question.min),
  max: toNumberOrNull(question.max),
  unit: emptyToNull(question.unit),
  scaleMin: toNumberOrNull(question.scaleMin),
  scaleMax: toNumberOrNull(question.scaleMax),
  minLabel: emptyToNull(question.minLabel),
  maxLabel: emptyToNull(question.maxLabel),
  decimalsAllowed: toBoolean(question.decimalsAllowed),
  dateRange: emptyToNull(question.dateRange)?.toLowerCase() || null,
  minDate: emptyToNull(question.minDate),
  maxDate: emptyToNull(question.maxDate),
  section: emptyToNull(question.section),
  conditionalLogic: Array.isArray(question.conditionalLogic)
    ? question.conditionalLogic.map((rule) => ({
      sourceQuestionId: rule.sourceQuestionId,
      operator: emptyToNull(rule.operator) || "equals",
      value: emptyToNull(rule.value),
    }))
    : [],
  answerActions: Array.isArray(question.answerActions)
    ? question.answerActions.map((action) => ({
      triggerValue: emptyToNull(action.triggerValue),
      actionType: emptyToNull(action.actionType) || ACTION_TYPES.CONTINUE,
      message: emptyToNull(action.message),
    }))
    : [],
  // Null unless the admin armed it, so callers can test for presence.
  safetyRule: question.safetyRule
    ? {
      severity: emptyToNull(question.safetyRule.severity) || "warning",
      message: emptyToNull(question.safetyRule.message),
      bookingBehavior: emptyToNull(question.safetyRule.bookingBehavior) || BOOKING_BEHAVIOR.CONTINUE,
      triggerValue: emptyToNull(question.safetyRule.triggerValue),
    }
    : null,
  answers: Array.isArray(question.answers)
    ? question.answers.map(normalizeAnswer)
    : [],
});

/** Assessment-level settings; defaults match how the flow behaved before they existed. */
export const normalizeSettings = (settings) => ({
  diseaseId: settings?.diseaseId ?? null,
  patientDisplayName: settings?.patientDisplayName || "",
  shortDescription: settings?.shortDescription || "",
  assessmentTitle: settings?.assessmentTitle || "Health Questionnaire",
  patientInstructions: settings?.patientInstructions || "",
  estimatedTime: settings?.estimatedTime || "",
  assessmentRequired: toBoolean(settings?.assessmentRequired),
  allowGoBack: settings?.allowGoBack !== false,
  showProgress: settings?.showProgress !== false,
  autosave: toBoolean(settings?.autosave),
});

export const sortAndNormalizeQuestions = (questions = []) =>
  [...questions]
    .filter((question) => question.isPublished !== false)
    .map(normalizeQuestion)
    .sort((a, b) => a.questionSequence - b.questionSequence);

const SINGLE_SELECT_TYPES = new Set([
  QUESTION_TYPES.SINGLE_CHOICE,
  QUESTION_TYPES.DROPDOWN,
  QUESTION_TYPES.YES_NO,
]);

/**
 * Resolve survey outcome from the patient's single selected answer.
 * Only single_choice, dropdown, and yes_no evaluate per-answer outcomes.
 * All other types always continue.
 */
export const resolveEffectiveOutcome = (question, answerValue) => {
  const continueResult = {
    outcome: OUTCOME_TYPES.CONTINUE,
    outcomeMessage: null,
  };

  if (!question || !SINGLE_SELECT_TYPES.has(question.questionType)) {
    return continueResult;
  }

  const selected = (question.answers || []).find(
    (item) => item.answerId === answerValue?.answerId,
  );
  if (!selected) return continueResult;

  return {
    outcome: selected.outcome || OUTCOME_TYPES.CONTINUE,
    outcomeMessage: selected.outcomeMessage,
  };
};

export const TEXT_CHAR_LIMITS = {
  [QUESTION_TYPES.SHORT_TEXT]: 150,
  [QUESTION_TYPES.LONG_TEXT]: 500,
};

/* ══════════════════════════════════════════════════ assessment rule evaluation ══════════ */

/**
 * The option values the patient's answer represents.
 *
 * Answers are stored by id (`answerId` / `answerIds`) while rules, actions and safety triggers are
 * configured against the stable option value, so the ids are resolved back through the question's own
 * option list. Typed answers have no options, so their raw text is used.
 */
export const answerSelectedValues = (question, answer) => {
  if (!question || !answer) return [];

  const valueFor = (id) =>
    question.answers?.find((opt) => opt.answerId === id)?.value || "";

  if (Array.isArray(answer.answerIds) && answer.answerIds.length) {
    return answer.answerIds.map(valueFor).filter(Boolean);
  }
  if (answer.answerId != null) {
    const v = valueFor(answer.answerId);
    return v ? [v] : [];
  }
  if (answer.answerText != null && String(answer.answerText).trim() !== "") {
    return [String(answer.answerText)];
  }
  return [];
};

/** True when the patient has given this question something. */
export const hasAnswer = (question, answer) => {
  if (!answer) return false;
  if (Array.isArray(answer.answerIds)) return answer.answerIds.length > 0;
  if (answer.answerId != null) return true;
  return String(answer.answerText ?? "").trim() !== "";
};

const scalarOf = (answer) => {
  if (answer?.answerText != null && String(answer.answerText).trim() !== "") {
    return Number(answer.answerText);
  }
  return Number.NaN;
};

/**
 * A question is shown only when every one of its rules passes - the same AND semantics the admin
 * screens document. A rule whose source question is unanswered fails, so a dependent question stays
 * hidden until the answer it depends on exists.
 */
export const isQuestionVisible = (question, answers, questionsById) => {
  const rules = question.conditionalLogic ?? [];
  if (rules.length === 0) return true;

  return rules.every((rule) => {
    const source = questionsById?.[rule.sourceQuestionId];
    const sourceAnswer = answers?.[rule.sourceQuestionId];
    if (!source || !hasAnswer(source, sourceAnswer)) return false;

    const values = answerSelectedValues(source, sourceAnswer).map((v) => v.toLowerCase());
    const target = String(rule.value ?? "").toLowerCase();
    const scalar = scalarOf(sourceAnswer);

    switch (rule.operator) {
      case "equals": return values.includes(target);
      case "not-equals": return !values.includes(target);
      case "contains": return values.some((v) => v.includes(target));
      case "gt": return !Number.isNaN(scalar) && scalar > Number(rule.value);
      case "lt": return !Number.isNaN(scalar) && scalar < Number(rule.value);
      default: return true;
    }
  });
};

/** The visible questions for the answers given so far, in sequence order. */
export const visibleQuestions = (questions, answers) => {
  const byId = {};
  for (const q of questions) byId[q.questionId] = q;
  return questions.filter((q) => isQuestionVisible(q, answers, byId));
};

/**
 * The first answer action the patient's answer triggers, or null. Actions are matched on option value,
 * so a reworded label cannot break one.
 */
export const resolveAnswerAction = (question, answer) => {
  const actions = question?.answerActions ?? [];
  if (actions.length === 0) return null;

  const given = answerSelectedValues(question, answer).map((v) => v.toLowerCase());
  if (given.length === 0) return null;

  return actions.find((action) => {
    const trigger = String(action.triggerValue ?? "").toLowerCase();
    return trigger && given.includes(trigger);
  }) ?? null;
};

/**
 * The question's safety rule if the answer arms it, otherwise null.
 *
 * The trigger is a comma-separated list of option values and fires on any overlap, which is what lets
 * one rule cover yes/no, single-choice and multi-select alike.
 */
export const resolveSafetyRule = (question, answer) => {
  const rule = question?.safetyRule;
  if (!rule?.triggerValue) return null;

  const triggers = rule.triggerValue
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  if (triggers.length === 0) return null;

  const given = answerSelectedValues(question, answer).map((v) => v.toLowerCase());
  return given.some((v) => triggers.includes(v)) ? rule : null;
};
