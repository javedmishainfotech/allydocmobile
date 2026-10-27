import { QUESTION_TYPES, getAnswerSupportedData } from "./questionnaireTypes";

const getChoiceLabel = (question, answerId) =>
  question.answers?.find((item) => item.answerId === answerId)?.answer || "";

export const formatLegacyAnswerString = (question, answer) => {
  if (!answer) return "";

  switch (question.questionType) {
    case QUESTION_TYPES.SINGLE_CHOICE:
    case QUESTION_TYPES.DROPDOWN:
    case QUESTION_TYPES.YES_NO:
      if (answer.answerId != null) {
        return getChoiceLabel(question, answer.answerId) || answer.answerText || "";
      }
      return answer.answerText || "";
    case QUESTION_TYPES.MULTIPLE_CHOICE:
      if (answer.answerIds?.length) {
        return answer.answerIds
          .map((id) => getChoiceLabel(question, id))
          .filter(Boolean)
          .join(", ");
      }
      return answer.answerText || "";
    default:
      return answer.answerText || "";
  }
};

export const mapAnswersToLegacyPayload = ({
  questionnaireId,
  patientId,
  questions,
  answers,
  endComments,
}) => {
  const answeredQuestions = questions.filter((question) => {
    const answer = answers[question.questionId];
    return answer && formatLegacyAnswerString(question, answer);
  });

  return {
    questionnaireId,
    patientId,
    questions: answeredQuestions.map((question) => ({
      questionSequence: question.questionSequence,
      question: question.question,
      answer: formatLegacyAnswerString(question, answers[question.questionId]),
      supportedData: getAnswerSupportedData(answers[question.questionId]),
    })),
    ...(endComments ? { endComments } : {}),
  };
};
