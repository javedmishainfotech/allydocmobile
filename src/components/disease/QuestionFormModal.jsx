import React, { useEffect, useMemo, useState } from 'react';
import { Modal, View, Text, TextInput, Pressable, Switch, ScrollView, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { IdpSelectField } from '../identityProofing/IdpUi';
import { useBottomSafeSpacing } from '../../hooks/useBottomSafeSpacing';
import {
  QUESTION_TYPES,
  CONDITIONAL_OPERATORS,
  ACTION_TYPES,
  ACTIONS_NEEDING_MESSAGE,
  SEVERITIES,
  BOOKING_BEHAVIORS,
  DATE_RANGES,
  isOptionType,
  supportsOutcome,
  NUMERIC_TYPES,
  optionValueFor,
  createOption,
  createYesNoOptions,
} from '../../constants/assessmentConstants';
import { adTokens } from '../../theme/colors';

/** Port of AllyDocReactApp/src/components/Disease/QuestionModal.jsx - add/edit one assessment
 * question, as a full-screen modal with collapsible advanced sections (conditional logic, answer
 * actions, safety rule), matching web's field set and validation rules exactly. */
export default function QuestionFormModal({ visible, question, diseaseId, sections, otherQuestions, saving, onSave, onClose }) {
  const bottomSafe = useBottomSafeSpacing();
  const isEdit = Boolean(question?.id);

  const [type, setType] = useState('Single Choice');
  const [section, setSection] = useState('');
  const [text, setText] = useState('');
  const [helpText, setHelpText] = useState('');
  const [required, setRequired] = useState(true);
  const [options, setOptions] = useState([createOption(0), createOption(1)]);

  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [unit, setUnit] = useState('');
  const [decimalsAllowed, setDecimalsAllowed] = useState(false);

  const [scaleMin, setScaleMin] = useState('1');
  const [scaleMax, setScaleMax] = useState('10');
  const [minLabel, setMinLabel] = useState('');
  const [maxLabel, setMaxLabel] = useState('');

  const [dateRange, setDateRange] = useState('any');

  const [logicOn, setLogicOn] = useState(false);
  const [ruleSource, setRuleSource] = useState('');
  const [ruleOperator, setRuleOperator] = useState('equals');
  const [ruleValue, setRuleValue] = useState('');
  const [ruleId, setRuleId] = useState(null);

  const [actionsOn, setActionsOn] = useState(false);
  const [actionTrigger, setActionTrigger] = useState('');
  const [actionType, setActionType] = useState('continue');
  const [actionMessage, setActionMessage] = useState('');
  const [actionId, setActionId] = useState(null);

  const [safetyEnabled, setSafetyEnabled] = useState(false);
  const [severity, setSeverity] = useState('warning');
  const [safetyMessage, setSafetyMessage] = useState('');
  const [bookingBehavior, setBookingBehavior] = useState('continue');
  const [safetyTrigger, setSafetyTrigger] = useState('');
  const [preventConfirmed, setPreventConfirmed] = useState(false);

  const [expanded, setExpanded] = useState({ logic: false, actions: false, safety: false });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    const q = question;
    setType(q?.type || 'Single Choice');
    setSection(q?.section || '');
    setText(q?.text || '');
    setHelpText(q?.helpText || '');
    setRequired(q?.required ?? true);
    setOptions(
      q?.options?.length
        ? q.options.map((o) => ({
            answerId: o.answerId ?? null,
            text: o.text ?? '',
            value: o.value ?? '',
            hasTextInput: o.hasTextInput ?? false,
            textInputLabel: o.textInputLabel ?? '',
            outcome: o.outcome ?? 'continue',
            outcomeMessage: o.outcomeMessage ?? '',
          }))
        : q?.type === 'Yes / No'
        ? createYesNoOptions()
        : [createOption(0), createOption(1)],
    );
    setMin(q?.min != null ? String(q.min) : '');
    setMax(q?.max != null ? String(q.max) : '');
    setUnit(q?.unit ?? '');
    setDecimalsAllowed(q?.decimalsAllowed ?? false);
    setScaleMin(q?.scaleMin != null ? String(q.scaleMin) : '1');
    setScaleMax(q?.scaleMax != null ? String(q.scaleMax) : '10');
    setMinLabel(q?.minLabel ?? '');
    setMaxLabel(q?.maxLabel ?? '');
    setDateRange(q?.dateRange || 'any');

    const rule = q?.conditionalLogic?.[0];
    setLogicOn(Boolean(rule));
    setRuleId(rule?.id ?? null);
    setRuleSource(rule?.sourceQuestionId != null ? String(rule.sourceQuestionId) : '');
    setRuleOperator(rule?.operator || 'equals');
    setRuleValue(rule?.value ?? '');

    const action = q?.answerActions?.[0];
    setActionsOn(Boolean(action));
    setActionId(action?.id ?? null);
    setActionTrigger(action?.triggerValue ?? '');
    setActionType(action?.actionType || 'continue');
    setActionMessage(action?.message ?? '');

    const s = q?.safetyRule;
    setSafetyEnabled(s?.enabled ?? false);
    setSeverity(s?.severity || 'warning');
    setSafetyMessage(s?.message ?? '');
    setBookingBehavior(s?.bookingBehavior || 'continue');
    setSafetyTrigger(s?.triggerValue ?? '');
    setPreventConfirmed(s?.bookingBehavior === 'prevent');
    setExpanded({ logic: Boolean(rule), actions: Boolean(action), safety: s?.enabled ?? false });
    setError('');
  }, [visible, question]);

  const showOptions = isOptionType(type);
  const showOutcome = supportsOutcome(type);
  const showNumeric = NUMERIC_TYPES.includes(type);
  const showScale = type === 'Scale';
  const showDate = type === 'Date';

  const triggerChoices = useMemo(
    () =>
      options
        .map((o) => ({ value: optionValueFor(o), label: o.text || optionValueFor(o) }))
        .filter((o) => o.value),
    [options],
  );

  const handleTypeChange = (nextType) => {
    setType(nextType);
    if (nextType === 'Yes / No') {
      setOptions(createYesNoOptions());
    } else if (isOptionType(nextType) && options.length < 2) {
      setOptions([createOption(0), createOption(1)]);
    }
    if (nextType === 'Temperature' && !unit) setUnit('°F');
  };

  const setOption = (i, fields) => setOptions(options.map((o, x) => (x === i ? { ...o, ...fields } : o)));

  const validate = () => {
    if (!text.trim()) return 'Question text is required.';
    if (showOptions) {
      if (options.length < 2) return 'At least two answer options are required.';
      if (options.some((o) => !o.text.trim())) return 'Every option needs a label.';
      const values = options.map(optionValueFor);
      if (new Set(values).size !== values.length) return 'Answer options must have distinct values.';
    }
    if (min !== '' && max !== '' && Number(min) > Number(max)) {
      return 'Minimum value cannot be greater than maximum value.';
    }
    if (showScale && Number(scaleMin) >= Number(scaleMax)) {
      return 'Scale minimum must be lower than scale maximum.';
    }
    if (logicOn && !ruleSource) return 'Every conditional rule needs a source question.';
    if (actionsOn) {
      if (!actionTrigger) return 'Every answer action needs a triggering answer.';
      if (ACTIONS_NEEDING_MESSAGE.includes(actionType) && !actionMessage.trim()) {
        return 'A patient message is required for that action type.';
      }
    }
    if (safetyEnabled) {
      if (!safetyMessage.trim()) return 'A patient message is required for a safety rule.';
      if (bookingBehavior === 'prevent' && !preventConfirmed) {
        return 'Confirm that this answer will prevent the patient from booking.';
      }
    }
    return '';
  };

  const handleSave = () => {
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setError('');

    onSave({
      questionId: question?.id ?? null,
      diseaseId: Number(diseaseId),
      section: section || null,
      questionType: type,
      question: text.trim(),
      helpText: helpText.trim(),
      questionSequence: question?.order ?? 0,
      required,
      options: showOptions
        ? options.map((o) => ({
            answerId: o.answerId ?? null,
            text: o.text.trim(),
            value: optionValueFor(o),
            hasTextInput: o.hasTextInput,
            textInputLabel: o.hasTextInput ? o.textInputLabel?.trim() : null,
            outcome: showOutcome ? o.outcome : 'continue',
            outcomeMessage: o.outcome === 'block_booking' ? o.outcomeMessage?.trim() : null,
          }))
        : [],
      min: showNumeric && min !== '' ? Number(min) : null,
      max: showNumeric && max !== '' ? Number(max) : null,
      unit: showNumeric ? unit.trim() : null,
      decimalsAllowed: showNumeric ? decimalsAllowed : null,
      scaleMin: showScale ? Number(scaleMin) : null,
      scaleMax: showScale ? Number(scaleMax) : null,
      minLabel: showScale ? minLabel.trim() : null,
      maxLabel: showScale ? maxLabel.trim() : null,
      dateRange: showDate ? dateRange : null,
      minDate: null,
      maxDate: null,
      conditionalLogic: logicOn ? [{ id: ruleId, sourceQuestionId: Number(ruleSource), operator: ruleOperator, value: ruleValue }] : [],
      answerActions: actionsOn
        ? [{ id: actionId, triggerValue: actionTrigger, actionType: actionType || 'continue', message: actionMessage?.trim() ?? '' }]
        : [],
      safetyRule: {
        enabled: safetyEnabled,
        severity,
        message: safetyMessage.trim(),
        bookingBehavior,
        triggerValue: safetyEnabled ? safetyTrigger || triggerChoices[0]?.value || '' : safetyTrigger,
      },
    });
  };

  const toggleExpand = (key) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.title}>{isEdit ? 'Edit Question' : 'Add Question'}</Text>
          <Pressable style={styles.closeIcon} onPress={onClose} hitSlop={8}>
            <Feather name="x" size={22} color={adTokens.textPrimary} />
          </Pressable>
        </View>

        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          <Text style={styles.label}>
            Question type <Text style={styles.required}>*</Text>
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typesRow}>
            {QUESTION_TYPES.map((qt) => (
              <Pressable
                key={qt.key}
                style={[styles.typeChip, type === qt.key && styles.typeChipActive]}
                onPress={() => handleTypeChange(qt.key)}
              >
                <MaterialCommunityIcons
                  name={qt.icon}
                  size={18}
                  color={type === qt.key ? adTokens.white : adTokens.textSecondary}
                />
                <Text style={[styles.typeChipText, type === qt.key && styles.typeChipTextActive]}>{qt.label}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Field label="Question text" required>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="e.g. How long have you had a fever?"
              value={text}
              onChangeText={setText}
              multiline
              numberOfLines={3}
            />
          </Field>

          <Field label="Help text - optional">
            <TextInput
              style={styles.input}
              placeholder="Extra guidance shown under the question"
              value={helpText}
              onChangeText={setHelpText}
            />
          </Field>

          <Field label="Section - optional">
            <TextInput style={styles.input} placeholder="e.g. Current Symptoms" value={section} onChangeText={setSection} />
          </Field>

          <ToggleRow label="Required" value={required} onChange={setRequired} />

          {showOptions && (
            <View style={styles.block}>
              <Text style={styles.label}>Answer Options</Text>
              {options.map((opt, i) => {
                const locked = type === 'Yes / No';
                return (
                  <View key={i} style={styles.optionBlock}>
                    <View style={styles.optionRow}>
                      <Text style={styles.optionCap}>Option {i + 1}</Text>
                      <TextInput
                        style={[styles.input, styles.optionInput]}
                        placeholder={`Option ${i + 1}`}
                        value={opt.text}
                        editable={!locked}
                        onChangeText={(v) => setOption(i, { text: v })}
                      />
                      <Pressable
                        style={[styles.listChip, opt.hasTextInput && styles.listChipOn]}
                        onPress={() =>
                          setOption(i, { hasTextInput: !opt.hasTextInput, textInputLabel: opt.textInputLabel || 'Please specify...' })
                        }
                      >
                        <Text style={[styles.listChipText, opt.hasTextInput && styles.listChipTextOn]}>
                          {opt.hasTextInput ? 'List' : '+ List'}
                        </Text>
                      </Pressable>
                      {!locked && (
                        <Pressable
                          style={styles.removeBtn}
                          disabled={options.length <= 2}
                          onPress={() => setOptions(options.filter((_, x) => x !== i))}
                        >
                          <Feather name="x" size={16} color={options.length <= 2 ? adTokens.textMuted : adTokens.dangerDark} />
                        </Pressable>
                      )}
                    </View>
                    {opt.hasTextInput && (
                      <TextInput
                        style={[styles.input, styles.indented]}
                        placeholder="Please specify..."
                        value={opt.textInputLabel}
                        onChangeText={(v) => setOption(i, { textInputLabel: v })}
                      />
                    )}
                    {showOutcome && (
                      <View style={styles.indented}>
                        <IdpSelectField
                          label="Outcome"
                          placeholder="Continue"
                          options={[
                            { value: 'continue', label: 'Continue' },
                            { value: 'allow_booking', label: 'Allow Booking' },
                            { value: 'block_booking', label: 'Block Booking' },
                          ]}
                          value={opt.outcome}
                          onChange={(v) => setOption(i, { outcome: v })}
                        />
                        {opt.outcome === 'block_booking' && (
                          <TextInput
                            style={[styles.input, styles.textarea]}
                            placeholder="Message shown to patient..."
                            value={opt.outcomeMessage}
                            onChangeText={(v) => setOption(i, { outcomeMessage: v })}
                            multiline
                          />
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
              {type !== 'Yes / No' && (
                <Pressable style={styles.addOptionBtn} onPress={() => setOptions([...options, createOption(options.length)])}>
                  <Text style={styles.addOptionText}>+ Add Option</Text>
                </Pressable>
              )}
            </View>
          )}

          {showNumeric && (
            <View style={styles.block}>
              <Text style={styles.label}>Number Configuration</Text>
              <View style={styles.row}>
                <Field label="Minimum" style={styles.flex1}>
                  <TextInput style={styles.input} keyboardType="numeric" placeholder="0" value={min} onChangeText={setMin} />
                </Field>
                <Field label="Maximum" style={styles.flex1}>
                  <TextInput style={styles.input} keyboardType="numeric" placeholder="100" value={max} onChangeText={setMax} />
                </Field>
              </View>
              {type === 'Temperature' ? (
                <IdpSelectField
                  label="Unit"
                  options={[{ value: '°F', label: '°F' }, { value: '°C', label: '°C' }]}
                  value={unit}
                  onChange={setUnit}
                />
              ) : (
                <Field label="Unit">
                  <TextInput style={styles.input} placeholder="e.g. years" value={unit} onChangeText={setUnit} />
                </Field>
              )}
              <ToggleRow label="Allow decimals" value={decimalsAllowed} onChange={setDecimalsAllowed} />
            </View>
          )}

          {showScale && (
            <View style={styles.block}>
              <Text style={styles.label}>Scale Settings</Text>
              <View style={styles.row}>
                <Field label="From" style={styles.flex1}>
                  <TextInput style={styles.input} keyboardType="numeric" value={scaleMin} onChangeText={setScaleMin} />
                </Field>
                <Field label="To" style={styles.flex1}>
                  <TextInput style={styles.input} keyboardType="numeric" value={scaleMax} onChangeText={setScaleMax} />
                </Field>
              </View>
              <View style={styles.row}>
                <Field label="Low label" style={styles.flex1}>
                  <TextInput style={styles.input} placeholder="Mild" value={minLabel} onChangeText={setMinLabel} />
                </Field>
                <Field label="High label" style={styles.flex1}>
                  <TextInput style={styles.input} placeholder="Severe" value={maxLabel} onChangeText={setMaxLabel} />
                </Field>
              </View>
            </View>
          )}

          {showDate && (
            <View style={styles.block}>
              <Text style={styles.label}>Date Range</Text>
              {DATE_RANGES.map((r) => (
                <Pressable key={r.value} style={styles.radioRow} onPress={() => setDateRange(r.value)}>
                  <MaterialCommunityIcons
                    name={dateRange === r.value ? 'radiobox-marked' : 'radiobox-blank'}
                    size={18}
                    color={dateRange === r.value ? adTokens.primary : adTokens.textMuted}
                  />
                  <Text style={styles.radioLabel}>{r.label}</Text>
                </Pressable>
              ))}
            </View>
          )}

          <Collapsible
            title="Conditional Logic"
            badge={logicOn ? '1 rule' : null}
            open={expanded.logic}
            onToggle={() => toggleExpand('logic')}
          >
            <ToggleRow
              label="Enable Conditional Logic"
              value={logicOn}
              onChange={(on) => {
                setLogicOn(on);
                if (!on) {
                  setRuleSource('');
                  setRuleValue('');
                }
              }}
            />
            {logicOn && (
              <View style={styles.advBlock}>
                {(otherQuestions ?? []).length === 0 ? (
                  <Text style={styles.hint}>Add another question first - a rule has to point at an earlier question.</Text>
                ) : (
                  <>
                    <Text style={styles.hint}>Show this question when:</Text>
                    <IdpSelectField
                      placeholder="Select a question..."
                      options={(otherQuestions ?? []).map((q) => ({ value: String(q.id), label: q.text }))}
                      value={ruleSource}
                      onChange={setRuleSource}
                    />
                    <View style={styles.row}>
                      <IdpSelectField
                        containerStyle={styles.flex1}
                        options={CONDITIONAL_OPERATORS}
                        value={ruleOperator}
                        onChange={setRuleOperator}
                      />
                      <TextInput
                        style={[styles.input, styles.flex1]}
                        placeholder="Answer value..."
                        value={ruleValue}
                        onChangeText={setRuleValue}
                      />
                    </View>
                  </>
                )}
              </View>
            )}
          </Collapsible>

          <Collapsible
            title="Answer Actions"
            badge={actionsOn ? '1 action' : null}
            open={expanded.actions}
            onToggle={() => toggleExpand('actions')}
          >
            <ToggleRow
              label="Enable Answer Actions"
              value={actionsOn}
              onChange={(on) => {
                setActionsOn(on);
                if (!on) {
                  setActionTrigger('');
                  setActionMessage('');
                  setActionType('continue');
                }
              }}
            />
            {actionsOn && (
              <View style={styles.advBlock}>
                {triggerChoices.length === 0 ? (
                  <Text style={styles.hint}>Answer actions need answer options on this question.</Text>
                ) : (
                  <>
                    <Text style={styles.hint}>When the answer is:</Text>
                    <IdpSelectField placeholder="Select an answer..." options={triggerChoices} value={actionTrigger} onChange={setActionTrigger} />
                    <Text style={styles.hint}>Then:</Text>
                    <IdpSelectField options={ACTION_TYPES} value={actionType} onChange={setActionType} />
                    {ACTIONS_NEEDING_MESSAGE.includes(actionType) && (
                      <TextInput
                        style={[styles.input, styles.textarea]}
                        placeholder="Patient message..."
                        value={actionMessage}
                        onChangeText={setActionMessage}
                        multiline
                      />
                    )}
                  </>
                )}
              </View>
            )}
          </Collapsible>

          <Collapsible
            title="Safety / Red-Flag Rule"
            badge={safetyEnabled ? severity : null}
            open={expanded.safety}
            onToggle={() => toggleExpand('safety')}
          >
            <ToggleRow label="Mark as Safety / Red-Flag Rule" value={safetyEnabled} onChange={setSafetyEnabled} />
            {safetyEnabled && (
              <View style={styles.advBlock}>
                {triggerChoices.length === 0 ? (
                  <Text style={styles.hintDanger}>A safety rule needs answer options to trigger on. Choose an option-based question type.</Text>
                ) : (
                  <>
                    <Text style={styles.hint}>Severity</Text>
                    <IdpSelectField options={SEVERITIES} value={severity} onChange={setSeverity} />
                    <Text style={styles.hint}>Patient Message</Text>
                    <TextInput
                      style={[styles.input, styles.textarea]}
                      placeholder="Message shown to patient..."
                      value={safetyMessage}
                      onChangeText={setSafetyMessage}
                      multiline
                    />
                    <Text style={styles.hint}>Booking Behavior</Text>
                    <IdpSelectField
                      options={BOOKING_BEHAVIORS}
                      value={bookingBehavior}
                      onChange={(v) => {
                        setBookingBehavior(v);
                        if (v === 'prevent') setPreventConfirmed(false);
                      }}
                    />
                    {bookingBehavior === 'prevent' && !preventConfirmed && (
                      <View style={styles.confirmBox}>
                        <Text style={styles.confirmText}>
                          This answer will prevent the patient from continuing normal appointment booking.
                        </Text>
                        <Pressable onPress={() => setPreventConfirmed(true)}>
                          <Text style={styles.confirmLink}>I understand - confirm</Text>
                        </Pressable>
                      </View>
                    )}
                  </>
                )}
              </View>
            )}
          </Collapsible>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: 14 + bottomSafe }]}>
          <Pressable style={styles.cancelBtn} onPress={onClose} disabled={saving}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
          <Pressable style={[styles.saveBtn, (saving || !text.trim()) && styles.disabled]} onPress={handleSave} disabled={saving || !text.trim()}>
            {saving ? <ActivityIndicator size={14} color={adTokens.white} /> : <Text style={styles.saveBtnText}>{isEdit ? 'Save Changes' : 'Save Question'}</Text>}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Field({ label, required, children, style }) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>
        {label} {required ? <Text style={styles.required}>*</Text> : null}
      </Text>
      {children}
    </View>
  );
}

function ToggleRow({ label, value, onChange }) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

function Collapsible({ title, badge, open, onToggle, children }) {
  return (
    <View style={styles.collapse}>
      <Pressable style={styles.collapseHead} onPress={onToggle}>
        <View style={styles.collapseTitleRow}>
          <Text style={styles.collapseTitle}>{title}</Text>
          {badge ? (
            <View style={styles.collapseBadge}>
              <Text style={styles.collapseBadgeText}>{badge}</Text>
            </View>
          ) : null}
        </View>
        <Feather name={open ? 'chevron-up' : 'chevron-down'} size={18} color={adTokens.textSecondary} />
      </Pressable>
      {open && <View style={styles.collapseBody}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: adTokens.bgBody },
  flex1: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: adTokens.white,
    borderBottomWidth: 1,
    borderBottomColor: adTokens.border,
  },
  title: { fontSize: 16, fontWeight: '700', color: adTokens.textPrimary },
  closeIcon: { padding: 4 },
  body: { flex: 1 },
  bodyContent: { padding: 16, gap: 16, paddingBottom: 32 },
  label: { fontSize: 12.5, fontWeight: '700', color: adTokens.textPrimary, marginBottom: 6 },
  required: { color: adTokens.dangerDark },
  typesRow: { marginBottom: 4 },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: adTokens.border,
    backgroundColor: adTokens.white,
    marginRight: 8,
  },
  typeChipActive: { backgroundColor: adTokens.primary, borderColor: adTokens.primary },
  typeChipText: { fontSize: 12, fontWeight: '600', color: adTokens.textSecondary },
  typeChipTextActive: { color: adTokens.white },
  field: { gap: 0 },
  input: {
    borderWidth: 1,
    borderColor: adTokens.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13.5,
    color: adTokens.textPrimary,
    backgroundColor: adTokens.gray50,
  },
  textarea: { minHeight: 70, textAlignVertical: 'top' },
  block: { gap: 10 },
  row: { flexDirection: 'row', gap: 10 },
  optionBlock: { gap: 8, marginBottom: 6 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  optionCap: { fontSize: 11, color: adTokens.textMuted, width: 56 },
  optionInput: { flex: 1 },
  listChip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: adTokens.border },
  listChipOn: { backgroundColor: adTokens.primaryTint, borderColor: adTokens.primary },
  listChipText: { fontSize: 11, fontWeight: '600', color: adTokens.textSecondary },
  listChipTextOn: { color: adTokens.primaryDark },
  removeBtn: { padding: 4 },
  indented: { marginLeft: 56 },
  addOptionBtn: { alignSelf: 'flex-start', paddingVertical: 6 },
  addOptionText: { fontSize: 13, fontWeight: '700', color: adTokens.primaryDark },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  toggleLabel: { fontSize: 13, fontWeight: '600', color: adTokens.textPrimary, flex: 1, marginRight: 10 },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  radioLabel: { fontSize: 13, color: adTokens.textPrimary },
  collapse: { borderWidth: 1, borderColor: adTokens.border, borderRadius: 12, overflow: 'hidden' },
  collapseHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: adTokens.gray50 },
  collapseTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  collapseTitle: { fontSize: 13, fontWeight: '700', color: adTokens.textPrimary },
  collapseBadge: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 999, backgroundColor: adTokens.primaryTint },
  collapseBadgeText: { fontSize: 10.5, fontWeight: '700', color: adTokens.primaryDark },
  collapseBody: { padding: 12, gap: 10 },
  advBlock: { gap: 10 },
  hint: { fontSize: 12, color: adTokens.textSecondary },
  hintDanger: { fontSize: 12, color: adTokens.dangerDark },
  confirmBox: { backgroundColor: adTokens.dangerTint, borderRadius: 10, padding: 12, gap: 8 },
  confirmText: { fontSize: 12.5, color: adTokens.dangerDark },
  confirmLink: { fontSize: 12.5, fontWeight: '700', color: adTokens.dangerDark, textDecorationLine: 'underline' },
  errorText: { fontSize: 12.5, color: adTokens.dangerDark, fontWeight: '600' },
  footer: { flexDirection: 'row', gap: 10, padding: 14, borderTopWidth: 1, borderTopColor: adTokens.border, backgroundColor: adTokens.white },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: adTokens.border, alignItems: 'center' },
  cancelBtnText: { fontSize: 13.5, fontWeight: '600', color: adTokens.textSecondary },
  saveBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: adTokens.primary, alignItems: 'center' },
  saveBtnText: { fontSize: 13.5, fontWeight: '700', color: adTokens.white },
  disabled: { opacity: 0.6 },
});
