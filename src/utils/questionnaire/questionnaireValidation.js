import {
  QUESTION_TYPES,
  TEXT_CHAR_LIMITS,
  getDateInputConstraints,
  getDateRangeValidationMessage,
  isDateWithinConstraints,
  getActiveTextInputOptions,
  getAnswerSupportedData,
} from "./questionnaireTypes";

const hasValue = (answer) => {
  if (!answer) return false;
  if (Array.isArray(answer.answerIds) && answer.answerIds.length > 0) return true;
  if (answer.answerId != null && answer.answerId !== "") return true;
  if (answer.answerText != null && String(answer.answerText).trim() !== "") return true;
  if (getAnswerSupportedData(answer)) return true;
  return false;
};

export const validateAnswer = (question, answer) => {
  if (question.required && !hasValue(answer)) {
    return "This question is required.";
  }

  if (!answer) return null;

  // Temperature is a Number with a fixed unit, so it gets the same range checks. Without this an
  // out-of-range temperature would pass validation and then wrongly arm - or fail to arm - a safety rule.
  const isNumericType =
    question.questionType === QUESTION_TYPES.NUMBER ||
    question.questionType === QUESTION_TYPES.TEMPERATURE;

  if (isNumericType && answer.answerText != null && answer.answerText !== "") {
    const numericValue = Number(answer.answerText);
    if (Number.isNaN(numericValue)) {
      return "Please enter a valid number.";
    }
    if (question.min != null && numericValue < question.min) {
      const unitSuffix =
        question.unit && question.unit.toLowerCase() !== "number"
          ? ` ${question.unit}`
          : "";
      return `Value must be between ${question.min} and ${question.max}${unitSuffix}`;
    }
    if (question.max != null && numericValue > question.max) {
      const unitSuffix =
        question.unit && question.unit.toLowerCase() !== "number"
          ? ` ${question.unit}`
          : "";
      return `Value must be between ${question.min} and ${question.max}${unitSuffix}`;
    }
  }

  if (
    question.questionType === QUESTION_TYPES.SHORT_TEXT ||
    question.questionType === QUESTION_TYPES.LONG_TEXT
  ) {
    const limit = TEXT_CHAR_LIMITS[question.questionType];
    const textLength = String(answer.answerText || "").length;
    if (textLength > limit) {
      return `Answer must be at most ${limit} characters.`;
    }
  }

  if (question.questionType === QUESTION_TYPES.SCALE && answer.answerText != null && answer.answerText !== "") {
    const numericValue = Number(answer.answerText);
    if (Number.isNaN(numericValue)) {
      return "Invalid selection";
    }
    if (question.scaleMin != null && numericValue < question.scaleMin) {
      return "Invalid selection";
    }
    if (question.scaleMax != null && numericValue > question.scaleMax) {
      return "Invalid selection";
    }
  }

  if (
    question.questionType === QUESTION_TYPES.DATE &&
    answer.answerText != null &&
    String(answer.answerText).trim() !== ""
  ) {
    if (!isDateWithinConstraints(question, answer.answerText)) {
      const { min, max } = getDateInputConstraints(question);
      if (min && max) {
        return `Please select a date between ${min} and ${max}.`;
      }
      return getDateRangeValidationMessage(question);
    }
  }

  if (question.questionType === QUESTION_TYPES.MULTIPLE_CHOICE && question.required) {
    if (!answer.answerIds?.length) {
      return "This question is required.";
    }
  }

  const selectedChoice = question.answers?.find(
    (item) => item.answerId === answer.answerId,
  );
  const choicesNeedingSupport = question.answers?.filter((item) => {
    if (question.questionType === QUESTION_TYPES.MULTIPLE_CHOICE) {
      return answer.answerIds?.includes(item.answerId) && item.needSupportiveData;
    }
    return item.answerId === answer.answerId && item.needSupportiveData;
  });

  const mandatorySupport = choicesNeedingSupport?.find(
    (item) => item.supportiveDataMandatory,
  );

  if (mandatorySupport && !String(answer.supportiveData || "").trim()) {
    return mandatorySupport.supportiveDataTitle
      ? `${mandatorySupport.supportiveDataTitle} is required.`
      : "Additional information is required.";
  }

  if (
    selectedChoice?.needSupportiveData &&
    selectedChoice.supportiveDataMandatory &&
    !String(answer.supportiveData || "").trim()
  ) {
    return selectedChoice.supportiveDataTitle
      ? `${selectedChoice.supportiveDataTitle} is required.`
      : "Additional information is required.";
  }

  const textInputOptions = getActiveTextInputOptions(question, answer);
  if (textInputOptions.length > 0 && !String(answer.optionDetail || "").trim()) {
    const label = textInputOptions[0]?.textInputLabel;
    return label ? `${label}` : "Please provide details for your selection.";
  }

  return null;
};
