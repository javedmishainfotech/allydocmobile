import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Platform, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { IdpSelectField } from '../identityProofing/IdpUi';
import DatePickerSheet from '../DatePickerSheet';
import { localDateOnlyToApiString, formatDateLabel } from '../../utils/dateOnly';
import {
  QUESTION_TYPES,
  TEXT_CHAR_LIMITS,
  getActiveTextInputOptions,
  getDateInputConstraints,
} from '../../utils/questionnaire/questionnaireTypes';
import { ErrorText } from './BookingUi';
import { adTokens } from '../../theme/colors';

// Native ports of the web's questionnaire/types/* inputs. Every input gets `{ question, value,
// onChange, error }`; `value` is the answer object ({ answerId, answerIds, answerText,
// optionDetail, supportiveData }) and `onChange` receives the next answer object - the exact shapes
// the web components produce, so the shared validation / payload code works on them unchanged.

const MAX_FILE_BYTES = 5 * 1024 * 1024;

const parseDay = (value) => {
  const [year, month, day] = String(value || '').split('-').map(Number);
  return year && month && day ? new Date(year, month - 1, day) : null;
};

function OptionDetailInput({ label, value, onChange }) {
  return (
    <TextInput
      style={[styles.input, styles.indented]}
      placeholder={label || 'Please provide details...'}
      placeholderTextColor={adTokens.textMuted}
      value={value}
      onChangeText={onChange}
    />
  );
}

/** Extra info an option asks for (supportive data): text, or a date picked from a calendar. */
function SupportiveDataInput({ answer, value, onChange }) {
  const isDate = answer.supportiveDataType?.toUpperCase() === 'DATE';
  const [picking, setPicking] = useState(false);
  const day = isDate ? parseDay(value) : null;
  return (
    <View style={styles.supportive}>
      <Text style={styles.smallLabel}>
        {answer.supportiveDataTitle || 'Additional information'}
        {answer.supportiveDataMandatory ? <Text style={styles.required}> *</Text> : null}
      </Text>
      {isDate ? (
        <>
          <Pressable style={styles.dateField} onPress={() => setPicking(true)}>
            <MaterialCommunityIcons name="calendar-outline" size={18} color={adTokens.textMuted} />
            <Text style={[styles.dateText, !day && styles.placeholder]}>{day ? formatDateLabel(day) : 'Select date'}</Text>
          </Pressable>
          <DatePickerSheet
            visible={picking}
            title={answer.supportiveDataTitle || 'Select date'}
            value={day}
            onSelect={(date) => onChange(localDateOnlyToApiString(date))}
            onClear={() => onChange('')}
            onClose={() => setPicking(false)}
          />
        </>
      ) : (
        <TextInput
          style={styles.input}
          placeholder={answer.supportiveDataTitle || 'Additional information...'}
          placeholderTextColor={adTokens.textMuted}
          value={value}
          onChangeText={onChange}
        />
      )}
    </View>
  );
}

function Choice({ label, selected, multi, onPress }) {
  return (
    <Pressable style={[styles.choice, selected && styles.choiceSelected]} onPress={onPress}>
      <MaterialCommunityIcons
        name={multi ? (selected ? 'checkbox-marked' : 'checkbox-blank-outline') : selected ? 'radiobox-marked' : 'radiobox-blank'}
        size={22}
        color={selected ? adTokens.primary : adTokens.textMuted}
      />
      <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function SingleChoiceQuestion({ question, value, onChange, error }) {
  const select = (answer) =>
    onChange({
      answerId: answer.answerId,
      answerText: answer.answer,
      optionDetail: answer.hasTextInput ? value?.optionDetail || '' : '',
      supportiveData: answer.needSupportiveData ? value?.supportiveData || '' : '',
    });
  const selectedAnswer = question.answers?.find((item) => item.answerId === value?.answerId);

  return (
    <View style={styles.group}>
      {question.answers?.map((answer) => {
        const selected = value?.answerId === answer.answerId;
        return (
          <View key={answer.answerId}>
            <Choice label={answer.answer} selected={selected} onPress={() => select(answer)} />
            {selected && answer.hasTextInput ? (
              <OptionDetailInput
                label={answer.textInputLabel}
                value={value?.optionDetail || ''}
                onChange={(optionDetail) => onChange({ ...value, optionDetail, answerId: answer.answerId })}
              />
            ) : null}
          </View>
        );
      })}
      {selectedAnswer?.needSupportiveData ? (
        <SupportiveDataInput
          answer={selectedAnswer}
          value={value?.supportiveData || ''}
          onChange={(supportiveData) => onChange({ ...value, supportiveData, answerId: value?.answerId })}
        />
      ) : null}
      <ErrorText>{error}</ErrorText>
    </View>
  );
}

function MultipleChoiceQuestion({ question, value, onChange, error }) {
  const selectedIds = value?.answerIds || [];
  const toggle = (answer) => {
    const isSelected = selectedIds.includes(answer.answerId);
    const answerIds = isSelected ? selectedIds.filter((id) => id !== answer.answerId) : [...selectedIds, answer.answerId];
    const stillNeedsDetail = question.answers?.some((item) => answerIds.includes(item.answerId) && item.hasTextInput);
    onChange({
      ...value,
      answerIds,
      answerText: answerIds
        .map((id) => question.answers.find((item) => item.answerId === id)?.answer)
        .filter(Boolean)
        .join(', '),
      optionDetail: stillNeedsDetail ? value?.optionDetail || '' : '',
    });
  };
  const supportAnswer = question.answers?.find((item) => selectedIds.includes(item.answerId) && item.needSupportiveData);
  const showSharedDetail = getActiveTextInputOptions(question, value).length > 0;

  return (
    <View style={styles.group}>
      {question.answers?.map((answer) => {
        const selected = selectedIds.includes(answer.answerId);
        return (
          <View key={answer.answerId}>
            <Choice label={answer.answer} selected={selected} multi onPress={() => toggle(answer)} />
            {selected && answer.hasTextInput && showSharedDetail ? (
              <OptionDetailInput
                label={answer.textInputLabel}
                value={value?.optionDetail || ''}
                onChange={(optionDetail) => onChange({ ...value, optionDetail })}
              />
            ) : null}
          </View>
        );
      })}
      {supportAnswer ? (
        <SupportiveDataInput
          answer={supportAnswer}
          value={value?.supportiveData || ''}
          onChange={(supportiveData) => onChange({ ...value, supportiveData })}
        />
      ) : null}
      <ErrorText>{error}</ErrorText>
    </View>
  );
}

function DropdownQuestion({ question, value, onChange, error }) {
  const handleChange = (answerId) => {
    const selected = question.answers?.find((item) => item.answerId === answerId);
    if (!selected) {
      onChange({ answerId: null, answerText: '', supportiveData: '', optionDetail: '' });
      return;
    }
    onChange({
      answerId: selected.answerId,
      answerText: selected.answer,
      optionDetail: selected.hasTextInput ? value?.optionDetail || '' : '',
      supportiveData: selected.needSupportiveData ? value?.supportiveData || '' : '',
    });
  };
  const selectedAnswer = question.answers?.find((item) => item.answerId === value?.answerId);
  const textInputOption = getActiveTextInputOptions(question, value)[0];

  return (
    <View style={styles.group}>
      <IdpSelectField
        placeholder="Select"
        options={(question.answers || []).map((answer) => ({ value: answer.answerId, label: answer.answer }))}
        value={value?.answerId ?? null}
        onChange={handleChange}
        error={error}
      />
      {textInputOption ? (
        <OptionDetailInput
          label={textInputOption.textInputLabel}
          value={value?.optionDetail || ''}
          onChange={(optionDetail) => onChange({ ...value, optionDetail, answerId: value?.answerId })}
        />
      ) : null}
      {selectedAnswer?.needSupportiveData ? (
        <SupportiveDataInput
          answer={selectedAnswer}
          value={value?.supportiveData || ''}
          onChange={(supportiveData) => onChange({ ...value, supportiveData, answerId: value?.answerId })}
        />
      ) : null}
    </View>
  );
}

const DEFAULT_YES_NO = [
  { answerId: 'yes', answer: 'Yes', hasTextInput: false },
  { answerId: 'no', answer: 'No', hasTextInput: false },
];

function YesNoQuestion({ question, value, onChange, error }) {
  const options = question.answers?.length >= 2 ? question.answers : DEFAULT_YES_NO;
  const select = (answer) =>
    onChange({
      answerId: answer.answerId,
      answerText: answer.answer,
      optionDetail: answer.hasTextInput ? value?.optionDetail || '' : '',
    });

  return (
    <View style={styles.group}>
      {options.map((answer) => {
        const selected = value?.answerId === answer.answerId;
        return (
          <View key={answer.answerId}>
            <Choice label={answer.answer} selected={selected} onPress={() => select(answer)} />
            {selected && answer.hasTextInput ? (
              <OptionDetailInput
                label={answer.textInputLabel}
                value={value?.optionDetail || ''}
                onChange={(optionDetail) => onChange({ ...value, optionDetail, answerId: answer.answerId })}
              />
            ) : null}
          </View>
        );
      })}
      <ErrorText>{error}</ErrorText>
    </View>
  );
}

function CharacterCounter({ length, limit }) {
  return <Text style={[styles.counter, length >= limit && styles.counterLimit]}>{length}/{limit}</Text>;
}

function TextQuestion({ question, value, onChange, error, long }) {
  const limit = TEXT_CHAR_LIMITS[long ? QUESTION_TYPES.LONG_TEXT : QUESTION_TYPES.SHORT_TEXT];
  const text = value?.answerText || '';
  return (
    <View>
      <TextInput
        style={[styles.input, long && styles.textarea]}
        value={text}
        maxLength={limit}
        multiline={long}
        textAlignVertical={long ? 'top' : 'center'}
        placeholder="Type your answer..."
        placeholderTextColor={adTokens.textMuted}
        onChangeText={(answerText) => onChange({ answerId: null, answerText })}
      />
      <CharacterCounter length={text.length} limit={limit} />
      <ErrorText>{error}</ErrorText>
    </View>
  );
}

const displayUnit = (unit) => (unit && unit.toLowerCase() !== 'number' ? unit : null);

const numberRangeHint = (question) => {
  const { min, max } = question;
  const unit = displayUnit(question.unit);
  const suffix = unit ? ` ${unit}` : '';
  if (min != null && max != null) return `Please enter a value between ${min} and ${max}${suffix}.`;
  if (min != null) return `Please enter a value of at least ${min}${suffix}.`;
  if (max != null) return `Please enter a value up to ${max}${suffix}.`;
  if (unit) return `Enter the value in ${unit}.`;
  return null;
};

function NumberQuestion({ question, value, onChange, error }) {
  const unit = displayUnit(question.unit);
  const hint = numberRangeHint(question);
  return (
    <View style={styles.group}>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      <View style={styles.inlineRow}>
        <TextInput
          style={[styles.input, styles.flex1]}
          keyboardType="numeric"
          value={value?.answerText ?? ''}
          onChangeText={(answerText) => onChange({ answerId: null, answerText })}
        />
        {unit && question.min == null && question.max == null ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
      <ErrorText>{error}</ErrorText>
    </View>
  );
}

const CELSIUS_RANGE = { min: 30, max: 45 };
const FAHRENHEIT_RANGE = { min: 86, max: 113 };

/** Body temperature - a number with the unit the admin configured (degrees F assumed). */
function TemperatureQuestion({ question, value, onChange, error }) {
  const unit = question.unit || '°F';
  const isCelsius = unit.toLowerCase().includes('c');
  const fallback = isCelsius ? CELSIUS_RANGE : FAHRENHEIT_RANGE;
  const min = question.min ?? fallback.min;
  const max = question.max ?? fallback.max;
  return (
    <View style={styles.group}>
      <Text style={styles.hint}>
        Enter your measured body temperature in {unit} (between {min} and {max}).
      </Text>
      <View style={styles.inlineRow}>
        <TextInput
          style={[styles.input, styles.flex1]}
          keyboardType="decimal-pad"
          placeholder={isCelsius ? '37.0' : '98.6'}
          placeholderTextColor={adTokens.textMuted}
          value={value?.answerText ?? ''}
          onChangeText={(answerText) => onChange({ answerId: null, answerText })}
        />
        <Text style={styles.unit}>{unit}</Text>
      </View>
      <ErrorText>{error}</ErrorText>
    </View>
  );
}

/** A 1-10 style scale: one tappable chip per step (the web uses a slider). */
function ScaleQuestion({ question, value, onChange, error }) {
  const min = question.scaleMin != null ? question.scaleMin : 1;
  const max = question.scaleMax != null ? question.scaleMax : 10;
  const hasSelection = value?.answerText != null && String(value.answerText).trim() !== '';
  const selected = hasSelection ? Number(value.answerText) : null;
  const steps = [];
  for (let n = min; n <= max; n += 1) steps.push(n);

  return (
    <View style={styles.group}>
      <Text style={styles.scaleValue}>{hasSelection ? `${selected}/${max}` : `Select (${min}–${max})`}</Text>
      <View style={styles.scaleRow}>
        {steps.map((n) => (
          <Pressable
            key={n}
            style={[styles.scaleChip, selected === n && styles.scaleChipActive]}
            onPress={() => onChange({ answerId: null, answerText: String(n) })}
          >
            <Text style={[styles.scaleChipText, selected === n && styles.scaleChipTextActive]}>{n}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.scaleLabels}>
        <Text style={styles.hint}>{question.minLabel || min}</Text>
        <Text style={styles.hint}>{question.maxLabel || max}</Text>
      </View>
      <ErrorText>{error}</ErrorText>
    </View>
  );
}

/**
 * A normal date field - web renders `<input type="date">`, whose picker is the OS's own; the
 * closest native match on Android is the system date-picker dialog (`@react-native-community/
 * datetimepicker`), not the app's own calendar sheet. Tapping the field opens it directly.
 */
function DateQuestion({ question, value, onChange, error }) {
  const [showPicker, setShowPicker] = useState(false);
  const day = parseDay(value?.answerText);
  const { min, max } = getDateInputConstraints(question);

  const handleChange = (event, selectedDate) => {
    // Android closes the dialog itself after a pick or a cancel; iOS stays open (its picker is
    // inline) until the field is tapped again or away.
    if (Platform.OS === 'android') setShowPicker(false);
    if (event.type === 'dismissed' || !selectedDate) return;
    onChange({ answerId: null, answerText: localDateOnlyToApiString(selectedDate) });
  };

  return (
    <View style={styles.group}>
      <Pressable style={styles.dateField} onPress={() => setShowPicker(true)}>
        <MaterialCommunityIcons name="calendar-outline" size={18} color={adTokens.textMuted} />
        <Text style={[styles.dateText, !day && styles.placeholder]}>{day ? formatDateLabel(day) : 'Select date'}</Text>
      </Pressable>
      {showPicker ? (
        <DateTimePicker
          value={day || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          minimumDate={parseDay(min) || undefined}
          maximumDate={parseDay(max) || undefined}
          onChange={handleChange}
        />
      ) : null}
      <ErrorText>{error}</ErrorText>
    </View>
  );
}

/**
 * Photo or document upload. As on the web, the questionnaire submit is text-only, so only the file
 * NAME is recorded and the patient is told the provider will ask for the file during the
 * consultation - the app does not pretend to upload it.
 */
function FileUploadQuestion({ value, onChange, error }) {
  const [localError, setLocalError] = useState('');

  const accept = (name, size) => {
    if (size && size > MAX_FILE_BYTES) {
      setLocalError('That file is larger than 5 MB. Please choose a smaller one.');
      return;
    }
    setLocalError('');
    onChange({ answerId: null, answerText: name });
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'],
      copyToCacheDirectory: false,
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (asset) accept(asset.name, asset.size);
  };

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setLocalError('Allow photo access to choose a photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (asset) accept(asset.fileName || asset.uri.split('/').pop() || 'photo.jpg', asset.fileSize);
  };

  const chosen = value?.answerText;
  return (
    <View style={styles.group}>
      {chosen ? (
        <View style={styles.chosen}>
          <MaterialCommunityIcons name="file-outline" size={20} color={adTokens.primaryDark} />
          <Text style={styles.chosenName} numberOfLines={1}>
            {chosen}
          </Text>
          <Pressable
            onPress={() => {
              setLocalError('');
              onChange({ answerId: null, answerText: '' });
            }}
            hitSlop={8}
            accessibilityLabel="Remove file"
          >
            <MaterialCommunityIcons name="close" size={18} color={adTokens.textSecondary} />
          </Pressable>
        </View>
      ) : (
        <View style={styles.uploadRow}>
          <Pressable style={styles.uploadButton} onPress={pickPhoto}>
            <MaterialCommunityIcons name="image-outline" size={22} color={adTokens.primaryDark} />
            <Text style={styles.uploadText}>Choose a photo</Text>
          </Pressable>
          <Pressable style={styles.uploadButton} onPress={pickDocument}>
            <MaterialCommunityIcons name="file-upload-outline" size={22} color={adTokens.primaryDark} />
            <Text style={styles.uploadText}>Choose a file</Text>
          </Pressable>
        </View>
      )}
      <Text style={styles.hint}>PNG, JPG, WEBP or PDF, up to 5 MB. Your provider will ask for this file during the consultation.</Text>
      <ErrorText>{localError || error}</ErrorText>
    </View>
  );
}

const COMPONENTS = {
  [QUESTION_TYPES.SINGLE_CHOICE]: SingleChoiceQuestion,
  [QUESTION_TYPES.MULTIPLE_CHOICE]: MultipleChoiceQuestion,
  [QUESTION_TYPES.DROPDOWN]: DropdownQuestion,
  [QUESTION_TYPES.YES_NO]: YesNoQuestion,
  [QUESTION_TYPES.SHORT_TEXT]: (props) => <TextQuestion {...props} />,
  [QUESTION_TYPES.LONG_TEXT]: (props) => <TextQuestion {...props} long />,
  [QUESTION_TYPES.NUMBER]: NumberQuestion,
  [QUESTION_TYPES.SCALE]: ScaleQuestion,
  [QUESTION_TYPES.DATE]: DateQuestion,
  [QUESTION_TYPES.TEMPERATURE]: TemperatureQuestion,
  [QUESTION_TYPES.FILE_UPLOAD]: FileUploadQuestion,
};

/** Renders the right input for a question's type (unknown types fall back to short text). */
export default function QuestionRenderer({ question, value, onChange, error }) {
  const Component = COMPONENTS[question.questionType] || COMPONENTS[QUESTION_TYPES.SHORT_TEXT];
  return <Component question={question} value={value} onChange={onChange} error={error} />;
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  group: { gap: 8 },
  input: {
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: adTokens.border,
    backgroundColor: adTokens.gray50,
    fontSize: 14.5,
    color: adTokens.textPrimary,
  },
  textarea: { minHeight: 110 },
  indented: { marginTop: 6, marginLeft: 30 },
  hint: { fontSize: 12.5, color: adTokens.textSecondary, lineHeight: 17 },
  counter: { fontSize: 11.5, color: adTokens.textMuted, textAlign: 'right', marginTop: 4 },
  counterLimit: { color: adTokens.danger },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  unit: { fontSize: 14, fontWeight: '600', color: adTokens.textSecondary },
  required: { color: adTokens.danger },
  placeholder: { color: adTokens.textMuted },

  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: adTokens.border,
    backgroundColor: adTokens.white,
  },
  choiceSelected: { borderColor: adTokens.primary, backgroundColor: adTokens.primaryLight },
  choiceText: { flex: 1, fontSize: 14.5, color: adTokens.textPrimary },
  choiceTextSelected: { fontWeight: '700', color: adTokens.primaryDark },

  supportive: { gap: 6, marginTop: 4 },
  smallLabel: { fontSize: 12.5, fontWeight: '700', color: adTokens.textSecondary },

  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: adTokens.border,
    backgroundColor: adTokens.gray50,
  },
  dateText: { flex: 1, fontSize: 14.5, color: adTokens.textPrimary },

  scaleValue: { fontSize: 16, fontWeight: '800', color: adTokens.primaryDark, textAlign: 'center' },
  scaleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  scaleChip: {
    minWidth: 38,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: adTokens.border,
    backgroundColor: adTokens.white,
    alignItems: 'center',
  },
  scaleChipActive: { backgroundColor: adTokens.primary, borderColor: adTokens.primary },
  scaleChipText: { fontSize: 14, fontWeight: '700', color: adTokens.textSecondary },
  scaleChipTextActive: { color: adTokens.white },
  scaleLabels: { flexDirection: 'row', justifyContent: 'space-between' },

  uploadRow: { flexDirection: 'row', gap: 10 },
  uploadButton: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 18,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: adTokens.primary,
    backgroundColor: adTokens.primaryLight,
  },
  uploadText: { fontSize: 13, fontWeight: '700', color: adTokens.primaryDark },
  chosen: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, backgroundColor: adTokens.primaryLight },
  chosenName: { flex: 1, fontSize: 14, color: adTokens.textPrimary },
});
